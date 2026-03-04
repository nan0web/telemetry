import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Telemetry } from './Telemetry.js'

describe('Telemetry Parallelism', () => {
	it('supports 20+ parallel DB connections and aggregates metrics correctly', async () => {
		const telemetry = new Telemetry()
		const count = 20
		const dbs = []

		for (let i = 0; i < count; i++) {
			const listeners = new Map()
			const db = {
				id: i,
				on(event, fn) {
					listeners.set(event, fn)
				},
				emit(event, data) {
					if (listeners.has(event)) listeners.get(event)(data)
				},
			}
			telemetry.connect(db)
			dbs.push(db)
		}

		// Emit 1 event from each DB
		for (const db of dbs) {
			db.emit('cache', { hit: true, uri: `db-${db.id}/test.json` })
			db.emit('change', { uri: `db-${db.id}/test.json`, type: 'save' })
		}

		const report = telemetry.report()
		assert.strictEqual(report.cache.hits, count, `Should have ${count} hits total`)
		assert.strictEqual(report.changes.total, count, `Should have ${count} changes total`)

		// Check prefix filtering for a specific DB
		const db5Report = telemetry.report('db-5/')
		assert.strictEqual(
			db5Report.cache.hits,
			1,
			'Prefix filtering should work for a single DB in a parallel set',
		)

		telemetry.disconnect()
	})
})
