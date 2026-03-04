import DB from '@nan0web/db'
import Telemetry from '../src/index.js'

async function run() {
	console.log('--- Periodic Reporting ---\n')

	const db = new DB()
	const telemetry = new Telemetry()
	telemetry.connect(db)

	// Simulate workload in background
	let running = true
	const workload = async () => {
		let i = 0
		while (running) {
			await db.set(`items/doc-${i++}.json`, { ts: Date.now() })
			await db.get(`items/doc-${Math.floor(Math.random() * i)}.json`)
			await new Promise((r) => setTimeout(r, 50))
		}
	}

	const worker = workload()

	// Report every second, 5 snapshots
	for (let tick = 1; tick <= 5; tick++) {
		await new Promise((r) => setTimeout(r, 1000))
		console.log(`[tick ${tick}]`)
		console.log(telemetry.toString())
		console.log()
	}

	// Stop workload
	running = false
	await worker

	// Final report
	console.log('--- Final Report ---')
	console.dir(telemetry.report(), { depth: null, colors: true })
}

run().catch(console.error)
