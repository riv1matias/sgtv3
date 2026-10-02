import { asc, desc, eq, and, sql } from 'drizzle-orm'
import { schema as s, type Tx, getDb } from '@/db'
import { hashEvento, HASH_GENESIS, verificarCadena } from '@/domain/auditoria'

export interface Actor {
  id: string | null
  nombreCompleto: string
  rol?: string | null
  empresa?: string | null
}

export const SISTEMA: Actor = { id: null, nombreCompleto: 'Sistema', rol: 'sistema' }

export interface NuevoEvento {
  entidad: string
  entidadId: string
  accion: string
  estadoDesde?: string | null
  estadoHasta?: string | null
  cambios?: unknown
  comentario?: string | null
  enNombreDe?: string | null
}

/**
 * Registra un evento inmutable encadenado al anterior.
 * El lock transaccional serializa la cadena para que no haya dos eventos con el mismo hash previo.
 */
export async function registrarEvento(tx: Tx, actor: Actor, e: NuevoEvento) {
  await tx.execute(sql`select pg_advisory_xact_lock(7001)`)
  const [ultimo] = await tx.select({ hash: s.eventos.hash }).from(s.eventos).orderBy(desc(s.eventos.id)).limit(1)
  const previo = ultimo?.hash ?? HASH_GENESIS
  const datos = {
    ocurridoEn: new Date().toISOString(),
    usuarioId: actor.id,
    usuarioNombre: actor.nombreCompleto,
    rol: actor.rol ?? null,
    empresa: actor.empresa ?? null,
    enNombreDe: e.enNombreDe ?? null,
    entidad: e.entidad,
    entidadId: e.entidadId,
    accion: e.accion,
    estadoDesde: e.estadoDesde ?? null,
    estadoHasta: e.estadoHasta ?? null,
    cambios: e.cambios ?? null,
    comentario: e.comentario ?? null,
  }
  const hash = hashEvento(previo, datos)
  await tx.insert(s.eventos).values({ ...datos, ocurridoEn: new Date(datos.ocurridoEn), hashPrevio: previo, hash })
  return hash
}

export async function eventosDe(entidad: string, entidadId: string) {
  return getDb().select().from(s.eventos).where(and(eq(s.eventos.entidad, entidad), eq(s.eventos.entidadId, entidadId))).orderBy(asc(s.eventos.id))
}

/** Verifica la cadena completa (en producción se corre como tarea diaria) */
export async function verificarAuditoria() {
  const filas = await getDb().select().from(s.eventos).orderBy(asc(s.eventos.id))
  return verificarCadena(filas.map((f) => ({
    id: f.id, hashPrevio: f.hashPrevio, hash: f.hash,
    ocurridoEn: f.ocurridoEn.toISOString(), usuarioId: f.usuarioId, usuarioNombre: f.usuarioNombre, rol: f.rol, empresa: f.empresa,
    enNombreDe: f.enNombreDe, entidad: f.entidad, entidadId: f.entidadId, accion: f.accion, estadoDesde: f.estadoDesde,
    estadoHasta: f.estadoHasta, cambios: f.cambios, comentario: f.comentario,
  })))
}
