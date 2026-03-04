/**
 * @typedef {Object} CacheEvent
 * @property {boolean} hit
 * @property {string} uri
 */

/**
 * @typedef {Object} CacheReport
 * @property {number} hits
 * @property {number} misses
 * @property {number} hitRate
 */

/**
 * Aggregates cache hit/miss metrics.
 * Counter-based — O(1) per collect, no event array storage.
 */
export class CacheCollector {
	/** @type {number} */
	#hits = 0

	/** @type {number} */
	#misses = 0

	/** @type {Map<string, { hits: number, misses: number }>} */
	#byUri = new Map()

	/**
	 * Records a cache event.
	 * @param {CacheEvent} event
	 * @returns {void}
	 */
	collect(event) {
		if (event.hit) {
			this.#hits++
		} else {
			this.#misses++
		}

		let entry = this.#byUri.get(event.uri)
		if (!entry) {
			entry = { hits: 0, misses: 0 }
			this.#byUri.set(event.uri, entry)
		}
		if (event.hit) entry.hits++
		else entry.misses++
	}

	/**
	 * Returns aggregated cache metrics.
	 * @param {string} [uriPrefix] - filter by URI prefix
	 * @returns {CacheReport}
	 */
	report(uriPrefix) {
		if (!uriPrefix) {
			const total = this.#hits + this.#misses
			return {
				hits: this.#hits,
				misses: this.#misses,
				hitRate: total > 0 ? this.#hits / total : 0,
			}
		}

		let hits = 0
		let misses = 0
		for (const [uri, entry] of this.#byUri) {
			if (uri.startsWith(uriPrefix)) {
				hits += entry.hits
				misses += entry.misses
			}
		}
		const total = hits + misses
		return {
			hits,
			misses,
			hitRate: total > 0 ? hits / total : 0,
		}
	}

	/**
	 * Resets all counters.
	 * @returns {void}
	 */
	reset() {
		this.#hits = 0
		this.#misses = 0
		this.#byUri.clear()
	}
}
