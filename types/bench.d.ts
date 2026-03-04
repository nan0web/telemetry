/**
 * @typedef {Object} BenchResult
 * @property {string} operation
 * @property {number} samples
 * @property {number} p50
 * @property {number} p95
 * @property {number} p99
 * @property {number} mean
 */
/**
 * Runs a benchmark suite against a DB instance.
 * Measures timing of standard operations with percentile stats.
 *
 * @param {import('./Telemetry.js').ConnectableDB & { set: Function, get: Function }} db
 * @param {string} operation — 'set' | 'get' | 'mixed'
 * @param {{ samples?: number }} [options]
 * @returns {Promise<BenchResult>}
 */
export function bench(db: import("./Telemetry.js").ConnectableDB & {
    set: Function;
    get: Function;
}, operation?: string, options?: {
    samples?: number;
}): Promise<BenchResult>;
export type BenchResult = {
    operation: string;
    samples: number;
    p50: number;
    p95: number;
    p99: number;
    mean: number;
};
