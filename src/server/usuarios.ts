import { and, eq, gte, lte, inArray } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { hoy } from '@/lib/fechas'

export interface Usuario {
  id: string
  email: string
  nombre: string
  apellido: string
  nombreCompleto: string
  tipo: 'interno' | 'contratista'
  roles: string[]
  subregionIds: number[]
  contratistaId: number | null
  contratistaNombre: string | null
  supervisorId: string | null
  supervisados: string[]
  delegantes: string[]
  cargo: string | null
}

export async function cargarUsuario(id: string): Promise<Usuario | null> {
  const db = getDb()
  const [u] = await db.select().from(s.usuarios).where(eq(s.usuarios.id, id))
  if (!u || !u.activo) return null
  const [roles, subs, supervisados, delegs, contr] = await Promise.all([
    db.select({ rol: s.usuarioRoles.rol }).from(s.usuarioRoles).where(eq(s.usuarioRoles.usuarioId, id)),
    db.select({ id: s.usuarioSubregiones.subregionId }).from(s.usuarioSubregiones).where(eq(s.usuarioSubregiones.usuarioId, id)),
    db.select({ id: s.usuarios.id }).from(s.usuarios).where(eq(s.usuarios.supervisorId, id)),
    db.select({ de: s.delegaciones.deUsuarioId }).from(s.delegaciones).where(and(
      eq(s.delegaciones.aUsuarioId, id), eq(s.delegaciones.activa, true), lte(s.delegaciones.desde, hoy()), gte(s.delegaciones.hasta, hoy()),
    )),
    u.contratistaId ? db.select({ nombre: s.contratistas.razonSocial }).from(s.contratistas).where(eq(s.contratistas.id, u.contratistaId)) : Promise.resolve([]),
  ])
  let subregionIds = subs.map((x) => x.id)
  if (u.contratistaId) {
    const cs = await db.select({ id: s.contratistaSubregiones.subregionId }).from(s.contratistaSubregiones).where(eq(s.contratistaSubregiones.contratistaId, u.contratistaId))
    subregionIds = cs.map((x) => x.id)
  }
  // Los supervisados de mis delegantes también quedan a mi cargo mientras dure la delegación
  const delegantes = delegs.map((d) => d.de)
  let supIds = supervisados.map((x) => x.id)
  if (delegantes.length) {
    const extra = await db.select({ id: s.usuarios.id }).from(s.usuarios).where(inArray(s.usuarios.supervisorId, delegantes))
    supIds = [...new Set([...supIds, ...extra.map((x) => x.id)])]
  }
  return {
    id: u.id, email: u.email, nombre: u.nombre, apellido: u.apellido, nombreCompleto: `${u.nombre} ${u.apellido}`,
    tipo: u.tipo as Usuario['tipo'], roles: roles.map((r) => r.rol), subregionIds,
    contratistaId: u.contratistaId, contratistaNombre: contr[0]?.nombre ?? null, supervisorId: u.supervisorId,
    supervisados: supIds, delegantes, cargo: u.cargo,
  }
}


export function tieneRol(u: Usuario, ...roles: string[]) {
  return roles.some((r) => u.roles.includes(r))
}

/** Roles con visibilidad nacional */
export function esNacional(u: Usuario) {
  return tieneRol(u, 'cerco', 'auditor', 'admin_sistema', 'compras')
}

export function actorDe(u: Usuario, rol?: string | null) {
  return { id: u.id, nombreCompleto: u.nombreCompleto, rol: rol ?? u.roles[0] ?? null, empresa: u.contratistaNombre }
}
