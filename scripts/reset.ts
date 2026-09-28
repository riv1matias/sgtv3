import { Client } from 'pg'

// Borra y recrea el esquema completo (solo desarrollo). La auditoría es inmutable,
// así que se elimina el esquema entero en lugar de borrar filas.
async function main() {
  const url = process.env.DATABASE_URL ?? 'postgres://postgres@localhost:5432/sgt'
  if (process.env.NODE_ENV === 'production') throw new Error('reset no permitido en producción')
  const c = new Client({ connectionString: url })
  await c.connect()
  await c.query('DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;')
  await c.end()
  console.log('Esquema reiniciado')
}
main().catch((e) => { console.error(e); process.exit(1) })
