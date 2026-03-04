import { describe, it } from 'node:test'
import assert from 'node:assert'
import { bench } from './bench.js'

/**
 * Creates a minimal mock DB for bench tests.
 * @returns {{ on: Function, set: Function, get: Function }}
 */
function createMockDB() {
	const store = new Map()
	return {
		on() {},
		async set(uri, data) {
			store.set(uri, data)
		},
		async get(uri) {
			return store.get(uri)
		},
	}
}

describe('bench()', () => {
	it('returns bench result for set operation', async () => {
		const db = createMockDB()
		const result = await bench(db, 'set', { samples: 10 })

		assert.strictEqual(result.operation, 'set')
		assert.strictEqual(result.samples, 10)
		assert.ok(typeof result.p50 === 'number')
		assert.ok(typeof result.p95 === 'number')
		assert.ok(typeof result.p99 === 'number')
		assert.ok(typeof result.mean === 'number')
		assert.ok(result.mean >= 0)
	})

	it('returns bench result for get operation', async () => {
		const db = createMockDB()
		const result = await bench(db, 'get', { samples: 10 })

		assert.strictEqual(result.operation, 'get')
		assert.strictEqual(result.samples, 10)
	})

	it('returns bench result for mixed operation', async () => {
		const db = createMockDB()
		const result = await bench(db, 'mixed', { samples: 10 })

		assert.strictEqual(result.operation, 'mixed')
		assert.strictEqual(result.samples, 20) // 10 set + 10 get
	})

	it('defaults to 100 samples', async () => {
		const db = createMockDB()
		const result = await bench(db, 'set')

		assert.strictEqual(result.samples, 100)
	})

	it('p50 <= p95 <= p99', async () => {
		const db = createMockDB()
		const result = await bench(db, 'set', { samples: 50 })

		assert.ok(result.p50 <= result.p95, `p50 (${result.p50}) should be <= p95 (${result.p95})`)
		assert.ok(result.p95 <= result.p99, `p95 (${result.p95}) should be <= p99 (${result.p99})`)
	})
})
