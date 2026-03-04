import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { Telemetry } from './Telemetry.js'

/** @typedef {{ on: Function, emit: Function }} MockDB */

/**
 * Creates a minimal mock DB with on/emit support.
 * @returns {MockDB & { emit: (event: string, data: any) => void }}
 */
function createMockDB() {
	/** @type {Map<string, Function[]>} */
	const listeners = new Map()
	return {
		on(event, fn) {
			const list = listeners.get(event) || []
			list.push(fn)
			listeners.set(event, list)
		},
		emit(event, data) {
			const list = listeners.get(event) || []
			for (const fn of list) fn(data)
		},
	}
}

describe('Telemetry — connect / disconnect', () => {
	it('connects to a DB instance and subscribes to events', () => {
		const t = new Telemetry()
		const db = createMockDB()

		t.connect(db)

		// After connect, cache event should be captured
		db.emit('cache', { hit: true, uri: 'a.txt' })

		const report = t.report()
		assert.strictEqual(report.cache.hits, 1)
	})

	it('connect() is idempotent — double connect does not duplicate listeners', () => {
		const t = new Telemetry()
		const db = createMockDB()

		t.connect(db)
		t.connect(db) // second connect should be ignored

		db.emit('cache', { hit: true, uri: 'a.txt' })

		const report = t.report()
		assert.strictEqual(report.cache.hits, 1)
	})

	it('disconnect() stops listening to a specific DB', () => {
		const t = new Telemetry()
		const db = createMockDB()

		t.connect(db)
		db.emit('cache', { hit: true, uri: 'a.txt' })
		assert.strictEqual(t.report().cache.hits, 1)

		t.disconnect(db)
		db.emit('cache', { hit: true, uri: 'b.txt' })
		assert.strictEqual(t.report().cache.hits, 1) // no change
	})

	it('disconnect() without args disconnects all', () => {
		const t = new Telemetry()
		const db1 = createMockDB()
		const db2 = createMockDB()

		t.connect(db1)
		t.connect(db2)

		t.disconnect()

		db1.emit('cache', { hit: true, uri: 'a.txt' })
		db2.emit('cache', { hit: true, uri: 'b.txt' })

		assert.strictEqual(t.report().cache.hits, 0)
	})
})

describe('Telemetry — cache metrics', () => {
	/** @type {Telemetry} */
	let t
	/** @type {ReturnType<typeof createMockDB>} */
	let db

	beforeEach(() => {
		t = new Telemetry()
		db = createMockDB()
		t.connect(db)
	})

	it('counts cache hits', () => {
		db.emit('cache', { hit: true, uri: 'users/1.json' })
		db.emit('cache', { hit: true, uri: 'users/2.json' })

		const report = t.report()
		assert.strictEqual(report.cache.hits, 2)
		assert.strictEqual(report.cache.misses, 0)
	})

	it('counts cache misses', () => {
		db.emit('cache', { hit: false, uri: 'missing.txt' })

		const report = t.report()
		assert.strictEqual(report.cache.hits, 0)
		assert.strictEqual(report.cache.misses, 1)
	})

	it('calculates hit rate', () => {
		db.emit('cache', { hit: true, uri: 'a.txt' })
		db.emit('cache', { hit: true, uri: 'b.txt' })
		db.emit('cache', { hit: true, uri: 'c.txt' })
		db.emit('cache', { hit: false, uri: 'd.txt' })

		const report = t.report()
		assert.strictEqual(report.cache.hitRate, 0.75)
	})

	it('hitRate is 0 when no events', () => {
		const report = t.report()
		assert.strictEqual(report.cache.hitRate, 0)
	})

	it('tracks per-URI cache stats', () => {
		db.emit('cache', { hit: true, uri: 'users/1.json' })
		db.emit('cache', { hit: false, uri: 'users/2.json' })
		db.emit('cache', { hit: true, uri: 'posts/1.json' })

		const report = t.report('users/')
		assert.strictEqual(report.cache.hits, 1)
		assert.strictEqual(report.cache.misses, 1)
	})
})

