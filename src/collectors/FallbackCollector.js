/**
 * @typedef {Object} FallbackEvent
 * @property {string} uri
 * @property {any} from
 * @property {any} to
 */

/**
 * @typedef {Object} FallbackReport
 * @property {number} total
 * @property {string[]} pairs — list of URIs that triggered fallback
 */

/**
 * Aggregates fallback activation metrics.
 * Stores only URI list (lightweight) — does NOT hold references
 * to from/to DB objects to avoid memory leaks.
 */
export class FallbackCollector {
	/** @type {number} */
	#total = 0

	/** @type {string[]} */
	#uris = []

	/**
	 * Records a fallback event.
	 * @param {FallbackEvent} event
	 * @returns {void}
	 */
	collect(event) {
		this.#total++
		this.#uris.push(event.uri)
	}

	/**
	 * Returns aggregated fallback metrics.
	 * @param {string} [uriPrefix] - filter by URI prefix
	 * @returns {FallbackReport}
	 */
	report(uriPrefix) {
		if (!uriPrefix) {
			return {
				total: this.#total,
				pairs: [...this.#uris],
			}
		}

		const filtered = this.#uris.filter((u) => u.startsWith(uriPrefix))
		return {
			total: filtered.length,
			pairs: filtered,
		}
	}

	/**
	 * Resets all counters.
	 * @returns {void}
	 */
	reset() {
		this.#total = 0
		this.#uris = []
	}
}
