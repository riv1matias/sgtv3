import { and, eq, gte, inArray, lt, ne, notInArray, sql } from 'drizzle-orm'
import { getDb, schema as s, type Tx } from '@/db'
import { accionesDisponibles, actorDelEstado, ErrorNegocio, exigirAccion, resolverDestino } from '@/domain/flujo/motor'
import type { ContextoFlujo, DefinicionFlujo, TransicionDef } from '@/domain/flujo/tipos'
import { distanciaMetros, subregionPorPunto } from '@/domain/geo'
import { registrarEvento, SISTEMA, type Actor } from '../auditoria'
import { notificar, parametros, siguienteNumero, usuariosDeContratista } from '../comun'
import { flujoPorId, flujoVigente } from '../flujos'
import { actorDe, esNacional, tieneRol, type Usuario } from '../usuarios'
import { guardarArchivo } from '../archivos'

export type Tarea = typeof s.tareas.$inferSelect

export const ESTADOS_ACTIVOS_TAREA = ['PENDIENTE_ETAPA', 'ASIGNADA', 'DEVUELTA', 'ACEPTADA', 'PEDIDO_REASIGNACION', 'EN_EJECUCION', 'EN_ESPERA', 'EJECUTADA', 'EN_CERTIFICACION', 'PEDIDO_CIERRE']
const ESTADOS_ADMITEN_CERTIFICADO = ['EN_EJECUCION', 'EN_ESPERA', 'EJECUTADA', 'EN_CERTIFICACION']

export interface DatosAccion {
  comentario?: string | null
  motivo?: string | null
  contratistaId?: number | null
  lockVersion?: number | null
}

export async function obtenerTarea(id: string, tx: Tx = getDb()) {
  const [t] = await tx.select().from(s.tareas).where(eq(s.tareas.id, id))
  if (!t) throw new ErrorNegocio('La tarea no existe')
  return t
}

/** Control de acceso de lectura */
export function puedeVerTarea(u: Usuario, t: Pick<Tarea, 'contratistaId' | 'subregionId' | 'solicitanteId' | 'supervisorId'>) {
  if (u.tipo === 'contratista') return u.contratistaId != null && u.contratistaId === t.contratistaId
  if (esNacional(u)) return true
  if (t.solicitanteId === u.id || t.supervisorId === u.id || u.supervisados.includes(t.solicitanteId) || u.delegantes.includes(t.solicitanteId)) return true
  return u.subregionIds.includes(t.subregionId)
}

export function contextoTarea(t: Tarea, u: Usuario, def: DefinicionFlujo): ContextoFlujo {
  return {
    estado: t.estado,
    usuario: { id: u.id, roles: u.roles, subregionIds: u.subregionIds, contratistaId: u.contratistaId },
    relaciones: { solicitanteId: t.solicitanteId, supervisorSolicitanteId: t.supervisorId, contratistaId: t.contratistaId, subregionId: t.subregionId },
    hechos: { tipoTrabajo: t.tipoTrabajo, estadoAntesPedido: t.estadoAntesPedido },
    parametros: def.parametros ?? {},
    supervisados: u.supervisados,
    delegantes: u.delegantes,
  }
}

export async function accionesTarea(t: Tarea, u: Usuario) {
  const def = await flujoPorId(t.flujoId)
  return { def, acciones: accionesDisponibles(def, contextoTarea(t, u, def)) }
}

/** Rol con el que se actúa, para la auditoría */
function rolEn(def: DefinicionFlujo, t: TransicionDef, estado: string, ctx: ContextoFlujo): string | null {
  const a = t.actor ?? def.estados.find((e) => e.clave === estado)?.actor
  if (!a) return null
  const c = Array.isArray(a) ? actorDelEstado(def, estado, ctx) : a
  if (!c) return null
  return typeof c === 'object' ? c.pool : c
}

// ─────────────────────────────── Alta ───────────────────────────────

export interface NuevaTarea {
  tipoTrabajo: 'mantenimiento' | 'eventos' | 'obra'
  subtipo?: string | null
  titulo: string
  descripcion?: string | null
  direccion?: string | null
  lat?: number | null
  lng?: number | null
  subregionId?: number | null
  contratistaIds: number[]
  modoSubtareas?: 'simultanea' | 'secuencial'
  imputacionId?: number | null
  urgencia?: boolean
  urgenciaJustificacion?: string | null
  certificadosPrevistos?: number
  fechaTentativa?: string | null
  presupuesto?: string | null
  datosExtra?: Record<string, unknown>
  archivos?: File[]
}