describe('Telemetry — change metrics', () => {
	/** @type {Telemetry} */
	let t
	/** @type {ReturnType<typeof createMockDB>} */
	let db

	beforeEach(() => {
		t = new Telemetry()
		db = createMockDB()
		t.connect(db)
	})

	it('counts total changes', () => {
		db.emit('change', { uri: 'a.txt', type: 'set', data: 'hello' })
		db.emit('change', { uri: 'b.txt', type: 'save', data: 'world' })

		const report = t.report()
		assert.strictEqual(report.changes.total, 2)
	})

	it('breaks down changes by type', () => {
		db.emit('change', { uri: 'a.txt', type: 'set', data: 'x' })
		db.emit('change', { uri: 'b.txt', type: 'set', data: 'y' })
		db.emit('change', { uri: 'c.txt', type: 'save', data: 'z' })
		db.emit('change', { uri: 'd.txt', type: 'drop' })

		const report = t.report()
		assert.deepStrictEqual(report.changes.byType, {
			set: 2,
			save: 1,
			drop: 1,
		})
	})

	it('filters changes by URI prefix', () => {
		db.emit('change', { uri: 'users/1.json', type: 'set', data: {} })
		db.emit('change', { uri: 'posts/1.json', type: 'set', data: {} })

		const report = t.report('users/')
		assert.strictEqual(report.changes.total, 1)
	})
})

describe('Telemetry — fallback metrics', () => {
	/** @type {Telemetry} */
	let t
	/** @type {ReturnType<typeof createMockDB>} */
	let db

	beforeEach(() => {
		t = new Telemetry()
		db = createMockDB()
		t.connect(db)
	})

	it('counts fallback activations', () => {
		const fallbackDB = createMockDB()
		db.emit('fallback', { uri: 'missing.txt', from: db, to: fallbackDB })

		const report = t.report()
		assert.strictEqual(report.fallbacks.total, 1)
	})

	it('tracks source→target pairs', () => {
		const fallbackDB = createMockDB()
		db.emit('fallback', { uri: 'a.txt', from: db, to: fallbackDB })
		db.emit('fallback', { uri: 'b.txt', from: db, to: fallbackDB })

		const report = t.report()
		assert.strictEqual(report.fallbacks.total, 2)
		assert.ok(report.fallbacks.pairs.length > 0)
		assert.strictEqual(report.fallbacks.pairs[0], 'a.txt')
	})
})

describe('Telemetry — reset', () => {
	it('zeroes all counters', () => {
		const t = new Telemetry()
		const db = createMockDB()
		t.connect(db)

		db.emit('cache', { hit: true, uri: 'a.txt' })
		db.emit('change', { uri: 'b.txt', type: 'set', data: {} })
		db.emit('fallback', { uri: 'c.txt', from: db, to: {} })

		t.reset()

		const report = t.report()
		assert.strictEqual(report.cache.hits, 0)
		assert.strictEqual(report.cache.misses, 0)
		assert.strictEqual(report.changes.total, 0)
		assert.strictEqual(report.fallbacks.total, 0)
	})

	it('reset does not stop collecting — new events are counted', () => {
		const t = new Telemetry()
		const db = createMockDB()
		t.connect(db)

		db.emit('cache', { hit: true, uri: 'a.txt' })
		t.reset()

		db.emit('cache', { hit: false, uri: 'b.txt' })
		assert.strictEqual(t.report().cache.misses, 1)
	})
})

describe('Telemetry — report serialization', () => {
	it('toJSON() returns plain object', () => {
		const t = new Telemetry()
		const json = t.report()
		const parsed = JSON.parse(JSON.stringify(json))
		assert.ok(parsed.cache)
		assert.ok(parsed.changes)
		assert.ok(parsed.fallbacks)
		assert.ok(typeof parsed.uptime === 'number')
	})

	it('toString() returns human-readable summary', () => {
		const t = new Telemetry()
		const str = t.toString()
		assert.ok(typeof str === 'string')
		assert.ok(str.includes('cache'))
	})
})

describe('Telemetry — multi-DB', () => {
	it('aggregates metrics from multiple DB instances', () => {
		const t = new Telemetry()
		const db1 = createMockDB()
		const db2 = createMockDB()

		t.connect(db1)
		t.connect(db2)

		db1.emit('cache', { hit: true, uri: 'a.txt' })
		db2.emit('cache', { hit: false, uri: 'b.txt' })

		const report = t.report()
		assert.strictEqual(report.cache.hits, 1)
		assert.strictEqual(report.cache.misses, 1)
		assert.strictEqual(report.cache.hitRate, 0.5)
	})
})
