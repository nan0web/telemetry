#!/usr/bin/env node

import process from 'node:process'
import DBFS from '@nan0web/db-fs'
import Logger from '@nan0web/log'
import { select, table, spinner, progress } from '@nan0web/ui-cli'
import DB from '@nan0web/db'
import { Telemetry, bench } from '../src/index.js'

// ─── i18n via DBFS.fetch() ──────────────────────────────────

const dataFs = new DBFS({ root: 'play/data', cwd: import.meta.dirname + '/..' })

/** @type {Record<string, string>} */
let translations = {}

/**
 * Loads translations for a locale via DBFS.fetch().
 * DBFS resolves $ref links automatically:
 *   - 'index' → EN defaults with t from _/t.yaml
 *   - 'uk/index' → inherits /index + overrides + uk/_/t.yaml
 * @param {string} locale
 */
async function loadLocale(locale) {
	const uri = locale === 'en' ? 'index' : `${locale}/index`
	const doc = await dataFs.fetch(uri)
	translations = doc?.t ?? {}
}

/**
 * Translate a key.
 * @param {string} key
 * @returns {string}
 */
function t(key) {
	return translations[key] || key
}

// ─── Shared State ───────────────────────────────────────────

const console = new Logger({ level: 'info', icons: true, chromo: true })
const db = new DB()
const cacheDb = new DB()
const telemetry = new Telemetry()

/**
 * @param {number} n
 * @param {number} [decimals]
 * @returns {string}
 */
function fmt(n, decimals = 1) {
	return n.toFixed(decimals)
}

/**
 * @param {number} ratio
 * @param {number} [width]
 * @returns {string}
 */
function bar(ratio, width = 20) {
	const filled = Math.round(ratio * width)
	const empty = width - filled
	const green = Logger.style('\u2588'.repeat(filled), { color: Logger.GREEN })
	const dim = Logger.style('\u2591'.repeat(empty), { color: Logger.DIM })
	return green + dim
}

// ─── Demo Scenarios ─────────────────────────────────────────

async function demoConnect() {
	console.clear()
	console.info(
		Logger.style(` ${t('1. Connect and Observe')} `, { bg: Logger.BG_CYAN, color: Logger.BLACK }),
	)
	console.info('')

	telemetry.connect(db)
	console.success(t('Telemetry connected to main DB'))

	telemetry.connect(cacheDb)
	console.success(t('Telemetry connected to cache DB'))

	console.info('')
	console.info(t('Both DB instances are now being observed.'))
	console.info(t('events.aggregated'))
	console.info('')
}

async function demoWriteData() {
	console.clear()
	console.info(
		Logger.style(` ${t('2. Write Data')} `, { bg: Logger.BG_GREEN, color: Logger.BLACK }),
	)
	console.info('')

	const sp = spinner(t('Writing documents...'))

	for (let i = 0; i < 50; i++) {
		await db.set(`users/user-${i}.json`, {
			id: i,
			name: `User ${i}`,
			role: i < 5 ? 'admin' : 'member',
		})
	}
	for (let i = 0; i < 20; i++) {
		await db.set(`posts/post-${i}.json`, { id: i, title: `Post ${i}`, author: `User ${i % 50}` })
	}
	for (let i = 0; i < 30; i++) {
		await cacheDb.set(`cache/item-${i}.json`, { key: `item-${i}`, ttl: 3600 })
	}

	sp.success(t('100 documents written across 2 DBs'))
	console.info('')
}

async function demoReadData() {
	console.clear()
	console.info(
		Logger.style(` ${t('3. Read Data (cache hits and misses)')} `, {
			bg: Logger.BG_YELLOW,
			color: Logger.BLACK,
		}),
	)
	console.info('')

	const pb = progress({ title: t('Reading documents...'), total: 100 })

	for (let i = 0; i < 50; i++) {
		await db.get(`users/user-${i}.json`)
		pb.update(i)
	}
	for (let i = 0; i < 10; i++) {
		await db.get(`missing/doc-${i}.json`)
		pb.update(50 + i)
	}
	for (let i = 0; i < 30; i++) {
		await cacheDb.get(`cache/item-${i}.json`)
		pb.update(60 + i)
	}
	for (let i = 0; i < 10; i++) {
		await db.get(`users/user-${i}.json`)
		pb.update(90 + i)
	}

	pb.update(100)
	console.info('')
	console.success(t('100 read operations completed'))
	console.info('')
}