export async function crearTarea(input: NuevaTarea, u: Usuario) {
  if (!tieneRol(u, 'solicitante')) throw new ErrorNegocio('Solo los solicitantes pueden pedir tareas')
  if (!input.titulo?.trim()) throw new ErrorNegocio('El título es obligatorio')
  if (!['mantenimiento', 'eventos', 'obra'].includes(input.tipoTrabajo)) throw new ErrorNegocio('Tipo de trabajo inválido')
  if (input.urgencia && !input.urgenciaJustificacion?.trim()) throw new ErrorNegocio('Una urgencia requiere justificación')
  if (!input.contratistaIds.length) throw new ErrorNegocio('Elegí al menos un contratista')
  if (!input.imputacionId) throw new ErrorNegocio('Definí la imputación (OT de Helix, PEP u orden de controlling)')

  return getDb().transaction(async (tx) => {
    // Subregión por coordenada (polígonos KML); si no cae en ninguno, la elige el solicitante
    let subregionId = input.subregionId ?? null
    if (input.lat != null && input.lng != null) {
      const subs = await tx.select({ id: s.subregiones.id, poligono: s.subregiones.poligono }).from(s.subregiones)
      const porPunto = subregionPorPunto(subs, input.lat, input.lng)
      if (porPunto) subregionId = porPunto.id
    }
    if (!subregionId) throw new ErrorNegocio('La ubicación no cae en ninguna subregión operativa: elegí la subregión')
    if (!u.subregionIds.includes(subregionId) && !esNacional(u)) throw new ErrorNegocio('La subregión de la tarea no está en tu alcance')

    const habilitados = await tx.select({ id: s.contratistaSubregiones.contratistaId }).from(s.contratistaSubregiones)
      .innerJoin(s.contratistas, eq(s.contratistas.id, s.contratistaSubregiones.contratistaId))
      .where(and(eq(s.contratistaSubregiones.subregionId, subregionId), eq(s.contratistas.activo, true), eq(s.contratistas.suspendido, false)))
    const hab = new Set(habilitados.map((h) => h.id))
    for (const c of input.contratistaIds) if (!hab.has(c)) throw new ErrorNegocio('Hay un contratista no habilitado en la subregión de la tarea')

    const [reg] = await tx.select({ codigo: s.regiones.codigo }).from(s.subregiones).innerJoin(s.regiones, eq(s.regiones.id, s.subregiones.regionId)).where(eq(s.subregiones.id, subregionId))
    const flujo = await flujoVigente('tarea', tx)
    const ahora = new Date()
    const creadas: Tarea[] = []
    let padreId: string | null = null
    const multiple = input.contratistaIds.length > 1
    for (const [i, contratistaId] of input.contratistaIds.entries()) {
      const n = await siguienteNumero(tx, `tarea:${reg.codigo}`)
      const pendiente = multiple && input.modoSubtareas === 'secuencial' && i > 0
      const [t]: Tarea[] = await tx.insert(s.tareas).values({
        numero: `T-${reg.codigo}-${String(n).padStart(6, '0')}`,
        tipoTrabajo: input.tipoTrabajo, subtipo: input.subtipo || null, titulo: input.titulo.trim() + (multiple ? ` (etapa ${i + 1})` : ''),
        descripcion: input.descripcion || null, direccion: input.direccion || null, lat: input.lat ?? null, lng: input.lng ?? null,
        subregionId, contratistaId, solicitanteId: u.id, supervisorId: u.supervisorId, imputacionId: input.imputacionId,
        urgencia: !!input.urgencia, urgenciaJustificacion: input.urgencia ? input.urgenciaJustificacion : null,
        certificadosPrevistos: Math.max(1, input.certificadosPrevistos ?? 1), fechaTentativa: input.fechaTentativa || null,
        presupuesto: input.tipoTrabajo === 'obra' && input.presupuesto ? input.presupuesto : null,
        datosExtra: input.datosExtra ?? {}, estado: pendiente ? 'PENDIENTE_ETAPA' : 'ASIGNADA', flujoId: flujo.id,
        tareaPadreId: padreId, modoSubtarea: multiple ? (input.modoSubtareas ?? 'simultanea') : null, ordenSubtarea: multiple ? i + 1 : null,
        asignadaAt: pendiente ? null : ahora,
      }).returning()
      if (i === 0 && multiple) padreId = t.id
      creadas.push(t)
      await registrarEvento(tx, actorDe(u, 'solicitante'), {
        entidad: 'tarea', entidadId: t.id, accion: 'crear', estadoHasta: t.estado,
        cambios: { numero: t.numero, tipoTrabajo: t.tipoTrabajo, contratistaId, imputacionId: t.imputacionId, urgencia: t.urgencia, subregionId },
        comentario: t.urgencia ? `Urgencia: ${t.urgenciaJustificacion}` : null,
      })
      if (!pendiente) await notificar(tx, await usuariosDeContratista(tx, contratistaId), `Nueva tarea ${t.numero}${t.urgencia ? ' (URGENCIA)' : ''}`, t.titulo, `/c/tareas/${t.id}`)
    }
    // Enlaza la primera como padre de sí misma para agrupar
    if (padreId) await tx.update(s.tareas).set({ tareaPadreId: padreId }).where(eq(s.tareas.id, padreId))
    for (const f of input.archivos ?? []) {
      const doc = await guardarArchivo(tx, f, u.id)
      for (const t of creadas) await tx.insert(s.tareaDocumentos).values({ tareaId: t.id, documentoId: doc.id })
    }
    await alertarPosiblesDuplicados(tx, creadas[0], u)
    return creadas[0]
  })
}

