import DB from '@nan0web/db'
import { bench } from '../src/index.js'

async function run() {
	console.log('--- DB Benchmark ---\n')

	const db = new DB()

	// Benchmark SET operations
	const setResult = await bench(db, 'set', { samples: 500 })
	console.log('SET benchmark:')
	console.log(`  samples: ${setResult.samples}`)
	console.log(`  p50:  ${setResult.p50.toFixed(3)}ms`)
	console.log(`  p95:  ${setResult.p95.toFixed(3)}ms`)
	console.log(`  p99:  ${setResult.p99.toFixed(3)}ms`)
	console.log(`  mean: ${setResult.mean.toFixed(3)}ms`)

	// Benchmark GET operations (reads from what SET wrote)
	const getResult = await bench(db, 'get', { samples: 500 })
	console.log('\nGET benchmark:')
	console.log(`  samples: ${getResult.samples}`)
	console.log(`  p50:  ${getResult.p50.toFixed(3)}ms`)
	console.log(`  p95:  ${getResult.p95.toFixed(3)}ms`)
	console.log(`  p99:  ${getResult.p99.toFixed(3)}ms`)
	console.log(`  mean: ${getResult.mean.toFixed(3)}ms`)

	// Benchmark MIXED (set + get interleaved)
	const mixedResult = await bench(db, 'mixed', { samples: 200 })
	console.log('\nMIXED benchmark:')
	console.log(`  samples: ${mixedResult.samples}`)
	console.log(`  p50:  ${mixedResult.p50.toFixed(3)}ms`)
	console.log(`  p95:  ${mixedResult.p95.toFixed(3)}ms`)
	console.log(`  p99:  ${mixedResult.p99.toFixed(3)}ms`)
	console.log(`  mean: ${mixedResult.mean.toFixed(3)}ms`)
}

run().catch(console.error)
