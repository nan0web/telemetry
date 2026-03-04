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
    /**
     * Records a change event.
     * @param {ChangeEvent} event
     * @returns {void}
     */
    collect(event: ChangeEvent): void;
    /**
     * Returns aggregated change metrics.
     * @param {string} [uriPrefix] - filter by URI prefix
     * @returns {ChangeReport}
     */
    report(uriPrefix?: string): ChangeReport;
    /**
     * Resets all counters.
     * @returns {void}
     */
    reset(): void;
    #private;
}
export type ChangeEvent = {
    uri: string;
    type: "set" | "save" | "drop";
    data?: any;
};
export type ChangeReport = {
    total: number;
    byType: Record<string, number>;
};