async function demoLiveReport() {
	console.clear()
	console.info(
		Logger.style(` ${t('4. Live Telemetry Report')} `, {
			bg: Logger.BG_MAGENTA,
			color: Logger.BLACK,
		}),
	)
	console.info('')

	const report = telemetry.report()

	const cacheRate = report.cache.hitRate
	console.info(Logger.style(`  ${t('CACHE METRICS')}`, { color: Logger.CYAN }))
	console.info(`  ${bar(cacheRate)} ${fmt(cacheRate * 100)}% ${t('hit rate')}`)
	console.info(
		`  ${t('Hits')}: ${Logger.style(String(report.cache.hits), { color: Logger.GREEN })}  ${t('Misses')}: ${Logger.style(String(report.cache.misses), { color: Logger.RED })}`,
	)
	console.info('')

	console.info(Logger.style(`  ${t('CHANGE METRICS')}`, { color: Logger.CYAN }))
	console.info(
		`  ${t('Total')}: ${Logger.style(String(report.changes.total), { color: Logger.YELLOW })}`,
	)
	const types = Object.entries(report.changes.byType)
	for (const [type, count] of types) {
		const ratio = count / report.changes.total
		console.info(`    ${type.padEnd(6)} ${bar(ratio, 15)} ${count}`)
	}
	console.info('')

	console.info(Logger.style(`  ${t('FALLBACK METRICS')}`, { color: Logger.CYAN }))
	console.info(`  ${t('Total')}: ${report.fallbacks.total}`)
	console.info('')

	console.info(
		Logger.style(`  ${t('Uptime')}: ${fmt(report.uptime / 1000)}s`, { color: Logger.DIM }),
	)
	console.info('')
}

async function demoFilteredReport() {
	console.clear()
	console.info(
		Logger.style(` ${t('demo.5.title')} `, {
			bg: Logger.BG_BLUE,
			color: Logger.WHITE,
		}),
	)
	console.info('')

	const prefixes = ['users/', 'posts/', 'cache/', 'missing/']

	const rows = prefixes.map((prefix) => {
		const r = telemetry.report(prefix)
		return {
			[t('prefix')]: prefix,
			[t('cache hits')]: r.cache.hits,
			[t('cache misses')]: r.cache.misses,
			[t('hit rate')]: `${fmt(r.cache.hitRate * 100)}%`,
			[t('changes')]: r.changes.total,
			[t('fallbacks')]: r.fallbacks.total,
		}
	})

	await table({
		data: rows,
		title: t('Telemetry by URI Prefix'),
		logger: console,
		interactive: false,
	})
	console.info('')
}

async function demoBenchmark() {
	console.clear()
	console.info(
		Logger.style(` ${t('demo.6.title')} `, {
			bg: Logger.BG_RED,
			color: Logger.WHITE,
		}),
	)
	console.info('')

	const benchDb = new DB()

	const sp1 = spinner(t('Running SET benchmark (1000 samples)...'))
	const setResult = await bench(benchDb, 'set', { samples: 1000 })
	sp1.success(t('SET benchmark complete'))

	const sp2 = spinner(t('Running GET benchmark (1000 samples)...'))
	const getResult = await bench(benchDb, 'get', { samples: 1000 })
	sp2.success(t('GET benchmark complete'))

	console.info('')

	const benchRows = [
		{
			[t('operation')]: 'SET',
			[t('samples')]: setResult.samples,
			'p50 (ms)': fmt(setResult.p50, 3),
			'p95 (ms)': fmt(setResult.p95, 3),
			'p99 (ms)': fmt(setResult.p99, 3),
			'mean (ms)': fmt(setResult.mean, 3),
		},
		{
			[t('operation')]: 'GET',
			[t('samples')]: getResult.samples,
			'p50 (ms)': fmt(getResult.p50, 3),
			'p95 (ms)': fmt(getResult.p95, 3),
			'p99 (ms)': fmt(getResult.p99, 3),
			'mean (ms)': fmt(getResult.mean, 3),
		},
	]

	await table({
		data: benchRows,
		title: t('DB Performance Benchmarks'),
		logger: console,
		interactive: false,
	})
	console.info('')
}

async function demoDisconnect() {
	console.clear()
	console.info(
		Logger.style(` ${t('7. Disconnect and Verify')} `, {
			bg: Logger.BG_YELLOW,
			color: Logger.BLACK,
		}),
	)
	console.info('')

	const beforeChanges = telemetry.report().changes.total
	console.info(
		`${t('Changes before disconnect')}: ${Logger.style(String(beforeChanges), { color: Logger.CYAN })}`,
	)

	telemetry.disconnect(cacheDb)
	console.warn(t('Disconnected cacheDb'))

	await cacheDb.set('cache/phantom.json', { ghost: true })
	const afterCache = telemetry.report().changes.total
	console.info(
		`${t('After cacheDb write')}: ${Logger.style(String(afterCache), { color: Logger.CYAN })} (${t('unchanged = correct')})`,
	)

	await db.set('data/proof.json', { tracked: true })
	const afterMain = telemetry.report().changes.total
	console.success(
		`${t('After mainDb write')}: ${Logger.style(String(afterMain), { color: Logger.GREEN })} (${t('+1 = correct')})`,
	)

	console.info('')
}

async function demoReset() {
	console.clear()
	console.info(
		Logger.style(` ${t('8. Reset Counters')} `, { bg: Logger.BG_WHITE, color: Logger.BLACK }),
	)
	console.info('')

	console.info(t('Before reset:'))
	console.info(telemetry.toString())
	console.info('')

	telemetry.reset()
	console.warn(t('Counters reset!'))
	console.info('')

	console.info(t('After reset:'))
	console.info(telemetry.toString())
	console.info('')

	await db.set('data/after-reset.json', { fresh: true })
	await db.get('data/after-reset.json')

	console.info('')
	console.info(t('After 1 write + 1 read:'))
	console.info(telemetry.toString())
	console.info('')
}

