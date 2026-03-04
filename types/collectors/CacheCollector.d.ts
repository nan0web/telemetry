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
    /**
     * Records a cache event.
     * @param {CacheEvent} event
     * @returns {void}
     */
    collect(event: CacheEvent): void;
    /**
     * Returns aggregated cache metrics.
     * @param {string} [uriPrefix] - filter by URI prefix
     * @returns {CacheReport}
     */
    report(uriPrefix?: string): CacheReport;
    /**
     * Resets all counters.
     * @returns {void}
     */
    reset(): void;
    #private;
}
export type CacheEvent = {
    hit: boolean;
    uri: string;
};
export type CacheReport = {
    hits: number;
    misses: number;
    hitRate: number;
};