/** Alerta al supervisor si otra persona pidió una tarea cercana del mismo tipo (spec 11 A9) */
async function alertarPosiblesDuplicados(tx: Tx, t: Tarea, u: Usuario) {
  if (t.lat == null || t.lng == null) return
  const p = await parametros(tx)
  const desde = new Date(Date.now() - 30 * 86_400_000)
  const cercanas = await tx.select().from(s.tareas).where(and(
    eq(s.tareas.tipoTrabajo, t.tipoTrabajo), ne(s.tareas.solicitanteId, t.solicitanteId), gte(s.tareas.createdAt, desde),
    inArray(s.tareas.estado, ESTADOS_ACTIVOS_TAREA), sql`${s.tareas.lat} is not null`,
  ))
  const cerca = cercanas.filter((c) => distanciaMetros({ lat: t.lat!, lng: t.lng! }, { lat: c.lat!, lng: c.lng! }) <= p.radio_duplicados_metros)
  if (!cerca.length) return
  await tx.insert(s.alertas).values({
    entidad: 'tarea', entidadId: t.id, tipo: 'duplicado_tarea',
    mensaje: `Posible duplicado: ${cerca.length} tarea(s) abierta(s) de otro solicitante a menos de ${p.radio_duplicados_metros} m (${cerca.map((c) => c.numero).join(', ')})`,
    evidencia: { tareas: cerca.map((c) => c.id) },
  })
  await notificar(tx, [u.supervisorId], `Posible tarea duplicada ${t.numero}`, `Revisá si coincide con ${cerca.map((c) => c.numero).join(', ')}`, `/i/tareas/${t.id}`)
}

// ─────────────────────────────── Acciones ───────────────────────────────

export async function ejecutarAccionTarea(tareaId: string, accion: string, datos: DatosAccion, u: Usuario) {
  return getDb().transaction(async (tx) => {
    const [t] = await tx.select().from(s.tareas).where(eq(s.tareas.id, tareaId)).for('update')
    if (!t) throw new ErrorNegocio('La tarea no existe')
    if (datos.lockVersion != null && datos.lockVersion !== t.lockVersion) throw new ErrorNegocio('La tarea cambió mientras la revisabas. Actualizá la página.')
    const def = await flujoPorId(t.flujoId, tx)
    const ctx = contextoTarea(t, u, def)
    const disp = exigirAccion(def, ctx, accion)
    const tr = disp.transicion
    exigirRequisitos(tr, datos, def)
    const destino = resolverDestino(tr, ctx)
    const rol = rolEn(def, tr, t.estado, ctx)
    await aplicarTransicionTarea(tx, t, tr, destino, datos, { ...actorDe(u, rol) } as Actor, disp.enNombreDe ?? null)
    return destino
  })
}

