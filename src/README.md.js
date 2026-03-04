import { describe, it, before, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import fsNode from 'node:fs'
import { fileURLToPath } from 'node:url'
import FS from '@nan0web/db-fs'
import { NoConsole } from '@nan0web/log'
import { DatasetParser, DocsParser } from '@nan0web/test'
import { Telemetry } from './Telemetry.js'
import { bench } from './bench.js'

const fs = new FS()
let pkg = {}

// Load package.json once before tests
before(async () => {
	const doc = await fs.loadDocument('package.json', {})
	pkg = doc || {}
})

let console = new NoConsole()

beforeEach(() => {
	console = new NoConsole()
})

// Core test suite that also serves as the source for README generation.
function testRender() {
	/**
	 * @docs
	 * # @nan0web/telemetry
	 *
	 * > Observability layer for nan0web ecosystem. Collects, aggregates, and reports metrics from any `@nan0web/db` instance.
	 *
	 * <!-- %PACKAGE_STATUS% -->
	 *
	 * ## Features
	 *
	 * - **Zero Runtime Dependencies**: Uses DB's existing `on()`/`emit()` contract.
	 * - **O(1) Collectors**: Counter-based metrics with zero unbounded array growth.
	 * - **Multi-DB Support**: Aggregate metrics from multiple databases into a single report.
	 * - **URI Filtering**: Drill down into metrics by URI prefix (e.g., `users/`).
	 * - **Performance Benchmarks**: Built-in SET/GET benchmark runner with p50/p95/p99.
	 * - **i18n CLI Sandbox**: Interactive playground for exploring metrics.
	 *
	 * ## Installation
	 */
	it('How to install with npm?', () => {
		/**
		 * ```bash
		 * npm install @nan0web/telemetry
		 * ```
		 */
		assert.equal(pkg.name, '@nan0web/telemetry')
	})
	/**
	 * @docs
	 */
	it('How to install with pnpm?', () => {
		/**
		 * ```bash
		 * pnpm add @nan0web/telemetry
		 * ```
		 */
		assert.equal(pkg.name, '@nan0web/telemetry')
	})
	/**
	 * @docs
	 */
	it('How to install with yarn?', () => {
		/**
		 * ```bash
		 * yarn add @nan0web/telemetry
		 * ```
		 */
		assert.equal(pkg.name, '@nan0web/telemetry')
	})

	/**
	 * @docs
	 * ## Quick Start
	 *
	 * Telemetry connects to any `@nan0web/db` instance and starts collecting metrics automatically.
	 *
	 */
	it('How to connect to a database?', async () => {
		//import { Telemetry } from '@nan0web/telemetry'
		const t = new Telemetry()
		const db = { on: () => {} }

		t.connect(db)
		console.info(String(t)) // -> [telemetry] uptime: 0s cache: 0 hits...

		assert.ok(console.output()[0][1].includes('[telemetry]'))
	})

	/**
	 * @docs
	 * ## Reading Metrics
	 *
	 * Call `report()` to get a snapshot of all collected metrics.
	 * Optionally pass a URI prefix to filter.
	 *
	 */
	it('How to read metrics?', async () => {
		//import { Telemetry } from '@nan0web/telemetry'
		const t = new Telemetry()
		const listeners = new Map()
		const db = {
			on(event, fn) {
				listeners.set(event, fn)
			},
			emit(event, data) {
				if (listeners.has(event)) listeners.get(event)(data)
			},
		}

		t.connect(db)
		db.emit('cache', { hit: true, uri: 'users/1.json' })

		const report = t.report()
		console.info(report.cache.hits) // -> 1
		assert.deepStrictEqual(console.output(), [['info', 1]])
	})

	/**
	 * @docs
	 * ## Reset
	 *
	 * Reset all counters without disconnecting.
	 *
	 */
	it('How to reset counters?', async () => {
		//import { Telemetry } from '@nan0web/telemetry'
		const t = new Telemetry()
		t.reset()

		console.info('Reset successful')
		assert.ok(console.output().length > 0)
	})

	/**
	 * @docs
	 * ## Streams
	 *
	 * Use `toStream()` to get a `ReadableStream` that periodically emits reports.
	 */
	it('How to stream metrics periodically?', async () => {
		//import { Telemetry } from '@nan0web/telemetry'
		const t = new Telemetry()
		const stream = t.toStream({ interval: 10 })
		const reader = stream.getReader()

		const { value: report } = await reader.read()
		console.info(typeof report) // -> object

		await reader.cancel()
		assert.strictEqual(console.output()[0][1], 'object')
	})

	/**
	 * @docs
	 * ## Benchmarks
	 *
	 * Run performance benchmarks on any database.
	 *
	 */
	it('How to run performance benchmarks?', async () => {
		//import { bench } from '@nan0web/telemetry'
		const db = { on: () => {}, saveDocument: async () => {} }
		const stats = await bench(db, 'saveDocument', { samples: 10, data: { status: 'ok' } })

		console.info(stats.mean > 0) // -> true
		assert.ok(stats.p50 >= 0)
	})

	/**
	 * @docs
	 * ## Human-Readable Output
	 *
	 * Use `toString()` for a quick console summary.
	 *
	 */
	it('How to get human-readable summary?', async () => {
		//import { Telemetry } from '@nan0web/telemetry'
		const t = new Telemetry()
		const summary = t.toString()

		console.info(summary.slice(0, 11)) // -> [telemetry]
		assert.strictEqual(console.output()[0][1], '[telemetry]')
	})

	/**
	 * @docs
	 * ## Java•Script
	 */
	it('Uses `d.ts` files for autocompletion', () => {
		assert.equal(pkg.types, './types/index.d.ts')
	})

	/**
	 * @docs
	 * ## Contributing
	 */
	it('How to contribute? - [check here]($pkgURL/blob/main/CONTRIBUTING.md)', async () => {
		assert.equal(pkg.scripts?.precommit, 'npm test')
		const text = fsNode.readFileSync('CONTRIBUTING.md', 'utf8')
		assert.ok(text.includes('# Contributing'))
	})

	/**
	 * @docs
	 * ## License
	 */
	it('How to license? - [ISC LICENSE]($pkgURL/blob/main/LICENSE) file.', async () => {
		const text = fsNode.readFileSync('LICENSE', 'utf8')
		assert.ok(text.includes('ISC'))
	})
}

describe('README.md.js — ProvenDoc Manifest', testRender)

describe('Rendering README.md', async () => {
	it(`document is rendered in README.md`, async () => {
		const parser = new DocsParser()
		const sourceCode = fsNode.readFileSync(fileURLToPath(import.meta.url), 'utf-8')
		let text = String(parser.decode(sourceCode))

		// Post-process for public README
		text = text
			.replace(
				/\/\/import \{ (.*) \} from '@nan0web\/telemetry'/g,
				"import { $1 } from '@nan0web/telemetry'",
			)
			.replace(/const \{ (.*) \} = await import\('\.\/(.*)\.js'\)/g, '')
			.replace(/^\s*[\r\n]/gm, '\n') // Clean up empty lines

		await fs.saveDocument('README.md', text)

		const dataset = DatasetParser.parse(text, pkg.name)
		await fs.saveDocument('.datasets/README.dataset.jsonl', dataset)

		assert.ok(text.includes('## License'))
	})
})
