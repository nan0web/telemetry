import { CacheCollector } from './collectors/CacheCollector.js'
import { ChangeCollector } from './collectors/ChangeCollector.js'
import { FallbackCollector } from './collectors/FallbackCollector.js'

/**
 * @typedef {Object} ConnectableDB
 * @property {(event: string, fn: Function) => void} on
 */

/**
 * @typedef {Object} DBConnection
 * @property {ConnectableDB} db
 * @property {{ cache: Function, change: Function, fallback: Function }} handlers
 */

/**
 * @typedef {Object} TelemetryReport
 * @property {import('./collectors/CacheCollector.js').CacheReport} cache
 * @property {import('./collectors/ChangeCollector.js').ChangeReport} changes
 * @property {import('./collectors/FallbackCollector.js').FallbackReport} fallbacks
 * @property {number} uptime
 */

/**
 * Observability layer for nan0web ecosystem.
 * Collects, aggregates, and reports metrics from @nan0web/db instances.
 *
 * Zero runtime dependencies — uses DB's existing on()/emit() contract.
 * Counter-based collectors — O(1) per event, no unbounded array growth.
 *
 * @example
 * const t = new Telemetry()
 * t.connect(db)
 * t.report() // → { cache, changes, fallbacks, uptime }
 */
export class Telemetry {
	/** @type {CacheCollector} */
	#cache = new CacheCollector()

	/** @type {ChangeCollector} */
	#changes = new ChangeCollector()

	/** @type {FallbackCollector} */
	#fallbacks = new FallbackCollector()

	/** @type {DBConnection[]} */
	#connections = []

	/** @type {number} */
	#startTime = Date.now()

	/**
	 * Connects to a DB instance and subscribes to its events.
	 * Idempotent — connecting the same DB twice has no effect.
	 *
	 * Uses delegate wrappers: DB receives a thin function that
	 * calls conn.handlers[x]. On disconnect, handlers become no-ops,
	 * so DB's listener silently stops collecting.
	 * @param {ConnectableDB} db
	 * @returns {void}
	 */
	connect(db) {
		if (this.#connections.some((c) => c.db === db)) return

		/** @type {DBConnection} */
		const conn = {
			db,
			handlers: {
				cache: (/** @type {import('./collectors/CacheCollector.js').CacheEvent} */ e) => {
					this.#cache.collect(e)
				},
				change: (/** @type {import('./collectors/ChangeCollector.js').ChangeEvent} */ e) => {
					this.#changes.collect(e)
				},
				fallback: (/** @type {import('./collectors/FallbackCollector.js').FallbackEvent} */ e) => {
					this.#fallbacks.collect(e)
				},
			},
		}

		// Delegate wrappers — DB holds reference to the arrow,
		// which delegates to conn.handlers (swappable on disconnect)
		db.on('cache', (/** @type {any} */ e) => conn.handlers.cache(e))
		db.on('change', (/** @type {any} */ e) => conn.handlers.change(e))
		db.on('fallback', (/** @type {any} */ e) => conn.handlers.fallback(e))

		this.#connections.push(conn)
	}

	/**
	 * Disconnects from a DB instance (stops listening).
	 * If no argument — disconnects from all connected DBs.
	 *
	 * Since DB does not have off(), we swap handler delegates
	 * to no-ops so DB's listener becomes inert.
	 * @param {ConnectableDB} [db]
	 * @returns {void}
	 */
	disconnect(db) {
		if (db) {
			const idx = this.#connections.findIndex((c) => c.db === db)
			if (idx >= 0) {
				this.#nullifyHandlers(this.#connections[idx])
				this.#connections.splice(idx, 1)
			}
		} else {
			for (const conn of this.#connections) {
				this.#nullifyHandlers(conn)
			}
			this.#connections = []
		}
	}

	/**
	 * Swaps handler delegates to no-ops.
	 * @param {DBConnection} conn
	 */
	#nullifyHandlers(conn) {
		const noop = () => {}
		conn.handlers.cache = noop
		conn.handlers.change = noop
		conn.handlers.fallback = noop
	}

	/**
	 * Returns aggregated metrics, optionally filtered by URI prefix.
	 * @param {string} [uriPrefix]
	 * @returns {TelemetryReport}
	 */
	report(uriPrefix) {
		return {
			cache: this.#cache.report(uriPrefix),
			changes: this.#changes.report(uriPrefix),
			fallbacks: this.#fallbacks.report(uriPrefix),
			uptime: Date.now() - this.#startTime,
		}
	}

	/**
	 * Resets all counters. Does not disconnect DBs.
	 * @returns {void}
	 */
	reset() {
		this.#cache.reset()
		this.#changes.reset()
		this.#fallbacks.reset()
		this.#startTime = Date.now()
	}

	/**
	 * Returns a ReadableStream that periodically emits telemetry reports.
	 *
	 * @param {Object} [options]
	 * @param {number} [options.interval=1000] - Interval in milliseconds.
	 * @param {string} [options.uriPrefix] - Optional URI prefix to filter reports.
	 * @returns {ReadableStream<TelemetryReport>}
	 */
	toStream(options = {}) {
		const { interval = 1000, uriPrefix } = options
		/** @type {any} */
		let timer = null

		return new ReadableStream({
			start: (controller) => {
				timer = setInterval(() => {
					try {
						controller.enqueue(this.report(uriPrefix))
					} catch (e) {
						// Stream might be closed
						if (timer) clearInterval(timer)
					}
				}, interval)
			},
			cancel: () => {
				if (timer) clearInterval(timer)
				timer = null
			},
		})
	}

	/**
	 * Human-readable summary of current metrics.
	 * @returns {string}
	 */
	toString() {
		const r = this.report()
		const lines = [
			`[telemetry] uptime: ${Math.round(r.uptime / 1000)}s`,
			`  cache: ${r.cache.hits} hits, ${r.cache.misses} misses (${(r.cache.hitRate * 100).toFixed(1)}%)`,
			`  changes: ${r.changes.total} total ${JSON.stringify(r.changes.byType)}`,
			`  fallbacks: ${r.fallbacks.total}`,
		]
		return lines.join('\n')
	}
}