export function exigirRequisitos(tr: TransicionDef, datos: DatosAccion, def: DefinicionFlujo) {
  for (const r of tr.requiere ?? []) {
    if (r === 'comentario' && !datos.comentario?.trim()) throw new ErrorNegocio('El comentario es obligatorio')
    if (r === 'motivo') {
      if (!datos.motivo?.trim()) throw new ErrorNegocio('Elegí un motivo')
      const lista = tr.motivos ? def.motivos?.[tr.motivos] : null
      if (lista && !lista.includes(datos.motivo)) throw new ErrorNegocio('Motivo inválido')
    }
  }
}

async function aplicarTransicionTarea(tx: Tx, t: Tarea, tr: TransicionDef, destino: string, datos: DatosAccion, actor: Actor, enNombreDe: string | null) {
  const cambios: Record<string, unknown> = {}
  const set: Partial<typeof s.tareas.$inferInsert> = { estado: destino, updatedAt: new Date(), lockVersion: t.lockVersion + 1 }
  const extra = { ...(t.datosExtra as Record<string, unknown>) }
  for (const ef of tr.efectos ?? []) {
    switch (ef) {
      case 'cambiar_contratista': {
        const nuevo = await validarContratistaHabilitado(tx, datos.contratistaId, t.subregionId)
        if (nuevo === t.contratistaId && t.estado === 'ASIGNADA') throw new ErrorNegocio('Elegí un contratista distinto')
        cambios.contratistaId = { antes: t.contratistaId, despues: nuevo }
        set.contratistaId = nuevo
        set.asignadaAt = new Date()
        await notificar(tx, await usuariosDeContratista(tx, nuevo), `Nueva tarea ${t.numero}`, t.titulo, `/c/tareas/${t.id}`)
        break
      }
      case 'guardar_reasignacion_pendiente':
        extra.reasignacionPendiente = await validarContratistaHabilitado(tx, datos.contratistaId, t.subregionId)
        cambios.reasignacionPendiente = extra.reasignacionPendiente
        break
      case 'aplicar_reasignacion_pendiente': {
        const nuevo = Number(extra.reasignacionPendiente)
        cambios.contratistaId = { antes: t.contratistaId, despues: nuevo }
        set.contratistaId = nuevo
        set.asignadaAt = new Date()
        delete extra.reasignacionPendiente
        await notificar(tx, await usuariosDeContratista(tx, nuevo), `Nueva tarea ${t.numero}`, t.titulo, `/c/tareas/${t.id}`)
        break
      }
      case 'descartar_reasignacion_pendiente':
        delete extra.reasignacionPendiente
        break
      case 'registrar_causal_espera':
        set.causalEspera = datos.motivo ?? null
        break
      case 'recordar_estado':
        set.estadoAntesPedido = t.estado
        break
      case 'registrar_causal_cierre':
        set.causalCierre = datos.motivo ?? null
        break
      case 'aumentar_certificados_previstos':
        set.certificadosPrevistos = t.certificadosPrevistos + 1
        cambios.certificadosPrevistos = { antes: t.certificadosPrevistos, despues: t.certificadosPrevistos + 1 }
        break
      default:
        throw new Error(`Efecto no implementado: ${ef}`)
    }
  }
  if (destino !== 'EN_ESPERA') set.causalEspera = destino === t.estado ? t.causalEspera : null
  set.datosExtra = extra
  await tx.update(s.tareas).set(set).where(eq(s.tareas.id, t.id))
  await registrarEvento(tx, actor, {
    entidad: 'tarea', entidadId: t.id, accion: tr.accion, estadoDesde: t.estado, estadoHasta: destino,
    cambios: { ...cambios, ...(datos.motivo ? { motivo: datos.motivo } : {}) }, comentario: datos.comentario ?? null, enNombreDe,
  })
  await notificarCambioTarea(tx, t, tr, destino, actor)
  // Tareas secuenciales: al terminar una etapa se habilita la siguiente
  if (t.tareaPadreId && t.modoSubtarea === 'secuencial' && ['EJECUTADA', 'EN_CERTIFICACION', 'CERTIFICADA', 'DESESTIMADA'].includes(destino)) {
    const [sig] = await tx.select().from(s.tareas).where(and(eq(s.tareas.tareaPadreId, t.tareaPadreId), eq(s.tareas.ordenSubtarea, (t.ordenSubtarea ?? 0) + 1), eq(s.tareas.estado, 'PENDIENTE_ETAPA')))
    if (sig) await transicionSistemaTarea(tx, sig, 'habilitar_etapa', `Terminó la etapa anterior (${t.numero})`)
  }
}

