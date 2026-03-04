/**
 * @typedef {Object} BenchResult
 * @property {string} operation
 * @property {number} samples
 * @property {number} p50
 * @property {number} p95
 * @property {number} p99
 * @property {number} mean
 */

/**
 * Runs a benchmark suite against a DB instance.
 * Measures timing of standard operations with percentile stats.
 *
 * @param {import('./Telemetry.js').ConnectableDB & { set: Function, get: Function }} db
 * @param {string} operation — 'set' | 'get' | 'mixed'
 * @param {{ samples?: number }} [options]
 * @returns {Promise<BenchResult>}
 */
export async function bench(db, operation = 'mixed', options = {}) {
	const samples = options.samples || 100
	/** @type {number[]} */
	const timings = []

	if (operation === 'set' || operation === 'mixed') {
		for (let i = 0; i < samples; i++) {
			const start = performance.now()
			await db.set(`bench/item-${i}.json`, { i, ts: Date.now() })
			timings.push(performance.now() - start)
		}
	}

	if (operation === 'get' || operation === 'mixed') {
		// Pre-seed data for get benchmark
		if (operation === 'get') {
			for (let i = 0; i < samples; i++) {
				await db.set(`bench/item-${i}.json`, { i })
			}
		}
		for (let i = 0; i < samples; i++) {
			const start = performance.now()
			await db.get(`bench/item-${i}.json`)
			timings.push(performance.now() - start)
		}
	}

	timings.sort((a, b) => a - b)

	return {
		operation,
		samples: timings.length,
		p50: percentile(timings, 50),
		p95: percentile(timings, 95),
		p99: percentile(timings, 99),
		mean: timings.reduce((a, b) => a + b, 0) / timings.length,
	}
}

/**
 * Calculates percentile from sorted array.
 * @param {number[]} sorted
 * @param {number} p — percentile (0-100)
 * @returns {number}
 */
function percentile(sorted, p) {
	if (sorted.length === 0) return 0
	const idx = Math.ceil((p / 100) * sorted.length) - 1
	return Math.round(sorted[Math.max(0, idx)] * 100) / 100
}
