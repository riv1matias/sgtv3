import { Client } from 'pg'

export const URL_TEST = process.env.DATABASE_URL_TEST ?? 'postgres://postgres@localhost:5432/sgt_test'

/** Recrea la base de pruebas con migraciones y datos de demo */
export async function prepararBase() {
  process.env.DATABASE_URL = URL_TEST
  process.env.STORAGE_LOCAL_DIR = './storage-test'
  const c = new Client({ connectionString: URL_TEST })
  await c.connect()
  await c.query('DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;')
  await c.end()
  const { migrate } = await import('drizzle-orm/node-postgres/migrator')
  const { getDb } = await import('@/db')
  await migrate(getDb(), { migrationsFolder: './drizzle' })
  const { sembrar } = await import('../../scripts/seed')
  await sembrar()
}
