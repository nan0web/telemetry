import { describe, it } from 'node:test'
import assert from 'node:assert'
import DB from '@nan0web/db'
import { Telemetry } from './Telemetry.js'

describe('Telemetry Integration with @nan0web/db', () => {
	it('captures events from real DB operations', async () => {
		const db = new DB()
		const telemetry = new Telemetry()
		telemetry.connect(db)
		telemetry.reset()

		// 1. Changes
		await db.saveDocument('user.json', { name: 'Alice' })
		await db.saveDocument('posts/1.json', { title: 'Hello' })
		await db.dropDocument('user.json')

		const r1 = telemetry.report()
		// @nan0web/db emits multiple 'save' events per document (data, meta, folders)
		assert.ok(r1.changes.total >= 3, 'Should track at least 3 change events')
		assert.ok(r1.changes.byType.save >= 2, 'Should track at least 2 save events')
		assert.ok(r1.changes.byType.drop >= 1, 'Should track at least 1 drop event')

		// 2. Cache
		await db.get('posts/1.json') // Hit
		await db.get('missing.json') // Miss
		await db.get('posts/1.json') // Hit

		const r2 = telemetry.report()
		assert.ok(r2.cache.hits >= 2, 'Should track at least 2 hits')
		assert.ok(r2.cache.misses >= 1, 'Should track at least 1 miss')

		// 3. Prefix filtering
		const postsReport = telemetry.report('posts/')
		assert.ok(postsReport.cache.hits >= 2, 'Post prefix should see the hits')

		telemetry.disconnect(db)
	})

	it('works with multiple databases concurrently', async () => {
		const db1 = new DB()
		const db2 = new DB()
		const telemetry = new Telemetry()

		telemetry.connect(db1)
		telemetry.connect(db2)
		telemetry.reset()

		await db1.saveDocument('a.json', { v: 1 })
		await db2.saveDocument('b.json', { v: 2 })

		const r = telemetry.report()
		assert.ok(r.changes.total >= 2)

		telemetry.disconnect()
	})
})
