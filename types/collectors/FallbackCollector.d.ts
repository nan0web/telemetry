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
    /**
     * Records a fallback event.
     * @param {FallbackEvent} event
     * @returns {void}
     */
    collect(event: FallbackEvent): void;
    /**
     * Returns aggregated fallback metrics.
     * @param {string} [uriPrefix] - filter by URI prefix
     * @returns {FallbackReport}
     */
    report(uriPrefix?: string): FallbackReport;
    /**
     * Resets all counters.
     * @returns {void}
     */
    reset(): void;
    #private;
}
export type FallbackEvent = {
    uri: string;
    from: any;
    to: any;
};
export type FallbackReport = {
    total: number;
    /**
     * — list of URIs that triggered fallback
     */
    pairs: string[];
};
