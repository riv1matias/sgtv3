/**
 * Cadena de hashes de la auditoría (spec 07): cada evento incluye el hash del anterior.
 * Alterar o borrar un evento rompe la cadena y se detecta al verificar.
 */
import { createHash } from 'node:crypto'

export const HASH_GENESIS = '0'.repeat(64)

export interface EventoHasheable {
  ocurridoEn: string
  usuarioId: string | null
  usuarioNombre: string
  rol: string | null
  empresa: string | null
  enNombreDe: string | null
  entidad: string
  entidadId: string
  accion: string
  estadoDesde: string | null
  estadoHasta: string | null
  cambios: unknown
  comentario: string | null
}

/** JSON con claves ordenadas: misma entrada → mismo texto */
export function jsonCanonico(v: unknown): string {
  if (v === undefined) return 'null'
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return `[${v.map(jsonCanonico).join(',')}]`
  const o = v as Record<string, unknown>
  return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${jsonCanonico(o[k])}`).join(',')}}`
}

export function hashEvento(previo: string, e: EventoHasheable): string {
  return createHash('sha256').update(previo).update('|').update(jsonCanonico(e)).digest('hex')
}

export function verificarCadena(eventos: Array<EventoHasheable & { id: number; hashPrevio: string; hash: string }>, inicial = HASH_GENESIS) {
  let previo = inicial
  for (const e of eventos) {
    if (e.hashPrevio !== previo) return { ok: false as const, eventoId: e.id, motivo: 'El encadenamiento no coincide con el evento anterior' }
    const { id: _i, hashPrevio: _p, hash, ...datos } = e
    if (hashEvento(previo, datos) !== hash) return { ok: false as const, eventoId: e.id, motivo: 'El contenido del evento fue alterado' }
    previo = hash
  }
  return { ok: true as const, ultimo: previo, cantidad: eventos.length }
}
