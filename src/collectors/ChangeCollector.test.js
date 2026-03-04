import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { ChangeCollector } from './ChangeCollector.js'

describe('ChangeCollector', () => {
	/** @type {ChangeCollector} */
	let c

	beforeEach(() => {
		c = new ChangeCollector()
	})

	it('starts at zero', () => {
		const r = c.report()
		assert.strictEqual(r.total, 0)
		assert.deepStrictEqual(r.byType, {})
	})

	it('counts total changes', () => {
		c.collect({ uri: 'a.txt', type: 'set', data: 'x' })
		c.collect({ uri: 'b.txt', type: 'save', data: 'y' })
		assert.strictEqual(c.report().total, 2)
	})

	it('breaks down by type', () => {
		c.collect({ uri: 'a.txt', type: 'set', data: 'x' })
		c.collect({ uri: 'b.txt', type: 'set', data: 'y' })
		c.collect({ uri: 'c.txt', type: 'save', data: 'z' })
		c.collect({ uri: 'd.txt', type: 'drop' })

		assert.deepStrictEqual(c.report().byType, { set: 2, save: 1, drop: 1 })
	})

	it('filters by URI prefix', () => {
		c.collect({ uri: 'users/1.json', type: 'set', data: {} })
		c.collect({ uri: 'posts/1.json', type: 'set', data: {} })

		const r = c.report('users/')
		assert.strictEqual(r.total, 1)
		assert.deepStrictEqual(r.byType, { set: 1 })
	})

	it('reset zeroes all', () => {
		c.collect({ uri: 'a.txt', type: 'set', data: 'x' })
		c.reset()
		assert.strictEqual(c.report().total, 0)
		assert.deepStrictEqual(c.report().byType, {})
	})
})
