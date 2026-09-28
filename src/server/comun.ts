import { eq, sql } from 'drizzle-orm'
import { getDb, schema as s, type Tx } from '@/db'
import { POLITICA_DEFECTO, type PoliticaPrecios } from '@/domain/precios'

/** Próximo número de un contador (con bloqueo de fila: sin duplicados en concurrencia) */
export async function siguienteNumero(tx: Tx, clave: string): Promise<number> {
  const r = await tx.execute<{ valor: number }>(sql`
    insert into contadores (clave, valor) values (${clave}, 1)
    on conflict (clave) do update set valor = contadores.valor + 1
    returning valor`)
  return Number(r.rows[0].valor)
}

export const PARAMETROS_DEFECTO = {
  politica_precios: POLITICA_DEFECTO as PoliticaPrecios,
  iva_alicuota: '21',
  antiguedad_maxima_dias: 90,
  horas_aceptacion: 48,
  reenvios_para_escalar: 3,
  aprobacion_final_modalidad: 'todo_o_nada',
  radio_duplicados_metros: 300,
}
export type Parametros = typeof PARAMETROS_DEFECTO

export async function parametros(tx: Tx = getDb()): Promise<Parametros> {
  const filas = await tx.select().from(s.parametros)
  const p = { ...PARAMETROS_DEFECTO } as Record<string, unknown>
  for (const f of filas) p[f.clave] = f.valor
  return p as Parametros
}

export async function notificar(tx: Tx, usuarioIds: Array<string | null | undefined>, titulo: string, cuerpo: string | null, link: string | null) {
  const ids = [...new Set(usuarioIds.filter((x): x is string => !!x))]
  if (!ids.length) return
  await tx.insert(s.notificaciones).values(ids.map((usuarioId) => ({ usuarioId, titulo, cuerpo, link })))
}

/** Usuarios responsables de un contratista (para notificarlos) */
export async function usuariosDeContratista(tx: Tx, contratistaId: number | null | undefined) {
  if (!contratistaId) return []
  const filas = await tx.select({ id: s.usuarios.id, rol: s.usuarioRoles.rol }).from(s.usuarios)
    .innerJoin(s.usuarioRoles, eq(s.usuarioRoles.usuarioId, s.usuarios.id))
    .where(eq(s.usuarios.contratistaId, contratistaId))
  return [...new Set(filas.filter((f) => f.rol === 'contratista_responsable').map((f) => f.id))]
}

/** Usuarios con un rol que cubren una subregión (o nacionales) */
export async function usuariosConRol(tx: Tx, rol: string, subregionId?: number | null) {
  const filas = await tx.execute<{ id: string }>(sql`
    select distinct u.id from usuarios u
    join usuario_roles r on r.usuario_id = u.id and r.rol = ${rol}
    left join usuario_subregiones us on us.usuario_id = u.id
    where u.activo and (${subregionId ?? null}::int is null or us.subregion_id = ${subregionId ?? null} or ${rol} = 'cerco')`)
  return filas.rows.map((r) => r.id)
}