async function notificarCambioTarea(tx: Tx, t: Tarea, tr: TransicionDef, destino: string, actor: Actor) {
  const link = `/i/tareas/${t.id}`
  const msg = `${tr.etiqueta} — por ${actor.nombreCompleto}`
  if (['rechazar_tarea', 'vencer_aceptacion', 'pedir_cierre', 'aceptar', 'informar_fin', 'no_liberar', 'liberar'].includes(tr.accion)) {
    await notificar(tx, [t.solicitanteId], `Tarea ${t.numero}: ${tr.etiqueta.toLowerCase()}`, msg, link)
  }
  if (['pedir_reasignacion', 'aprobar_cierre', 'rechazar_cierre', 'desestimar', 'cancelar', 'habilitar_etapa', 'reabrir'].includes(tr.accion)) {
    await notificar(tx, await usuariosDeContratista(tx, t.contratistaId), `Tarea ${t.numero}: ${tr.etiqueta.toLowerCase()}`, msg, `/c/tareas/${t.id}`)
  }
  void destino
}

async function validarContratistaHabilitado(tx: Tx, contratistaId: number | null | undefined, subregionId: number) {
  if (!contratistaId) throw new ErrorNegocio('Elegí el contratista')
  const [h] = await tx.select().from(s.contratistaSubregiones).innerJoin(s.contratistas, eq(s.contratistas.id, s.contratistaSubregiones.contratistaId))
    .where(and(eq(s.contratistaSubregiones.contratistaId, contratistaId), eq(s.contratistaSubregiones.subregionId, subregionId), eq(s.contratistas.activo, true), eq(s.contratistas.suspendido, false)))
  if (!h) throw new ErrorNegocio('El contratista no está habilitado en la subregión de la tarea')
  return contratistaId
}

/** Transiciones que dispara el sistema (vencimientos, certificados) */
export async function transicionSistemaTarea(tx: Tx, t: Tarea, accion: string, comentario?: string) {
  const def = await flujoPorId(t.flujoId, tx)
  const tr = def.transiciones.find((x) => x.accion === accion && x.desde.includes(t.estado))
  if (!tr) return false
  const destino = resolverDestino(tr, contextoTarea(t, { id: 'sistema', roles: [], subregionIds: [] } as unknown as Usuario, def))
  const set: Partial<typeof s.tareas.$inferInsert> = { estado: destino, updatedAt: new Date(), lockVersion: t.lockVersion + 1 }
  if (accion === 'habilitar_etapa') set.asignadaAt = new Date()
  await tx.update(s.tareas).set(set).where(eq(s.tareas.id, t.id))
  await registrarEvento(tx, SISTEMA, { entidad: 'tarea', entidadId: t.id, accion, estadoDesde: t.estado, estadoHasta: destino, comentario: comentario ?? null })
  await notificarCambioTarea(tx, t, tr, destino, SISTEMA)
  return true
}

/** Vencimientos: tareas asignadas sin respuesta vuelven al solicitante (spec 11 A3) */
export async function procesarVencimientos() {
  const p = await parametros()
  const limite = new Date(Date.now() - p.horas_aceptacion * 3_600_000)
  const vencidas = await getDb().select().from(s.tareas).where(and(eq(s.tareas.estado, 'ASIGNADA'), lt(s.tareas.asignadaAt, limite)))
  for (const t of vencidas) {
    await getDb().transaction(async (tx) => {
      const [fresca] = await tx.select().from(s.tareas).where(eq(s.tareas.id, t.id)).for('update')
      if (fresca?.estado === 'ASIGNADA') await transicionSistemaTarea(tx, fresca, 'vencer_aceptacion', `Sin respuesta del contratista en ${p.horas_aceptacion} h`)
    })
  }
  return vencidas.length
}

