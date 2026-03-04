import DB from '@nan0web/db'
import { Telemetry } from '../src/index.js'

const db = new DB()
const telemetry = new Telemetry()
telemetry.connect(db)

console.log('--- Telemetry Stream Demo (Ctrl+C to stop) ---')

const stream = telemetry.toStream({ interval: 1000 })
const reader = stream.getReader()

// 1. Warm up cache (0-4)
for (let i = 0; i < 5; i++) {
	await db.saveDocument(`doc-${i}.json`, { i })
	await db.get(`doc-${i}.json`)
}

// 2. High turnover activity (mix of hits and misses)
let step = 0
const timer = setInterval(() => {
	step++
	// Every 10 steps, reset to 0-4 range to hit 100% soon
	const range = step < 20 ? 10 : 5
	const i = Math.floor(Math.random() * range)

	db.saveDocument(`doc-${i}.json`, { i })
	db.get(`doc-${Math.floor(Math.random() * range)}.json`)
}, 200)

try {
	while (true) {
		const { value: report, done } = await reader.read()
		if (done) break
		const hitRate = (report.cache.hitRate * 100).toFixed(1).padStart(5)
		console.log(
			`[${new Date().toLocaleTimeString()}] Cache: ${hitRate}% | Changes: ${report.changes.total}`,
		)
	}
} finally {
	clearInterval(timer)
}
