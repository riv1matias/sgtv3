import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { getDb, getPool } from '../src/db'

async function main() {
  await migrate(getDb(), { migrationsFolder: './drizzle' })
  console.log('Migraciones aplicadas')
  await getPool().end()
}
main().catch((e) => { console.error(e); process.exit(1) })