// ─────────────────────────────── Otras operaciones ───────────────────────────────

/** Cambio de imputación: solicitante (o su supervisor) o Administración, hasta que se registre el consumo */
export async function cambiarImputacion(tareaId: string, imputacionId: number, motivo: string, u: Usuario) {
  return getDb().transaction(async (tx) => {
    const t = await obtenerTarea(tareaId, tx)
    const esResp = t.solicitanteId === u.id || u.supervisados.includes(t.solicitanteId) || u.delegantes.includes(t.solicitanteId)
    if (!esResp && !(tieneRol(u, 'administracion') && u.subregionIds.includes(t.subregionId))) throw new ErrorNegocio('No podés cambiar la imputación de esta tarea')
    if (!motivo?.trim()) throw new ErrorNegocio('Indicá el motivo del cambio')
    const conConsumo = await tx.select({ id: s.consumosSap.id }).from(s.consumosSap).innerJoin(s.certificados, eq(s.certificados.id, s.consumosSap.certificadoId))
      .where(and(eq(s.certificados.tareaId, t.id), notInArray(s.certificados.estado, ['ANULADO', 'ANULADO_REVERTIDO']), eq(s.consumosSap.tipo, 'consumo')))
    if (conConsumo.length) throw new ErrorNegocio('Ya se registró el consumo en SAP con la imputación actual: no se puede cambiar')
    const [imp] = await tx.select().from(s.imputaciones).where(and(eq(s.imputaciones.id, imputacionId), eq(s.imputaciones.activa, true)))
    if (!imp) throw new ErrorNegocio('Imputación inexistente o inactiva')
    await tx.update(s.tareas).set({ imputacionId, updatedAt: new Date(), lockVersion: t.lockVersion + 1 }).where(eq(s.tareas.id, t.id))
    await registrarEvento(tx, actorDe(u, esResp ? 'solicitante' : 'administracion'), {
      entidad: 'tarea', entidadId: t.id, accion: 'cambiar_imputacion', cambios: { imputacionId: { antes: t.imputacionId, despues: imputacionId } }, comentario: motivo,
    })
  })
}

/** Cambio de tipo de trabajo; si ya hay certificados requiere conformidad del contratista (spec 11 A6) */
export async function cambiarTipoTrabajo(tareaId: string, tipo: string, motivo: string, u: Usuario) {
  return getDb().transaction(async (tx) => {
    const t = await obtenerTarea(tareaId, tx)
    if (t.solicitanteId !== u.id && !u.supervisados.includes(t.solicitanteId)) throw new ErrorNegocio('Solo el solicitante puede cambiar el tipo de trabajo')
    if (!['mantenimiento', 'eventos', 'obra'].includes(tipo) || tipo === t.tipoTrabajo) throw new ErrorNegocio('Tipo de trabajo inválido')
    if (!motivo?.trim()) throw new ErrorNegocio('Indicá el motivo')
    const certs = await tx.select({ id: s.certificados.id }).from(s.certificados).where(and(eq(s.certificados.tareaId, t.id), notInArray(s.certificados.estado, ['ANULADO', 'ANULADO_REVERTIDO'])))
    if (certs.length === 0) {
      await tx.update(s.tareas).set({ tipoTrabajo: tipo, updatedAt: new Date(), lockVersion: t.lockVersion + 1 }).where(eq(s.tareas.id, t.id))
      await registrarEvento(tx, actorDe(u, 'solicitante'), { entidad: 'tarea', entidadId: t.id, accion: 'cambiar_tipo', cambios: { tipoTrabajo: { antes: t.tipoTrabajo, despues: tipo } }, comentario: motivo })
      return 'aplicado'
    }
    const extra = { ...(t.datosExtra as Record<string, unknown>), cambioTipoPendiente: { tipo, motivo, por: u.nombreCompleto } }
    await tx.update(s.tareas).set({ datosExtra: extra, lockVersion: t.lockVersion + 1 }).where(eq(s.tareas.id, t.id))
    await registrarEvento(tx, actorDe(u, 'solicitante'), { entidad: 'tarea', entidadId: t.id, accion: 'pedir_cambio_tipo', cambios: { tipoTrabajo: { antes: t.tipoTrabajo, despues: tipo } }, comentario: motivo })
    await notificar(tx, await usuariosDeContratista(tx, t.contratistaId), `Tarea ${t.numero}: cambio de tipo de trabajo`, 'Requiere tu conformidad: cambia la lista de precios aplicable', `/c/tareas/${t.id}`)
    return 'pendiente'
  })
}

