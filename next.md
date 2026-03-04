# @nan0web/telemetry — Roadmap

Observability layer for nan0web ecosystem.
Collects, aggregates, and reports metrics from `@nan0web/db` and other packages.

## Architecture

```
[@nan0web/db]                    [@nan0web/telemetry]
  emit('cache', {hit, uri})  →    Telemetry.connect(db)
  emit('change', {uri, type}) →     ↓
  emit('fallback', {uri, …})  →   Collectors (counter-based, O(1))
                                     ↓
                                   Reporter → { cacheHitRate, changes, fallbacks }
                                     ↓
                                   bench() → { p50, p95, p99, mean }
```

## Completed

- [x] TEL-1: `package.json`, `tsconfig.json`, `.npmignore`, `knip.json`
- [x] TEL-2: `Telemetry` class — `connect()`, `disconnect()`, `report()`, `reset()`, `toString()`
- [x] TEL-3: Collectors inline (v1) → refactored to separate classes (v2)
- [x] TEL-4: URI prefix filtering in `report(uri?)`
- [x] TEL-5: Multi-DB aggregation
- [x] TEL-6: Delegate-wrapper pattern for `disconnect()` (DB has no `off()`)
- [x] TEL-7: TDD test suite — 42 unit tests + 4 docs tests = 46 green
- [x] TEL-18: i18n via DBFS.fetch() — replaced custom parseYaml with `DBFS.fetch()`, $ref auto-resolution
- [x] TEL-19: Snapshot tests — 16 golden master tests (8 demos × 2 locales) in `play/main.test.js`
- [x] TEL-12: `toStream()` — periodic reporting via `ReadableStream`
- [x] TEL-13: Integration test with real `@nan0web/db` instance
- [x] TEL-8: ProvenDoc `README.md.js`
- [x] TEL-9: `test:all` pipeline green (test + test:docs + test:e2e + build + knip + audit)
- [x] TEL-10: Extract collectors (`CacheCollector`, `ChangeCollector`, `FallbackCollector`)
- [x] TEL-11: `bench(db, operation, options)` — benchmark runner with p50/p95/p99/mean
- [x] TEL-16: Examples: `basic.js`, `bench.js`, `multi-db.js`, `periodic.js`, `stream.js`
- [x] TEL-17: Interactive CLI Sandbox (`play/main.js`) with ui-cli — 8 demo scenarios

## Next

- [x] TEL-14: Generate `README.md` from `README.md.js` ProvenDoc
- [x] TEL-15: Package ready for `npm publish v0.1.0`

## Next

- [ ] TEL-20: `npm publish` — actual release (requires manual approval/token)
- [ ] TEL-21: Integration into `master-ide` or other NAN0 packages

- Zero runtime deps (uses DB's existing `on()`/`emit()`)
- Dev: `@nan0web/db`, `@nan0web/db-fs`, `@nan0web/test`, `@nan0web/log`, `@nan0web/ui-cli`

## Key Technical Notes

- **spinner(message)** — takes a `string`, returns `Spinner` with `.success()` / `.stop()` / `.error()`. No `.execute()`
- **progress({ total, title })** — returns `ProgressBar` with `.update(n)`. No `.execute()`
- **YAML files** may have single quotes (not double) — editor/prettier converts `"` → `'`
- **select()** from ui-cli returns `{ value, index }`
- **DBFS fetch pattern:** `const doc = await fs.fetch('uk/index')` — resolves `$ref` links automatically

## Files

```
packages/telemetry/
├── package.json
├── tsconfig.json
├── knip.json
├── .npmignore
├── next.md
├── play/
│   ├── main.js                  — Interactive CLI sandbox (8 demos, i18n)
│   ├── main.test.js             — Snapshot tests (16: 8 demos × 2 locales)
│   └── data/
│       ├── index.yaml           — EN default: title + $ref _/t
│       ├── _/
│       │   └── t.yaml           — English translations (58 keys)
│       └── uk/
│           ├── index.yaml       — UK overlay: $ref /index + title + $ref _/t
│           └── _/
│               └── t.yaml       — Ukrainian translations (58 keys)
├── snapshots/play/              — Golden master .snap files (auto-generated)
├── examples/
│   ├── basic.js                 — connect + report + reset
│   ├── bench.js                 — benchmark with p50/p95/p99
│   ├── multi-db.js              — two DBs + URI filtering + disconnect
│   ├── periodic.js              — live snapshot every second
│   └── stream.js                — real-time telemetry stream
└── src/
    ├── index.js
    ├── Telemetry.js
    ├── Telemetry.test.js
    ├── toStream.test.js         — Stream periodic emitter tests
    ├── Integration.test.js      — Real @nan0web/db integration
    ├── bench.js
    ├── bench.test.js
    ├── README.md.js             — ProvenDoc manifest
    └── collectors/
        ├── index.js
        ├── CacheCollector.js
        ├── CacheCollector.test.js
        ├── ChangeCollector.js
        ├── ChangeCollector.test.js
        ├── FallbackCollector.js
        └── FallbackCollector.test.js
```

#.
