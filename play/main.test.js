/**
 * Snapshot tests for the @nan0web/telemetry CLI Sandbox.
 *
 * Tests each demo function in both EN and UK locales using golden master snapshots.
 * Run with UPDATE_SNAPSHOTS=1 to regenerate snapshot files.
 *
 * @module play/main.test
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const SNAPSHOT_DIR = path.join(import.meta.dirname, '..', 'snapshots', 'play')

/**
 * Normalizes CLI output for deterministic snapshot comparison.
 * Removes ANSI codes, normalizes variable values (timing, percentages, counts).
 * @param {string} str
 * @returns {string}
 */
function normalizeOutput(str) {
	return (
		str
			// Remove ANSI codes (colors, cursor movement, erase, etc)
			.replace(/\x1B\[[0-9;?]*[a-zA-Z]/g, '')
			// Normalize progress bars: [====>---] 20% [00:00 < 00:00]
			.replace(/\[=*>?-*\] \d+% \[\d{2}:\d{2}( < \d{2}:\d{2})?\]/g, '[PROGRESS_BAR]')
			// Normalize spinner frames (braille patterns)
			.replace(/^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏].*$/gm, '[SPINNER_FRAME]')
			// Deduplicate consecutive spinner frames
			.replace(/(\[SPINNER_FRAME\]\n?)+/g, '[SPINNER_ANIMATION]\n')
			// Normalize uptime: 0s → [UPTIME]
			.replace(/uptime: \d+(\.\d+)?s/g, 'uptime: [UPTIME]')
			// Normalize spinner durations [00:02] -> [XX:XX]
			.replace(/\[\d{2}:\d{2}\]/g, '[XX:XX]')
			// Normalize benchmark values: 0.001 → [MS]
			.replace(/\d+\.\d{3}/g, '[MS]')
			// Normalize percentages: 50.0% → [PCT]%
			.replace(/\d+\.\d+%/g, '[PCT]%')
			// Normalize counts that vary (e.g. cache hits/misses numbers)
			// Keep structural numbers (demo titles like "1.", "2.")
			// Normalize bar graphs (█ and ░ sequences)
			.replace(/[█]+/g, '[BAR_FILLED]')
			.replace(/[░]+/g, '[BAR_EMPTY]')
			// Remove clear screen empty lines at start
			.replace(/^\s+/, '')
			// Trim end
			.trim()
	)
}

/**
 * Runs a single demo and captures its stdout.
 * @param {string} demo - Demo name (connect, write, etc.)
 * @param {string} lang - Language code (en, uk)
 * @returns {Promise<string>} Normalized stdout output
 */
async function runDemo(demo, lang) {
	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, ['play/main.js', `--demo=${demo}`, `--lang=${lang}`], {
			cwd: path.join(import.meta.dirname, '..'),
			env: { ...process.env, FORCE_COLOR: '0' },
			stdio: ['pipe', 'pipe', 'pipe'],
		})

		let stdout = ''
		let stderr = ''

		child.stdout.on('data', (chunk) => {
			stdout += chunk.toString()
		})
		child.stderr.on('data', (chunk) => {
			stderr += chunk.toString()
		})

		const timer = setTimeout(() => {
			child.kill()
			reject(new Error(`Demo "${demo}" timed out after 15s`))
		}, 15_000)

		child.on('close', (exitCode) => {
			clearTimeout(timer)
			if (exitCode !== 0 && exitCode !== null) {
				reject(new Error(`Demo "${demo}" exited with code ${exitCode}.\nstderr: ${stderr}`))
				return
			}
			resolve(normalizeOutput(stdout))
		})

		// Close stdin immediately — demos don't need interactive input
		child.stdin.end()
	})
}

/**
 * Verifies output against a golden master snapshot.
 * Creates snapshot on first run, compares on subsequent runs.
 * @param {string} name - Snapshot filename (without .snap)
 * @param {string} actual - Normalized output to verify
 */
function verifySnapshot(name, actual) {
	if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true })

	const snapshotPath = path.join(SNAPSHOT_DIR, `${name}.snap`)

	if (process.env.UPDATE_SNAPSHOTS) {
		fs.writeFileSync(snapshotPath, actual, 'utf8')
		// eslint-disable-next-line no-console
		console.log(`Updated snapshot: ${name}.snap`)
		return
	}

	if (!fs.existsSync(snapshotPath)) {
		// eslint-disable-next-line no-console
		console.warn(`WARN: Snapshot not found: ${name}.snap. Creating it...`)
		fs.writeFileSync(snapshotPath, actual, 'utf8')
		return
	}

	const expected = fs.readFileSync(snapshotPath, 'utf8')
	assert.strictEqual(actual, expected, `Snapshot mismatch for ${name}`)
}

// ─── Scenarios ──────────────────────────────────────────────

/**
 * Demos that can run independently (no prior state needed).
 * Note: some demos depend on prior state (filter, report, disconnect, reset)
 * but still produce valid output with zero data.
 */
const DEMOS = ['connect', 'write', 'read', 'report', 'filter', 'bench', 'disconnect', 'reset']

const LANGUAGES = ['en', 'uk']

// ─── Test Suite ─────────────────────────────────────────────

describe('Telemetry Sandbox — Snapshot Verification', () => {
	for (const lang of LANGUAGES) {
		describe(`Language: ${lang}`, () => {
			for (const demo of DEMOS) {
				it(`matches snapshot: ${demo} [${lang}]`, async () => {
					const output = await runDemo(demo, lang)
					verifySnapshot(`${demo}.${lang}`, output)
				})
			}
		})
	}
})
