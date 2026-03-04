import DB from '@nan0web/db'
import Telemetry from '../src/index.js'

async function run() {
	console.log('--- Telemetry Example with DB ---')

	const db = new DB()
	const telemetry = new Telemetry()

	// 1. Connect telemetry to DB
	telemetry.connect(db)

	// 2. Perform some DB operations
	console.log('Writing data...')
	await db.set('users/admin.json', { name: 'Admin' })
	await db.set('users/guest.json', { name: 'Guest' })
	await db.saveDocument('settings/theme.json', { value: 'dark' })

	console.log('Reading data...')
	await db.get('users/admin.json') // should miss (cache hit = false) and then cache
	await db.get('users/admin.json') // should hit
	await db.get('users/guest.json') // should miss and cache
	await db.get('nonexistent.json') // should miss

	console.log('Dropping data...')
	await db.dropDocument('users/guest.json')

	// 3. Output human-readable summary
	console.log('\n--- Telemetry Summary ---')
	console.log(telemetry.toString())

	// 4. Output detailed JSON
	console.log('\n--- Detailed JSON Report ---')
	console.dir(telemetry.report(), { depth: null, colors: true })

	// 5. Output filtered JSON (only users prefix)
	console.log('\n--- Filtered Report (users/) ---')
	console.dir(telemetry.report('users/'), { depth: null, colors: true })

	// 6. Reset
	telemetry.reset()
	console.log('\n--- After Reset ---')
	console.log(telemetry.toString())
}

run().catch(console.error)
