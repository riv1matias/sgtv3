import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

export type DB = NodePgDatabase<typeof schema>
/** Transacción o conexión: todos los servicios aceptan cualquiera de los dos */
export type Tx = Parameters<Parameters<DB['transaction']>[0]>[0] | DB

const globalForDb = globalThis as unknown as { pool?: Pool; db?: DB }

export function getPool(): Pool {
  if (!globalForDb.pool) {
    globalForDb.pool = new Pool({
      connectionString: process.env.DATABASE_URL ?? 'postgres://postgres@localhost:5432/sgt',
      max: 10,
    })
  }
  return globalForDb.pool
}

export function getDb(): DB {
  if (!globalForDb.db) globalForDb.db = drizzle(getPool(), { schema })
  return globalForDb.db
}

export { schema }
