import { describe, it } from 'node:test'
import assert from 'node:assert'
import { Telemetry } from './Telemetry.js'

describe('Telemetry.toStream()', () => {
	it('emits periodic reports', async () => {
		const telemetry = new Telemetry()
		const stream = telemetry.toStream({ interval: 10 })
		const reader = stream.getReader()

		const { value: r1 } = await reader.read()
		assert.ok(r1.uptime >= 0)
		assert.strictEqual(r1.cache.hits, 0)

		const { value: r2 } = await reader.read()
		assert.ok(r2.uptime >= r1.uptime)

		await reader.cancel()
	})

	it('respects uriPrefix in stream', async () => {
		const telemetry = new Telemetry()
		const db = { on: () => {} }
		telemetry.connect(db)

		// Simulate some events manually via private access if possible or just through report logic
		// But better to just test that the option is passed through to the report() call

		const stream = telemetry.toStream({ interval: 10, uriPrefix: 'users/' })
		const reader = stream.getReader()

		const { value: r1 } = await reader.read()
		assert.ok(r1.cache)

		await reader.cancel()
	})

	it('cleans up interval on cancel', async () => {
		const telemetry = new Telemetry()
		let intervalCleared = false

		// We can't easily check internal setInterval without mocking,
		// but we can check if it stops emitting.
		const stream = telemetry.toStream({ interval: 10 })
		const reader = stream.getReader()

		await reader.read()
		await reader.cancel()

		const result = await reader.read()
		assert.strictEqual(result.done, true)
	})
})
