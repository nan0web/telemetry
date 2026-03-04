import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { FallbackCollector } from './FallbackCollector.js'

describe('FallbackCollector', () => {
	/** @type {FallbackCollector} */
	let c

	beforeEach(() => {
		c = new FallbackCollector()
	})

	it('starts at zero', () => {
		const r = c.report()
		assert.strictEqual(r.total, 0)
		assert.deepStrictEqual(r.pairs, [])
	})

	it('counts fallbacks', () => {
		c.collect({ uri: 'a.txt', from: {}, to: {} })
		c.collect({ uri: 'b.txt', from: {}, to: {} })
		assert.strictEqual(c.report().total, 2)
	})

	it('tracks URI list', () => {
		c.collect({ uri: 'missing.txt', from: {}, to: {} })
		const r = c.report()
		assert.strictEqual(r.pairs.length, 1)
		assert.strictEqual(r.pairs[0], 'missing.txt')
	})

	it('filters by URI prefix', () => {
		c.collect({ uri: 'users/x.json', from: {}, to: {} })
		c.collect({ uri: 'posts/y.json', from: {}, to: {} })

		const r = c.report('users/')
		assert.strictEqual(r.total, 1)
		assert.strictEqual(r.pairs.length, 1)
	})

	it('reset zeroes all', () => {
		c.collect({ uri: 'a.txt', from: {}, to: {} })
		c.reset()
		assert.strictEqual(c.report().total, 0)
		assert.deepStrictEqual(c.report().pairs, [])
	})
})
