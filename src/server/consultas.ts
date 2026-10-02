import { and, asc, count, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { getDb, schema as s } from '@/db'
import { esNacional, tieneRol, type Usuario } from './usuarios'
import { accionesCertificado } from './servicios/certificados'
import { accionesTarea } from './servicios/tareas'

const db = () => getDb()
export const POR_PAGINA = 25

/** Condición de alcance para tareas (y todo lo que cuelga de ellas) */
export function alcanceTareas(u: Usuario): SQL | undefined {
  if (u.tipo === 'contratista') return eq(s.tareas.contratistaId, u.contratistaId ?? -1)
  if (esNacional(u)) return undefined
  const personas = [u.id, ...u.supervisados, ...u.delegantes]
  return or(
    u.subregionIds.length ? inArray(s.tareas.subregionId, u.subregionIds) : sql`false`,
    inArray(s.tareas.solicitanteId, personas),
  )
}

/** Momento en que el certificado entró a su estado actual (para SLA y antigüedad) */
const desdeEstadoCert = sql<Date>`coalesce((select max(e.ocurrido_en) from eventos e where e.entidad = 'certificado' and e.entidad_id = ${s.certificados.id}::text and e.estado_hasta = ${s.certificados.estado}), ${s.certificados.updatedAt})`
const desdeEstadoTarea = sql<Date>`coalesce((select max(e.ocurrido_en) from eventos e where e.entidad = 'tarea' and e.entidad_id = ${s.tareas.id}::text and e.estado_hasta = ${s.tareas.estado}), ${s.tareas.createdAt})`

const solicitante = alias(s.usuarios, 'solicitante')
const tomador = alias(s.usuarios, 'tomador')

function selCertificado() {
  return db().select({
    id: s.certificados.id, numero: s.certificados.numero, estado: s.certificados.estado, flujoId: s.certificados.flujoId, orden: s.certificados.orden,
    esFinal: s.certificados.esFinal, subtotal: s.certificados.subtotalActual, subtotalFinal: s.certificados.subtotalFinal, periodo: s.certificados.periodo,
    versionActual: s.certificados.versionActual, tomadoPor: s.certificados.tomadoPor, requiereSegunda: s.certificados.requiereSegundaAprobacion,
    tomadoPorNombre: sql<string | null>`${tomador.nombre} || ' ' || ${tomador.apellido}`,
    desde: desdeEstadoCert, tareaId: s.tareas.id, tareaNumero: s.tareas.numero, titulo: s.tareas.titulo, tipoTrabajo: s.tareas.tipoTrabajo,
    urgencia: s.tareas.urgencia, previstos: s.tareas.certificadosPrevistos, subregion: s.subregiones.nombre, subregionId: s.tareas.subregionId,
    contratista: s.contratistas.razonSocial, contratistaId: s.contratistas.id,
    solicitanteNombre: sql<string>`${solicitante.nombre} || ' ' || ${solicitante.apellido}`, solicitanteId: s.tareas.solicitanteId,
    alertasAbiertas: sql<number>`(select count(*)::int from alertas a where a.entidad = 'certificado' and a.entidad_id = ${s.certificados.id}::text and a.estado = 'abierta')`,
  }).from(s.certificados)
    .innerJoin(s.tareas, eq(s.tareas.id, s.certificados.tareaId))
    .innerJoin(s.subregiones, eq(s.subregiones.id, s.tareas.subregionId))
    .innerJoin(s.contratistas, eq(s.contratistas.id, s.certificados.contratistaId))
    .innerJoin(solicitante, eq(solicitante.id, s.tareas.solicitanteId))
    .leftJoin(tomador, eq(tomador.id, s.certificados.tomadoPor))
}
export type FilaCertificado = Awaited<ReturnType<ReturnType<typeof selCertificado>['where']>>[number]

function selTarea() {
  return db().select({
    id: s.tareas.id, numero: s.tareas.numero, titulo: s.tareas.titulo, estado: s.tareas.estado, flujoId: s.tareas.flujoId, tipoTrabajo: s.tareas.tipoTrabajo,
    subtipo: s.tareas.subtipo, urgencia: s.tareas.urgencia, direccion: s.tareas.direccion, createdAt: s.tareas.createdAt, desde: desdeEstadoTarea,
    subregion: s.subregiones.nombre, contratista: s.contratistas.razonSocial, contratistaId: s.tareas.contratistaId,
    solicitanteNombre: sql<string>`${solicitante.nombre} || ' ' || ${solicitante.apellido}`, solicitanteId: s.tareas.solicitanteId,
    previstos: s.tareas.certificadosPrevistos, causalEspera: s.tareas.causalEspera, datosExtra: s.tareas.datosExtra,
  }).from(s.tareas)
    .innerJoin(s.subregiones, eq(s.subregiones.id, s.tareas.subregionId))
    .leftJoin(s.contratistas, eq(s.contratistas.id, s.tareas.contratistaId))
    .innerJoin(solicitante, eq(solicitante.id, s.tareas.solicitanteId))
}
export type FilaTarea = Awaited<ReturnType<ReturnType<typeof selTarea>['where']>>[number]

// ─────────────────────────────── Bandejas ───────────────────────────────

const ESTADOS_PERSONALES = ['VAL_TECNICA', 'REVISION_RECHAZO', 'PEDIDO_RETIRO']

/** Certificados en los que el usuario tiene una acción disponible ahora */
export async function bandejaCertificados(u: Usuario) {
  const personas = [u.id, ...u.supervisados, ...u.delegantes]
  const cond: SQL[] = []
  cond.push(and(inArray(s.certificados.estado, ESTADOS_PERSONALES), inArray(s.tareas.solicitanteId, personas))!)
  // Recuperar mi aprobación
  cond.push(and(inArray(s.certificados.estado, ['APROB_GERENTE', 'VAL_MATERIALES', 'APROB_FINAL']), sql`exists (select 1 from aprobaciones a where a.certificado_id = ${s.certificados.id} and a.vigente and a.usuario_id = ${u.id})`)!)
  if (tieneRol(u, 'gerente')) cond.push(eq(s.certificados.estado, 'APROB_GERENTE'))
  if (tieneRol(u, 'administracion') && u.subregionIds.length) cond.push(and(inArray(s.certificados.estado, ['VAL_MATERIALES', 'PENDIENTE_REVERSA_SAP']), inArray(s.tareas.subregionId, u.subregionIds))!)
  if (tieneRol(u, 'cerco')) cond.push(and(eq(s.certificados.estado, 'APROB_FINAL'), sql`${s.tareas.tipoTrabajo} <> 'obra'`)!)
  if (tieneRol(u, 'adm_obra') && u.subregionIds.length) cond.push(and(eq(s.certificados.estado, 'APROB_FINAL'), eq(s.tareas.tipoTrabajo, 'obra'), inArray(s.tareas.subregionId, u.subregionIds))!)
  if (u.supervisados.length) cond.push(inArray(s.certificados.tomadoPor, u.supervisados))
  const candidatos = await selCertificado().where(or(...cond)).orderBy(asc(desdeEstadoCert)).limit(300)
  const out: Array<FilaCertificado & { acciones: string[]; bloqueo?: string; modo: string; enNombreDe?: string | null }> = []
  const certs = await db().select().from(s.certificados).where(inArray(s.certificados.id, candidatos.map((c) => c.id).concat(['00000000-0000-0000-0000-000000000000'])))
  const tareas = await db().select().from(s.tareas).where(inArray(s.tareas.id, candidatos.map((c) => c.tareaId).concat(['00000000-0000-0000-0000-000000000000'])))
  for (const f of candidatos) {
    const c = certs.find((x) => x.id === f.id)!
    const t = tareas.find((x) => x.id === f.tareaId)!
    const { acciones } = await accionesCertificado(c, t, u)
    const libres = acciones.filter((a) => !a.bloqueo)
    if (!acciones.length) continue
    out.push({ ...f, acciones: [...new Set(libres.map((a) => a.transicion.etiqueta))], bloqueo: libres.length ? undefined : acciones[0].bloqueo, modo: acciones[0].modo, enNombreDe: acciones[0].enNombreDe })
  }
  return out
}

/** Tareas en las que el usuario tiene una acción disponible ahora */
export async function bandejaTareas(u: Usuario, estados: string[]) {
  const personas = [u.id, ...u.supervisados, ...u.delegantes]
  const cond = u.tipo === 'contratista'
    ? and(eq(s.tareas.contratistaId, u.contratistaId ?? -1), inArray(s.tareas.estado, estados))
    : and(inArray(s.tareas.solicitanteId, personas), inArray(s.tareas.estado, estados))
  const filas = await selTarea().where(cond).orderBy(desc(s.tareas.urgencia), asc(desdeEstadoTarea)).limit(200)
  const tareas = await db().select().from(s.tareas).where(inArray(s.tareas.id, filas.map((f) => f.id).concat(['00000000-0000-0000-0000-000000000000'])))
  const out: Array<FilaTarea & { acciones: string[] }> = []
  for (const f of filas) {
    const t = tareas.find((x) => x.id === f.id)!
    const { acciones } = await accionesTarea(t, u)
    if (acciones.length) out.push({ ...f, acciones: acciones.map((a) => a.transicion.etiqueta) })
  }
  return out
}

export async function alertasDeEquipo(u: Usuario) {
  if (!u.supervisados.length) return []
  return db().select({ a: s.alertas, numero: s.tareas.numero, titulo: s.tareas.titulo }).from(s.alertas)
    .innerJoin(s.tareas, sql`${s.tareas.id}::text = ${s.alertas.entidadId}`)
    .where(and(eq(s.alertas.entidad, 'tarea'), eq(s.alertas.estado, 'abierta'), inArray(s.tareas.solicitanteId, [u.id, ...u.supervisados])))
}

// ─────────────────────────────── Listados ───────────────────────────────

export interface FiltrosLista { q?: string; estado?: string; tipo?: string; contratista?: string; subregion?: string; pagina?: number; urgencia?: string }

export async function listarTareas(u: Usuario, f: FiltrosLista) {
  const conds: Array<SQL | undefined> = [alcanceTareas(u)]
  if (f.q) conds.push(or(ilike(s.tareas.numero, `%${f.q}%`), ilike(s.tareas.titulo, `%${f.q}%`), ilike(s.tareas.direccion, `%${f.q}%`)))
  if (f.estado === 'activas') conds.push(sql`${s.tareas.estado} not in ('CERTIFICADA','DESESTIMADA','CANCELADA')`)
  else if (f.estado) conds.push(eq(s.tareas.estado, f.estado))
  if (f.tipo) conds.push(eq(s.tareas.tipoTrabajo, f.tipo))
  if (f.contratista) conds.push(eq(s.tareas.contratistaId, Number(f.contratista)))
  if (f.subregion) conds.push(eq(s.tareas.subregionId, Number(f.subregion)))
  if (f.urgencia === '1') conds.push(eq(s.tareas.urgencia, true))
  const w = and(...conds)
  const pagina = Math.max(1, f.pagina ?? 1)
  const [filas, [{ n }]] = await Promise.all([
    selTarea().where(w).orderBy(desc(s.tareas.createdAt)).limit(POR_PAGINA).offset((pagina - 1) * POR_PAGINA),
    db().select({ n: count() }).from(s.tareas).where(w),
  ])
  return { filas, total: n, pagina }
}

export async function listarCertificados(u: Usuario, f: FiltrosLista & { liquidacion?: string }) {
  const conds: Array<SQL | undefined> = [alcanceTareas(u)]
  if (f.q) conds.push(or(ilike(s.certificados.numero, `%${f.q}%`), ilike(s.tareas.numero, `%${f.q}%`), ilike(s.tareas.titulo, `%${f.q}%`)))
  if (f.estado === 'en_curso') conds.push(sql`${s.certificados.estado} not in ('CERRADO','ANULADO','ANULADO_REVERTIDO','BORRADOR')`)
  else if (f.estado) conds.push(eq(s.certificados.estado, f.estado))
  if (f.tipo) conds.push(eq(s.tareas.tipoTrabajo, f.tipo))
  if (f.contratista) conds.push(eq(s.certificados.contratistaId, Number(f.contratista)))
  if (f.subregion) conds.push(eq(s.tareas.subregionId, Number(f.subregion)))
  // El personal interno no ve borradores de los contratistas
  if (u.tipo === 'interno') conds.push(sql`not (${s.certificados.estado} = 'BORRADOR' and ${s.certificados.primeraEmisionAt} is null)`)
  const w = and(...conds)
  const pagina = Math.max(1, f.pagina ?? 1)
  const [filas, [{ n }]] = await Promise.all([
    selCertificado().where(w).orderBy(desc(s.certificados.updatedAt)).limit(POR_PAGINA).offset((pagina - 1) * POR_PAGINA),
    db().select({ n: count() }).from(s.certificados).innerJoin(s.tareas, eq(s.tareas.id, s.certificados.tareaId)).where(w),
  ])
  return { filas, total: n, pagina }
}

export async function certificadosDeTarea(tareaId: string) {
  return selCertificado().where(eq(s.certificados.tareaId, tareaId)).orderBy(asc(s.certificados.orden))
}

export async function colaMateriales(u: Usuario) {
  const alc = u.subregionIds.length ? inArray(s.tareas.subregionId, u.subregionIds) : sql`false`
  const [validacion, rebotes, reversas] = await Promise.all([
    selCertificado().where(and(alc, eq(s.certificados.estado, 'VAL_MATERIALES'))).orderBy(asc(desdeEstadoCert)),
    selCertificado().where(and(alc, eq(s.certificados.estado, 'REBOTE_MATERIALES'))).orderBy(asc(desdeEstadoCert)),
    selCertificado().where(and(alc, eq(s.certificados.estado, 'PENDIENTE_REVERSA_SAP'))).orderBy(asc(desdeEstadoCert)),
  ])
  return { validacion, rebotes, reversas }
}

// ─────────────────────────────── Detalle de tarea ───────────────────────────────

export async function detalleTarea(id: string) {
  const d = db()
  const [t] = await d.select().from(s.tareas).where(eq(s.tareas.id, id))
  if (!t) return null
  const personas = await d.select({ id: s.usuarios.id, nombre: s.usuarios.nombre, apellido: s.usuarios.apellido, cargo: s.usuarios.cargo }).from(s.usuarios)
    .where(inArray(s.usuarios.id, [t.solicitanteId, t.supervisorId ?? t.solicitanteId]))
  const nombre = (x: string | null) => { const p = personas.find((q) => q.id === x); return p ? `${p.nombre} ${p.apellido}` : '—' }
  const [[sub], [contr], [imp], docs, bitacora, mensajes, alertas, hermanas] = await Promise.all([
    d.select({ s: s.subregiones, r: s.regiones }).from(s.subregiones).innerJoin(s.regiones, eq(s.regiones.id, s.subregiones.regionId)).where(eq(s.subregiones.id, t.subregionId)),
    t.contratistaId ? d.select().from(s.contratistas).where(eq(s.contratistas.id, t.contratistaId)) : Promise.resolve([]),
    t.imputacionId ? d.select().from(s.imputaciones).where(eq(s.imputaciones.id, t.imputacionId)) : Promise.resolve([]),
    d.select({ doc: s.documentos }).from(s.tareaDocumentos).innerJoin(s.documentos, eq(s.documentos.id, s.tareaDocumentos.documentoId)).where(eq(s.tareaDocumentos.tareaId, id)),
    d.select({ b: s.tareaBitacora, doc: s.documentos, nombre: s.usuarios.nombre, apellido: s.usuarios.apellido }).from(s.tareaBitacora)
      .leftJoin(s.documentos, eq(s.documentos.id, s.tareaBitacora.documentoId)).innerJoin(s.usuarios, eq(s.usuarios.id, s.tareaBitacora.usuarioId))
      .where(eq(s.tareaBitacora.tareaId, id)).orderBy(desc(s.tareaBitacora.id)),
    d.select({ m: s.tareaMensajes, nombre: s.usuarios.nombre, apellido: s.usuarios.apellido, tipo: s.usuarios.tipo }).from(s.tareaMensajes)
      .innerJoin(s.usuarios, eq(s.usuarios.id, s.tareaMensajes.usuarioId)).where(eq(s.tareaMensajes.tareaId, id)).orderBy(asc(s.tareaMensajes.id)),
    d.select().from(s.alertas).where(and(eq(s.alertas.entidad, 'tarea'), eq(s.alertas.entidadId, id))),
    t.tareaPadreId ? d.select({ id: s.tareas.id, numero: s.tareas.numero, estado: s.tareas.estado, orden: s.tareas.ordenSubtarea, contratista: s.contratistas.razonSocial })
      .from(s.tareas).leftJoin(s.contratistas, eq(s.contratistas.id, s.tareas.contratistaId)).where(eq(s.tareas.tareaPadreId, t.tareaPadreId)).orderBy(asc(s.tareas.ordenSubtarea)) : Promise.resolve([]),
  ])
  const tecnicoId = (t.datosExtra as Record<string, unknown>).tecnicoId as string | undefined
  const [tecnico] = tecnicoId ? await d.select().from(s.usuarios).where(eq(s.usuarios.id, tecnicoId)) : []
  return {
    t, subregion: sub.s, region: sub.r, contratista: contr ?? null, imputacion: imp ?? null, documentos: docs.map((x) => x.doc), bitacora, mensajes, alertas, hermanas,
    solicitanteNombre: nombre(t.solicitanteId), supervisorNombre: t.supervisorId ? nombre(t.supervisorId) : '—', tecnico: tecnico ?? null,
  }
}

// ─────────────────────────────── Maestros para formularios ───────────────────────────────

export async function maestros(u: Usuario) {
  const d = db()
  const [subregiones, contratistas, habilitaciones, imputaciones] = await Promise.all([
    d.select({ id: s.subregiones.id, nombre: s.subregiones.nombre, region: s.regiones.nombre, conPoligono: sql<boolean>`${s.subregiones.poligono} is not null` }).from(s.subregiones)
      .innerJoin(s.regiones, eq(s.regiones.id, s.subregiones.regionId)).orderBy(asc(s.regiones.nombre), asc(s.subregiones.nombre)),
    d.select().from(s.contratistas).where(eq(s.contratistas.activo, true)).orderBy(asc(s.contratistas.razonSocial)),
    d.select().from(s.contratistaSubregiones),
    d.select().from(s.imputaciones).where(eq(s.imputaciones.activa, true)).orderBy(asc(s.imputaciones.tipo), asc(s.imputaciones.numero)),
  ])
  const misSubregiones = esNacional(u) ? subregiones : subregiones.filter((x) => u.subregionIds.includes(x.id))
  return { subregiones, misSubregiones, contratistas, habilitaciones, imputaciones }
}

export async function notificacionesDe(u: Usuario, limite = 50) {
  return db().select().from(s.notificaciones).where(eq(s.notificaciones.usuarioId, u.id)).orderBy(desc(s.notificaciones.id)).limit(limite)
}
export async function noLeidas(u: Usuario) {
  const [r] = await db().select({ n: count() }).from(s.notificaciones).where(and(eq(s.notificaciones.usuarioId, u.id), eq(s.notificaciones.leida, false)))
  return r.n
}

// ─────────────────────────────── Stock proyectado ───────────────────────────────

export async function stockProyectado(contratistaId: number) {
  const d = db()
  const [carga] = await d.select().from(s.stockCargas).where(eq(s.stockCargas.contratistaId, contratistaId)).orderBy(desc(s.stockCargas.id)).limit(1)
  // Certificado y aún no consumido: versiones emitidas en estados previos al registro del consumo
  const comprometido = await d.execute<{ material_id: number; almacen: string; cantidad: string }>(sql`
    select i.material_id, coalesce(c.almacen, '') as almacen, sum(i.cantidad) as cantidad
    from certificado_items i join certificados c on c.id = i.certificado_id and i.version = c.version_actual
    where c.contratista_id = ${contratistaId} and i.tipo = 'material'
      and c.estado in ('VAL_TECNICA','PEDIDO_RETIRO','APROB_GERENTE','VAL_MATERIALES','REBOTE_MATERIALES','OBSERVADO','REVISION_RECHAZO')
      and not exists (select 1 from consumos_sap x where x.certificado_id = c.id and x.version = c.version_actual and x.tipo = 'consumo')
    group by i.material_id, c.almacen`)
  const items = carga ? await d.select({ i: s.stockItems, m: s.materiales }).from(s.stockItems).innerJoin(s.materiales, eq(s.materiales.id, s.stockItems.materialId)).where(eq(s.stockItems.cargaId, carga.id)) : []
  const [contr] = await d.select().from(s.contratistas).where(eq(s.contratistas.id, contratistaId))
  const almacenDe = (a: string) => (a === contr?.almacenProyecto ? 'proyecto' : 'mantenimiento')
  const comp = new Map<string, number>()
  for (const r of comprometido.rows) comp.set(`${almacenDe(r.almacen)}:${r.material_id}`, (comp.get(`${almacenDe(r.almacen)}:${r.material_id}`) ?? 0) + Number(r.cantidad))
  const filas = items.map(({ i, m }) => {
    const c = comp.get(`${i.almacen}:${m.id}`) ?? 0
    return { almacen: i.almacen, codigo: m.codigoSap, descripcion: m.descripcion, unidad: m.unidad, stock: Number(i.cantidad), comprometido: c, proyectado: Number(i.cantidad) - c }
  })
  // Materiales comprometidos que no figuran en la foto de stock
  const matIds = new Set(items.map((x) => `${x.i.almacen}:${x.m.id}`))
  const faltantes = [...comp.entries()].filter(([k]) => !matIds.has(k))
  if (faltantes.length) {
    const mats = await d.select().from(s.materiales).where(inArray(s.materiales.id, faltantes.map(([k]) => Number(k.split(':')[1]))))
    for (const [k, c] of faltantes) {
      const m = mats.find((x) => x.id === Number(k.split(':')[1]))!
      filas.push({ almacen: k.split(':')[0], codigo: m.codigoSap, descripcion: m.descripcion, unidad: m.unidad, stock: 0, comprometido: c, proyectado: -c })
    }
  }
  return { carga, filas: filas.sort((a, b) => a.almacen.localeCompare(b.almacen) || a.codigo.localeCompare(b.codigo)), contratista: contr }
}

export async function liquidacionesDe(u: Usuario) {
  const w = u.tipo === 'contratista' ? eq(s.liquidaciones.contratistaId, u.contratistaId ?? -1) : undefined
  return db().select({ l: s.liquidaciones, p: s.periodos, c: s.contratistas }).from(s.liquidaciones)
    .innerJoin(s.periodos, eq(s.periodos.id, s.liquidaciones.periodoId)).innerJoin(s.contratistas, eq(s.contratistas.id, s.liquidaciones.contratistaId))
    .where(w).orderBy(desc(s.liquidaciones.id))
}

export async function ajustesPendientes(contratistaId?: number) {
  return db().select({ a: s.ajustes, c: s.contratistas }).from(s.ajustes).innerJoin(s.contratistas, eq(s.contratistas.id, s.ajustes.contratistaId))
    .where(and(isNull(s.ajustes.liquidacionId), contratistaId ? eq(s.ajustes.contratistaId, contratistaId) : undefined)).orderBy(desc(s.ajustes.id))
}