export async function responderCambioTipo(tareaId: string, acepta: boolean, u: Usuario) {
  return getDb().transaction(async (tx) => {
    const t = await obtenerTarea(tareaId, tx)
    if (u.contratistaId !== t.contratistaId || !tieneRol(u, 'contratista_responsable')) throw new ErrorNegocio('No autorizado')
    const extra = { ...(t.datosExtra as Record<string, unknown>) }
    const p = extra.cambioTipoPendiente as { tipo: string } | undefined
    if (!p) throw new ErrorNegocio('No hay un cambio pendiente')
    delete extra.cambioTipoPendiente
    await tx.update(s.tareas).set({ datosExtra: extra, ...(acepta ? { tipoTrabajo: p.tipo } : {}), lockVersion: t.lockVersion + 1 }).where(eq(s.tareas.id, t.id))
    await registrarEvento(tx, actorDe(u, 'contratista'), {
      entidad: 'tarea', entidadId: t.id, accion: acepta ? 'conformar_cambio_tipo' : 'rechazar_cambio_tipo', cambios: acepta ? { tipoTrabajo: { antes: t.tipoTrabajo, despues: p.tipo } } : null,
    })
    await notificar(tx, [t.solicitanteId], `Tarea ${t.numero}: cambio de tipo ${acepta ? 'aceptado' : 'rechazado'} por el contratista`, null, `/i/tareas/${t.id}`)
    return acepta
  })
}

export async function enviarMensaje(tareaId: string, texto: string, u: Usuario) {
  if (!texto?.trim()) throw new ErrorNegocio('Escribí un mensaje')
  return getDb().transaction(async (tx) => {
    const t = await obtenerTarea(tareaId, tx)
    if (!puedeVerTarea(u, t)) throw new ErrorNegocio('No autorizado')
    await tx.insert(s.tareaMensajes).values({ tareaId, usuarioId: u.id, texto: texto.trim() })
    const destinatarios = u.tipo === 'contratista' ? [t.solicitanteId] : await usuariosDeContratista(tx, t.contratistaId)
    await notificar(tx, destinatarios, `Mensaje en ${t.numero}`, `${u.nombreCompleto}: ${texto.trim().slice(0, 140)}`, u.tipo === 'contratista' ? `/i/tareas/${t.id}` : `/c/tareas/${t.id}`)
  })
}

/** Bitácora de campo: técnicos y responsables del contratista */
export async function agregarBitacora(tareaId: string, texto: string | null, archivos: File[], u: Usuario) {
  if (!texto?.trim() && !archivos.length) throw new ErrorNegocio('Escribí una nota o adjuntá una foto')
  return getDb().transaction(async (tx) => {
    const t = await obtenerTarea(tareaId, tx)
    if (u.contratistaId !== t.contratistaId) throw new ErrorNegocio('No autorizado')
    if (!['ACEPTADA', 'EN_EJECUCION', 'EN_ESPERA', 'EJECUTADA', 'EN_CERTIFICACION'].includes(t.estado)) throw new ErrorNegocio('La tarea no está en ejecución')
    if (!archivos.length) await tx.insert(s.tareaBitacora).values({ tareaId, usuarioId: u.id, texto: texto?.trim() || null })
    for (const [i, f] of archivos.entries()) {
      const doc = await guardarArchivo(tx, f, u.id, f.type.startsWith('image/') ? 'foto' : 'otro')
      await tx.insert(s.tareaBitacora).values({ tareaId, usuarioId: u.id, texto: i === 0 ? texto?.trim() || null : null, documentoId: doc.id })
    }
    await registrarEvento(tx, actorDe(u, 'contratista'), { entidad: 'tarea', entidadId: t.id, accion: 'bitacora', cambios: { archivos: archivos.length }, comentario: texto?.trim() || null })
  })
}

export function admiteCertificado(t: Tarea) {
  return ESTADOS_ADMITEN_CERTIFICADO.includes(t.estado)
}
