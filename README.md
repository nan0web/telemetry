# @nan0web/telemetry

> Observability layer for nan0web ecosystem. Collects, aggregates, and reports metrics from any `@nan0web/db` instance.

<!-- %PACKAGE_STATUS% -->

## Features

- **Zero Runtime Dependencies**: Uses DB's existing `on()`/`emit()` contract.
- **O(1) Collectors**: Counter-based metrics with zero unbounded array growth.
- **Multi-DB Support**: Aggregate metrics from multiple databases into a single report.
- **URI Filtering**: Drill down into metrics by URI prefix (e.g., `users/`).
- **Performance Benchmarks**: Built-in SET/GET benchmark runner with p50/p95/p99.
- **i18n CLI Sandbox**: Interactive playground for exploring metrics.

## Installation

How to install with npm?
```bash
npm install @nan0web/telemetry
```

How to install with pnpm?
```bash
pnpm add @nan0web/telemetry
```

How to install with yarn?
```bash
yarn add @nan0web/telemetry
```

## Quick Start

Telemetry connects to any `@nan0web/db` instance and starts collecting metrics automatically.

How to connect to a database?
```js
import { Telemetry } from '@nan0web/telemetry'
const t = new Telemetry()
const db = { on: () => {} }
t.connect(db)
console.info(String(t)) // -> [telemetry] uptime: 0s cache: 0 hits...
```
## Reading Metrics

Call `report()` to get a snapshot of all collected metrics.
Optionally pass a URI prefix to filter.

How to read metrics?
```js
import { Telemetry } from '@nan0web/telemetry'
const t = new Telemetry()
const listeners = new Map()
const db = {
	on(event, fn) {
		listeners.set(event, fn)
	},
	emit(event, data) {
		if (listeners.has(event)) listeners.get(event)(data)
	},
}
t.connect(db)
db.emit('cache', { hit: true, uri: 'users/1.json' })
const report = t.report()
console.info(report.cache.hits) // -> 1
```
## Reset

Reset all counters without disconnecting.

How to reset counters?
```js
import { Telemetry } from '@nan0web/telemetry'
const t = new Telemetry()
t.reset()
console.info('Reset successful')
```
## Streams

Use `toStream()` to get a `ReadableStream` that periodically emits reports.

How to stream metrics periodically?
```js
import { Telemetry } from '@nan0web/telemetry'
const t = new Telemetry()
const stream = t.toStream({ interval: 10 })
const reader = stream.getReader()
const { value: report } = await reader.read()
console.info(typeof report) // -> object
await reader.cancel()
```
## Benchmarks

Run performance benchmarks on any database.

How to run performance benchmarks?
```js
import { bench } from '@nan0web/telemetry'
const db = { on: () => {}, saveDocument: async () => {} }
const stats = await bench(db, 'saveDocument', { samples: 10, data: { status: 'ok' } })
console.info(stats.mean > 0) // -> true
```
## Human-Readable Output

Use `toString()` for a quick console summary.

How to get human-readable summary?
```js
import { Telemetry } from '@nan0web/telemetry'
const t = new Telemetry()
const summary = t.toString()
console.info(summary.slice(0, 11)) // -> [telemetry]
```
## Java•Script

Uses `d.ts` files for autocompletion

## Contributing

How to contribute? - [check here]($pkgURL/blob/main/CONTRIBUTING.md)

## License

How to license? - [ISC LICENSE]($pkgURL/blob/main/LICENSE) file.
```js
const text = fsNode.readFileSync('LICENSE', 'utf8')
```