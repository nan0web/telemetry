import DB from '@nan0web/db'
import Telemetry from '../src/index.js'

async function run() {
	console.log('--- Multi-DB Telemetry ---\n')

	// Two separate DB instances — e.g. cache layer + main store
	const cacheDb = new DB()
	const mainDb = new DB()

	const telemetry = new Telemetry()

	// Connect both to the same telemetry instance
	telemetry.connect(cacheDb)
	telemetry.connect(mainDb)

	// Simulate: cache layer gets a lot of reads
	console.log('Simulating cache reads...')
	for (let i = 0; i < 20; i++) {
		await cacheDb.set(`cache/item-${i}.json`, { id: i })
	}
	for (let i = 0; i < 20; i++) {
		await cacheDb.get(`cache/item-${i}.json`)
	}

	// Simulate: main store gets writes
	console.log('Simulating main store writes...')
	for (let i = 0; i < 5; i++) {
		await mainDb.set(`data/record-${i}.json`, { value: Math.random() })
	}

	// Aggregated report across both DBs
	console.log('\n--- Aggregated Report ---')
	console.log(telemetry.toString())

	// Filtered: only cache/ prefix
	console.log('\n--- Cache-only metrics ---')
	const cacheReport = telemetry.report('cache/')
	console.log(`  hits: ${cacheReport.cache.hits}, misses: ${cacheReport.cache.misses}`)
	console.log(`  hitRate: ${(cacheReport.cache.hitRate * 100).toFixed(1)}%`)
	console.log(`  changes: ${cacheReport.changes.total}`)

	// Filtered: only data/ prefix
	console.log('\n--- Data-only metrics ---')
	const dataReport = telemetry.report('data/')
	console.log(`  changes: ${dataReport.changes.total}`)
	console.log(`  byType:`, dataReport.changes.byType)

	// Disconnect cache layer — simulate graceful shutdown
	console.log('\nDisconnecting cacheDb...')
	telemetry.disconnect(cacheDb)

	// New events from cacheDb are ignored
	await cacheDb.set('cache/phantom.json', { ghost: true })
	console.log('After disconnect — phantom write NOT counted:')
	console.log(`  total changes: ${telemetry.report().changes.total}`)

	// mainDb still tracked
	await mainDb.set('data/live.json', { alive: true })
	console.log('mainDb write IS counted:')
	console.log(`  total changes: ${telemetry.report().changes.total}`)
}

run().catch(console.error)
