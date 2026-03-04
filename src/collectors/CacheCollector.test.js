import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { CacheCollector } from './CacheCollector.js'

describe('CacheCollector', () => {
	/** @type {CacheCollector} */
	let c

	beforeEach(() => {
		c = new CacheCollector()
	})

	it('starts at zero', () => {
		const r = c.report()
		assert.strictEqual(r.hits, 0)
		assert.strictEqual(r.misses, 0)
		assert.strictEqual(r.hitRate, 0)
	})

	it('counts hits', () => {
		c.collect({ hit: true, uri: 'a.txt' })
		c.collect({ hit: true, uri: 'b.txt' })
		assert.strictEqual(c.report().hits, 2)
	})

	it('counts misses', () => {
		c.collect({ hit: false, uri: 'a.txt' })
		assert.strictEqual(c.report().misses, 1)
	})

	it('calculates hitRate', () => {
		c.collect({ hit: true, uri: 'a' })
		c.collect({ hit: true, uri: 'b' })
		c.collect({ hit: true, uri: 'c' })
		c.collect({ hit: false, uri: 'd' })
		assert.strictEqual(c.report().hitRate, 0.75)
	})

	it('tracks per-URI stats', () => {
		c.collect({ hit: true, uri: 'users/1.json' })
		c.collect({ hit: false, uri: 'users/2.json' })
		c.collect({ hit: true, uri: 'posts/1.json' })

		const r = c.report('users/')
		assert.strictEqual(r.hits, 1)
		assert.strictEqual(r.misses, 1)
		assert.strictEqual(r.hitRate, 0.5)
	})

	it('report without prefix returns global', () => {
		c.collect({ hit: true, uri: 'a.txt' })
		c.collect({ hit: false, uri: 'b.txt' })

		const r = c.report()
		assert.strictEqual(r.hits, 1)
		assert.strictEqual(r.misses, 1)
	})

	it('reset zeroes all', () => {
		c.collect({ hit: true, uri: 'a.txt' })
		c.collect({ hit: false, uri: 'b.txt' })
		c.reset()

		const r = c.report()
		assert.strictEqual(r.hits, 0)
		assert.strictEqual(r.misses, 0)
	})

	it('collects after reset', () => {
		c.collect({ hit: true, uri: 'a.txt' })
		c.reset()
		c.collect({ hit: false, uri: 'b.txt' })
		assert.strictEqual(c.report().misses, 1)
	})
})
