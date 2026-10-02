import { and, desc, eq, lte } from 'drizzle-orm'
import { getDb, schema as s, type Tx } from '@/db'
import type { DefinicionFlujo } from '@/domain/flujo/tipos'
import { estadoDef } from '@/domain/flujo/motor'
import { hoy } from '@/lib/fechas'

const cache = new Map<number, DefinicionFlujo>()

export async function flujoPorId(id: number, tx: Tx = getDb()): Promise<DefinicionFlujo> {
  const c = cache.get(id)
  if (c) return c
  const [f] = await tx.select().from(s.flujos).where(eq(s.flujos.id, id))
  if (!f) throw new Error(`Flujo ${id} inexistente`)
  const def = f.definicion as DefinicionFlujo
  cache.set(id, def)
  return def
}

/** Versión vigente de un flujo: la usan las instancias nuevas (las existentes quedan en su versión) */
export async function flujoVigente(clave: string, tx: Tx = getDb()) {
  const [f] = await tx.select().from(s.flujos)
    .where(and(eq(s.flujos.clave, clave), lte(s.flujos.vigenteDesde, hoy())))
    .orderBy(desc(s.flujos.version)).limit(1)
  const g = f ?? (await tx.select().from(s.flujos).where(eq(s.flujos.clave, clave)).orderBy(desc(s.flujos.version)).limit(1))[0]
  if (!g) throw new Error(`No hay flujo publicado para ${clave}`)
  return { id: g.id, def: g.definicion as DefinicionFlujo }
}

export function etiquetaEstado(def: DefinicionFlujo, estado: string) {
  try { return estadoDef(def, estado).etiqueta } catch { return estado }
}