// ─── Main Menu ──────────────────────────────────────────────

function buildDemos() {
	return [
		{ name: t('1. Connect and Observe'), fn: demoConnect },
		{ name: t('2. Write Data'), fn: demoWriteData },
		{ name: t('3. Read Data (cache hits and misses)'), fn: demoReadData },
		{ name: t('4. Live Telemetry Report'), fn: demoLiveReport },
		{ name: t('demo.5.title'), fn: demoFilteredReport },
		{ name: t('demo.6.title'), fn: demoBenchmark },
		{ name: t('7. Disconnect and Verify'), fn: demoDisconnect },
		{ name: t('8. Reset Counters'), fn: demoReset },
		{ name: `-- ${t('Run All Demos')} --`, fn: null },
	]
}

async function runAll() {
	const demos = buildDemos()
	for (const demo of demos) {
		if (demo.fn) {
			await demo.fn()
			await new Promise((r) => setTimeout(r, 800))
		}
	}
}

async function chooseLang() {
	const choice = await select({
		title: t('Choose language:'),
		prompt: Logger.style('[lang]: ', { color: Logger.CYAN }),
		invalidPrompt: Logger.style('[lang]', { color: Logger.RED }) + ': ',
		options: ['Ukrainska / UK', 'English / EN'],
		console,
	})
	const locale = choice.index === 0 ? 'uk' : 'en'
	await loadLocale(locale)
}

// ─── CLI args for snapshot testing ──────────────────────────

/**
 * @param {string} flag
 * @returns {string|undefined}
 */
function getArg(flag) {
	const prefix = `--${flag}=`
	const arg = process.argv.find((a) => a.startsWith(prefix))
	return arg ? arg.slice(prefix.length) : undefined
}

/** @type {Record<string, () => Promise<void>>} */
const DEMO_MAP = {
	connect: demoConnect,
	write: demoWriteData,
	read: demoReadData,
	report: demoLiveReport,
	filter: demoFilteredReport,
	bench: demoBenchmark,
	disconnect: demoDisconnect,
	reset: demoReset,
	all: runAll,
}

async function main() {
	const argLang = getArg('lang')
	const argDemo = getArg('demo')

	// Load locale
	await loadLocale(argLang || 'en')

	// Direct demo execution (for snapshot tests)
	if (argDemo) {
		const fn = DEMO_MAP[argDemo]
		if (!fn) {
			console.error(`Unknown demo: ${argDemo}. Available: ${Object.keys(DEMO_MAP).join(', ')}`)
			process.exit(1)
		}
		// Auto-connect for isolated demo runs (skip for 'connect' demo itself)
		if (argDemo !== 'connect') {
			telemetry.connect(db)
			telemetry.connect(cacheDb)
		}
		await fn()
		return
	}

	// Interactive mode
	console.clear()
	console.info(Logger.style(Logger.LOGO, { color: Logger.MAGENTA }))

	await chooseLang()

	console.clear()
	console.info(Logger.style(Logger.LOGO, { color: Logger.MAGENTA }))
	console.info(
		Logger.style(` ${t('sandbox.title')} `, {
			bg: Logger.BG_MAGENTA,
			color: Logger.BLACK,
		}),
	)
	console.info(
		Logger.style(` ${t('Observability layer for nan0web ecosystem')} `, { color: Logger.DIM }),
	)
	console.info('')

	const runAllLabel = `-- ${t('Run All Demos')} --`
	const exitLabel = `<- ${t('Exit')}`

	while (true) {
		const demos = buildDemos()
		const options = [...demos.map((d) => d.name), exitLabel]

		const choice = await select({
			title: t('Select demo:'),
			prompt: Logger.style('[telemetry]: ', { color: Logger.MAGENTA }),
			invalidPrompt: Logger.style('[telemetry]', { color: Logger.RED }) + ': ',
			options,
			console,
		})

		const selected = options[choice.index]

		if (selected === exitLabel) {
			console.success(`\n${t('Exiting Telemetry Sandbox.')} \n`)
			break
		}

		if (selected === runAllLabel) {
			await runAll()
			console.info('\n' + '='.repeat(50))
			console.success(t('All demos completed!'))
			console.info('='.repeat(50) + '\n')
			continue
		}

		const demo = demos.find((d) => d.name === selected)
		if (demo && demo.fn) {
			await demo.fn()
			console.info('\n' + '='.repeat(50))
			console.info(t('Demo completed. Returning to menu...'))
			console.info('='.repeat(50) + '\n')
		}
	}
}

process.on('SIGINT', () => {
	console.info('\n' + Logger.style(t('Interrupted!'), { color: Logger.YELLOW }))
	process.exit(0)
})

main().catch((err) => {
	if (err && err.message && err.message.toLowerCase().includes('cancel')) {
		console.info('\nExiting Sandbox.\n')
		process.exit(0)
	}
	console.error(err)
	process.exit(1)
})
