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
    connect(db: ConnectableDB): void;
    /**
     * Disconnects from a DB instance (stops listening).
     * If no argument — disconnects from all connected DBs.
     *
     * Since DB does not have off(), we swap handler delegates
     * to no-ops so DB's listener becomes inert.
     * @param {ConnectableDB} [db]
     * @returns {void}
     */
    disconnect(db?: ConnectableDB): void;
    /**
     * Returns aggregated metrics, optionally filtered by URI prefix.
     * @param {string} [uriPrefix]
     * @returns {TelemetryReport}
     */
    report(uriPrefix?: string): TelemetryReport;
    /**
     * Resets all counters. Does not disconnect DBs.
     * @returns {void}
     */
    reset(): void;
    /**
     * Returns a ReadableStream that periodically emits telemetry reports.
     *
     * @param {Object} [options]
     * @param {number} [options.interval=1000] - Interval in milliseconds.
     * @param {string} [options.uriPrefix] - Optional URI prefix to filter reports.
     * @returns {ReadableStream<TelemetryReport>}
     */
    toStream(options?: {
        interval?: number | undefined;
        uriPrefix?: string | undefined;
    }): ReadableStream<TelemetryReport>;
    /**
     * Human-readable summary of current metrics.
     * @returns {string}
     */
    toString(): string;
    #private;
}
export type ConnectableDB = {
    on: (event: string, fn: Function) => void;
};
export type DBConnection = {
    db: ConnectableDB;
    handlers: {
        cache: Function;
        change: Function;
        fallback: Function;
    };
};
export type TelemetryReport = {
    cache: import("./collectors/CacheCollector.js").CacheReport;
    changes: import("./collectors/ChangeCollector.js").ChangeReport;
    fallbacks: import("./collectors/FallbackCollector.js").FallbackReport;
    uptime: number;
};
