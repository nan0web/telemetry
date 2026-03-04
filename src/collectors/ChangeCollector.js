/**
 * @typedef {Object} ChangeEvent
 * @property {string} uri
 * @property {'set' | 'save' | 'drop'} type
 * @property {any} [data]
 */

/**
 * @typedef {Object} ChangeReport
 * @property {number} total
 * @property {Record<string, number>} byType
 */

/**
 * Aggregates document change metrics.
 * Counter-based — O(1) per collect.
 *
 * Stores per-URI type counts for prefix filtering.
 */
export class ChangeCollector {
	/** @type {number} */
	#total = 0

	/** @type {Record<string, number>} */
	#byType = {}

	/** @type {Map<string, Record<string, number>>} */
	#byUri = new Map()

	/**
	 * Records a change event.
	 * @param {ChangeEvent} event
	 * @returns {void}
	 */
	collect(event) {
		this.#total++
		this.#byType[event.type] = (this.#byType[event.type] || 0) + 1

		let entry = this.#byUri.get(event.uri)
		if (!entry) {
			entry = {}
			this.#byUri.set(event.uri, entry)
		}
		entry[event.type] = (entry[event.type] || 0) + 1
	}

	/**
	 * Returns aggregated change metrics.
	 * @param {string} [uriPrefix] - filter by URI prefix
	 * @returns {ChangeReport}
	 */
	report(uriPrefix) {
		if (!uriPrefix) {
			return {
				total: this.#total,
				byType: { ...this.#byType },
			}
		}

		let total = 0
		/** @type {Record<string, number>} */
		const byType = {}
		for (const [uri, entry] of this.#byUri) {
			if (uri.startsWith(uriPrefix)) {
				for (const [type, count] of Object.entries(entry)) {
					byType[type] = (byType[type] || 0) + count
					total += count
				}
			}
		}
		return { total, byType }
	}

	/**
	 * Resets all counters.
	 * @returns {void}
	 */
	reset() {
		this.#total = 0
		this.#byType = {}
		this.#byUri.clear()
	}
}
