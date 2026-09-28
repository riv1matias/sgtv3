import { and, asc, desc, eq, inArray, ne, notInArray, sql } from 'drizzle-orm'
import { getDb, schema as s, type Tx } from '@/db'
import { accionesDisponibles, coincideActor, ErrorNegocio, estadoDef, exigirAccion, resolverDestino } from '@/domain/flujo/motor'
import type { ContextoFlujo, DefinicionFlujo, TransicionDef } from '@/domain/flujo/tipos'
import { validarEmision, soloMaterialesCambiaron, type Hallazgo, type ItemEntrada } from '@/domain/validaciones'
import { listaPara } from '@/domain/precios'
import { dec } from '@/domain/dinero'
import { hoy, periodoActual } from '@/lib/fechas'
import { registrarEvento, SISTEMA, type Actor } from '../auditoria'
import { notificar, parametros, siguienteNumero, usuariosConRol, usuariosDeContratista } from '../comun'
import { flujoPorId, flujoVigente } from '../flujos'
import { actorDe, tieneRol, type Usuario } from '../usuarios'
import { guardarArchivo } from '../archivos'
import { leerDetalleCodigos, leerLibro } from '../excel'
import { admiteCertificado, exigirRequisitos, puedeVerTarea, transicionSistemaTarea, type Tarea } from './tareas'
import { precioALaFecha, valorizarCertificado, ESTADOS_CONGELADOS } from './precios'

export type Certificado = typeof s.certificados.$inferSelect
export const ESTADOS_EDITABLES = ['BORRADOR', 'OBSERVADO', 'REBOTE_MATERIALES']

export async function obtenerCertificado(id: string, tx: Tx = getDb()) {
  const [c] = await tx.select().from(s.certificados).where(eq(s.certificados.id, id))
  if (!c) throw new ErrorNegocio('El certificado no existe')
  const [t] = await tx.select().from(s.tareas).where(eq(s.tareas.id, c.tareaId))
  return { cert: c, tarea: t }
}

export function puedeVerCertificado(u: Usuario, c: Certificado, t: Tarea) {
  if (u.tipo === 'contratista') return u.contratistaId === c.contratistaId
  return puedeVerTarea(u, t)
}

// ─────────────────────────────── Contexto del motor ───────────────────────────────

async function hechosCertificado(tx: Tx, c: Certificado, t: Tarea) {
  const [itemsMat] = await tx.select({ n: sql<number>`count(*)::int` }).from(s.certificadoItems)
    .where(and(eq(s.certificadoItems.certificadoId, c.id), eq(s.certificadoItems.version, c.versionActual), ne(s.certificadoItems.tipo, 'mo')))
  const consumos = await tx.select({ tipo: s.consumosSap.tipo }).from(s.consumosSap).where(eq(s.consumosSap.certificadoId, c.id))
  const tieneConsumo = consumos.some((x) => x.tipo === 'consumo' || x.tipo === 'ingreso_recuperados') && !consumos.some((x) => x.tipo === 'reversa')
  const aprob = await tx.select().from(s.aprobaciones)
    .where(and(eq(s.aprobaciones.certificadoId, c.id), eq(s.aprobaciones.vigente, true), eq(s.aprobaciones.accion, 'aprobar')))
    .orderBy(desc(s.aprobaciones.id))
  return {
    hechos: {
      tipoTrabajo: t.tipoTrabajo,
      requiereSegundaAprobacion: c.requiereSegundaAprobacion,
      tieneMateriales: itemsMat.n > 0,
      tieneConsumoRegistrado: tieneConsumo,
      pasoOrigen: c.pasoOrigen,
      ultimoAprobadorId: aprob[0]?.usuarioId,
      pasoAnterior: aprob[0]?.paso,
      estadoAntesPedido: c.estadoAntesPedido,
    },
    aprobadoresPrevios: [...new Set(aprob.map((a) => a.usuarioId))],
    ultimaAprobacionId: aprob[0]?.id ?? null,
  }
}

async function contexto(tx: Tx, c: Certificado, t: Tarea, u: Usuario, def: DefinicionFlujo): Promise<ContextoFlujo & { ultimaAprobacionId: number | null }> {
  const h = await hechosCertificado(tx, c, t)
  let tomadoPorNombre: string | null = null
  if (c.tomadoPor) {
    const [x] = await tx.select({ n: s.usuarios.nombre, a: s.usuarios.apellido }).from(s.usuarios).where(eq(s.usuarios.id, c.tomadoPor))
    tomadoPorNombre = x ? `${x.n} ${x.a}` : null
  }
  return {
    estado: c.estado,
    usuario: { id: u.id, roles: u.roles, subregionIds: u.subregionIds, contratistaId: u.contratistaId },
    relaciones: { solicitanteId: t.solicitanteId, supervisorSolicitanteId: t.supervisorId, contratistaId: c.contratistaId, subregionId: t.subregionId, tomadoPor: c.tomadoPor, tomadoPorNombre },
    hechos: h.hechos,
    parametros: def.parametros ?? {},
    aprobadoresPrevios: h.aprobadoresPrevios,
    supervisados: u.supervisados,
    delegantes: u.delegantes,
    ultimaAprobacionId: h.ultimaAprobacionId,
  }
}

export async function accionesCertificado(c: Certificado, t: Tarea, u: Usuario) {
  const db = getDb()
  const def = await flujoPorId(c.flujoId, db)
  const ctx = await contexto(db, c, t, u, def)
  const acciones = accionesDisponibles(def, ctx)
  const actorEstado = def.estados.find((e) => e.clave === c.estado)?.actor
  const puedeTomar = !!actorEstado && !c.tomadoPor && ['VAL_TECNICA', 'VAL_MATERIALES', 'APROB_FINAL', 'PENDIENTE_REVERSA_SAP'].includes(c.estado)
    && !!coincideActor(actorEstado, { ...ctx, relaciones: { ...ctx.relaciones, tomadoPor: null } })
  const puedeSoltar = !!c.tomadoPor && (c.tomadoPor === u.id || u.supervisados.includes(c.tomadoPor))
  return { def, acciones, puedeTomar, puedeSoltar }
}

function rolEnEstado(def: DefinicionFlujo, tr: TransicionDef, estado: string, ctx: ContextoFlujo): string | null {
  const a = tr.actor ?? estadoDef(def, estado).actor
  if (!a) return null
  if (Array.isArray(a)) {
    for (const op of a) {
      const ok = !op.si || (typeof op.si === 'object' && 'tipo_trabajo_en' in op.si ? op.si.tipo_trabajo_en.includes(String(ctx.hechos.tipoTrabajo)) : true)
      if (ok) return op.pool ?? op.actor ?? null
    }
    return null
  }
  return typeof a === 'object' ? a.pool : a
}

// ─────────────────────────────── Alta y borrador ───────────────────────────────

export async function crearCertificado(tareaId: string, u: Usuario) {
  return getDb().transaction(async (tx) => {
    const [t] = await tx.select().from(s.tareas).where(eq(s.tareas.id, tareaId)).for('update')
    if (!t) throw new ErrorNegocio('La tarea no existe')
    if (u.contratistaId !== t.contratistaId || !tieneRol(u, 'contratista_responsable')) throw new ErrorNegocio('Solo el responsable del contratista asignado puede certificar')
    if (!admiteCertificado(t)) throw new ErrorNegocio('La tarea tiene que estar en ejecución o ejecutada para certificar')
    const existentes = await tx.select().from(s.certificados).where(and(eq(s.certificados.tareaId, t.id), notInArray(s.certificados.estado, ['ANULADO', 'ANULADO_REVERTIDO'])))
    if (existentes.some((c) => ESTADOS_EDITABLES.includes(c.estado) && c.estado === 'BORRADOR')) throw new ErrorNegocio('Ya hay un certificado en borrador para esta tarea')
    if (existentes.length >= t.certificadosPrevistos) throw new ErrorNegocio(`La tarea prevé ${t.certificadosPrevistos} certificado(s) y ya fueron emitidos. Pedile al solicitante que amplíe la cantidad`)
    const [contr] = await tx.select().from(s.contratistas).where(eq(s.contratistas.id, t.contratistaId!))
    const [imp] = t.imputacionId ? await tx.select().from(s.imputaciones).where(eq(s.imputaciones.id, t.imputacionId)) : []
    const orden = existentes.length + 1
    const n = await siguienteNumero(tx, `cert:${new Date().getFullYear()}`)
    const flujo = await flujoVigente('certificado', tx)
    const [c] = await tx.insert(s.certificados).values({
      numero: `CERT-${new Date().getFullYear()}-${String(n).padStart(6, '0')}`,
      tareaId: t.id, contratistaId: t.contratistaId!, orden, esFinal: orden >= t.certificadosPrevistos, estado: 'BORRADOR', flujoId: flujo.id,
      versionActual: 1, periodo: periodoActual(), centro: contr?.centroSap ?? null,
      almacen: imp?.tipo === 'pep' ? contr?.almacenProyecto : contr?.almacenMantenimiento,
    }).returning()
    await tx.insert(s.certificadoVersiones).values({ certificadoId: c.id, version: 1, estado: 'borrador' })
    await registrarEvento(tx, actorDe(u, 'contratista'), { entidad: 'certificado', entidadId: c.id, accion: 'crear', estadoHasta: 'BORRADOR', cambios: { numero: c.numero, tareaId: t.id, orden } })
    return c
  })
}

export interface ItemBorrador {
  tipo: 'mo' | 'material' | 'recuperado'
  codigoMoId?: number | null
  materialId?: number | null
  cantidad?: string | null
  importe?: string | null
  justificacion?: string | null
  estadoRecuperado?: string | null
  observacion?: string | null
  facturaNumero?: string | null
  facturaCuit?: string | null
  facturaFecha?: string | null
  facturaImporte?: string | null
  facturaDocumentoId?: string | null
}

export interface Borrador {
  periodo?: string | null
  fechaEjecDesde?: string | null
  fechaEjecHasta?: string | null
  centro?: string | null
  almacen?: string | null
  comentario?: string | null
  esFinal?: boolean
  items: ItemBorrador[]
}

function numeroValido(v: string | null | undefined) {
  if (v == null || v === '') return null
  try { dec(v); return String(v).replace(',', '.') } catch { throw new ErrorNegocio(`Número inválido: ${v}`) }
}

async function exigirEditable(tx: Tx, certId: string, u: Usuario) {
  const [c] = await tx.select().from(s.certificados).where(eq(s.certificados.id, certId)).for('update')
  if (!c) throw new ErrorNegocio('El certificado no existe')
  if (u.contratistaId !== c.contratistaId || !tieneRol(u, 'contratista_responsable')) throw new ErrorNegocio('No autorizado')
  if (!ESTADOS_EDITABLES.includes(c.estado)) throw new ErrorNegocio('El certificado no está en edición')
  const [t] = await tx.select().from(s.tareas).where(eq(s.tareas.id, c.tareaId))
  return { c, t }
}

export async function guardarBorrador(certId: string, b: Borrador, u: Usuario) {
  return getDb().transaction(async (tx) => {
    const { c, t } = await exigirEditable(tx, certId, u)
    let items = b.items
    if (c.estado === 'REBOTE_MATERIALES') {
      // En un rebote solo se corrigen materiales: la mano de obra se conserva tal cual
      const mo = await tx.select().from(s.certificadoItems).where(and(eq(s.certificadoItems.certificadoId, c.id), eq(s.certificadoItems.version, c.versionActual), eq(s.certificadoItems.tipo, 'mo')))
      items = [...mo.map((m) => ({ ...m, tipo: 'mo' as const })), ...b.items.filter((i) => i.tipo !== 'mo')]
    }
    const codIds = items.map((i) => i.codigoMoId).filter((x): x is number => !!x)
    const codigos = codIds.length ? await tx.select().from(s.codigosMo).where(inArray(s.codigosMo.id, codIds)) : []
    const porId = new Map(codigos.map((x) => [x.id, x]))
    await tx.delete(s.certificadoItems).where(and(eq(s.certificadoItems.certificadoId, c.id), eq(s.certificadoItems.version, c.versionActual)))
    const filas = items.map((i, orden) => {
      if (i.tipo === 'mo' && (!i.codigoMoId || !porId.has(i.codigoMoId))) throw new ErrorNegocio('Hay un ítem de mano de obra sin código válido')
      if (i.tipo !== 'mo' && !i.materialId) throw new ErrorNegocio('Hay un material sin código válido')
      const abierto = i.tipo === 'mo' && porId.get(i.codigoMoId!)!.montoAbierto
      return {
        certificadoId: c.id, version: c.versionActual, tipo: i.tipo, orden,
        codigoMoId: i.tipo === 'mo' ? i.codigoMoId : null, materialId: i.tipo !== 'mo' ? i.materialId : null,
        cantidad: abierto ? '1' : numeroValido(i.cantidad), importe: abierto ? numeroValido(i.importe) : null,
        justificacion: i.justificacion?.trim() || null, estadoRecuperado: i.tipo === 'recuperado' ? i.estadoRecuperado || 'utilizable' : null,
        observacion: i.observacion?.trim() || null,
        facturaNumero: i.facturaNumero || null, facturaCuit: i.facturaCuit || null, facturaFecha: i.facturaFecha || null,
        facturaImporte: numeroValido(i.facturaImporte), facturaDocumentoId: i.facturaDocumentoId || null,
      }
    })
    if (filas.length) await tx.insert(s.certificadoItems).values(filas)
    const [tareaRef] = await tx.select().from(s.tareas).where(eq(s.tareas.id, t.id))
    const [actual] = await tx.update(s.certificados).set({
      periodo: b.periodo || c.periodo, fechaEjecDesde: b.fechaEjecDesde || null, fechaEjecHasta: b.fechaEjecHasta || null,
      centro: b.centro ?? c.centro, almacen: b.almacen ?? c.almacen, comentario: b.comentario ?? null,
      esFinal: b.esFinal ?? c.esFinal, updatedAt: new Date(),
    }).where(eq(s.certificados.id, c.id)).returning()
    const v = await valorizarCertificado(tx, actual, tareaRef.tipoTrabajo)
    await tx.update(s.certificados).set({ subtotalActual: v.subtotal, lpuActualId: v.lpuId }).where(eq(s.certificados.id, c.id))
    await registrarEvento(tx, actorDe(u, 'contratista'), {
      entidad: 'certificado', entidadId: c.id, accion: 'guardar_borrador', cambios: { version: c.versionActual, items: filas.length, subtotal: v.subtotal },
    })
    return v
  })
}

export async function adjuntarDocumentos(certId: string, archivos: File[], tipo: string, u: Usuario) {
  if (!archivos.length) throw new ErrorNegocio('Elegí al menos un archivo')
  return getDb().transaction(async (tx) => {
    const { c } = await exigirEditable(tx, certId, u)
    for (const f of archivos) {
      const doc = await guardarArchivo(tx, f, u.id, tipo === 'auto' ? (f.type.startsWith('image/') ? 'foto' : 'otro') : tipo)
      await tx.insert(s.certificadoDocumentos).values({ certificadoId: c.id, version: c.versionActual, documentoId: doc.id }).onConflictDoNothing()
    }
    await registrarEvento(tx, actorDe(u, 'contratista'), { entidad: 'certificado', entidadId: c.id, accion: 'adjuntar', cambios: { archivos: archivos.map((a) => a.name) } })
  })
}

/** Factura de terceros de un ítem de recursos solicitados */
export async function subirFacturaTercero(certId: string, archivo: File, u: Usuario) {
  return getDb().transaction(async (tx) => {
    await exigirEditable(tx, certId, u)
    const doc = await guardarArchivo(tx, archivo, u.id, 'factura')
    return doc.id
  })
}

export async function importarDeBitacora(certId: string, documentoIds: string[], u: Usuario) {
  return getDb().transaction(async (tx) => {
    const { c } = await exigirEditable(tx, certId, u)
    const validos = await tx.select({ id: s.tareaBitacora.documentoId }).from(s.tareaBitacora)
      .where(and(eq(s.tareaBitacora.tareaId, c.tareaId), inArray(s.tareaBitacora.documentoId, documentoIds)))
    for (const v of validos) if (v.id) await tx.insert(s.certificadoDocumentos).values({ certificadoId: c.id, version: c.versionActual, documentoId: v.id }).onConflictDoNothing()
    await registrarEvento(tx, actorDe(u, 'contratista'), { entidad: 'certificado', entidadId: c.id, accion: 'importar_bitacora', cambios: { documentos: validos.length } })
  })
}

export async function quitarDocumento(certId: string, documentoId: string, u: Usuario) {
  return getDb().transaction(async (tx) => {
    const { c } = await exigirEditable(tx, certId, u)
    await tx.delete(s.certificadoDocumentos).where(and(eq(s.certificadoDocumentos.certificadoId, c.id), eq(s.certificadoDocumentos.version, c.versionActual), eq(s.certificadoDocumentos.documentoId, documentoId)))
    await registrarEvento(tx, actorDe(u, 'contratista'), { entidad: 'certificado', entidadId: c.id, accion: 'quitar_documento', cambios: { documentoId } })
  })
}

// ─────────────────────────────── Validación de emisión ───────────────────────────────

async function validarParaEmitir(tx: Tx, c: Certificado, t: Tarea) {
  const p = await parametros(tx)
  const items = await tx.select().from(s.certificadoItems).where(and(eq(s.certificadoItems.certificadoId, c.id), eq(s.certificadoItems.version, c.versionActual))).orderBy(asc(s.certificadoItems.orden))
  const codIds = [...new Set(items.map((i) => i.codigoMoId).filter((x): x is number => !!x))]
  const matIds = [...new Set(items.map((i) => i.materialId).filter((x): x is number => !!x))]
  // Consultas secuenciales: dentro de una transacción se comparte una sola conexión
  const codigos = codIds.length ? await tx.select().from(s.codigosMo).where(inArray(s.codigosMo.id, codIds)) : []
  const mats = matIds.length ? await tx.select().from(s.materiales).where(inArray(s.materiales.id, matIds)) : []
  const reglas = codIds.length ? await tx.select().from(s.reglasCodigo).where(and(eq(s.reglasCodigo.activa, true), inArray(s.reglasCodigo.codigoMoId, codIds))) : []
  const docs = await tx.select({ id: s.documentos.id, sha: s.documentos.sha256, nombre: s.documentos.nombre }).from(s.certificadoDocumentos)
    .innerJoin(s.documentos, eq(s.documentos.id, s.certificadoDocumentos.documentoId))
    .where(and(eq(s.certificadoDocumentos.certificadoId, c.id), eq(s.certificadoDocumentos.version, c.versionActual)))
  const precios = await precioALaFecha(tx, listaPara(t.tipoTrabajo), hoy())
  const r = validarEmision({
    items: items as ItemEntrada[],
    codigos: new Map(codigos.map((x) => [x.id, x])),
    materiales: new Map(mats.map((x) => [x.id, x])),
    reglas: reglas,
    tarea: { urgencia: t.urgencia, tipoTrabajo: t.tipoTrabajo, imputacionId: t.imputacionId },
    cabecera: c,
    cantidadDocumentos: docs.length,
    tienePrecio: (id) => precios.precio(id) != null,
    hoy: hoy(),
    antiguedadMaximaDias: p.antiguedad_maxima_dias,
  })
  // Alertas que requieren base de datos: fotos repetidas y facturas repetidas en otros certificados
  if (docs.length) {
    const repetidos = await tx.select({ sha: s.documentos.sha256, cert: s.certificados.numero }).from(s.certificadoDocumentos)
      .innerJoin(s.documentos, eq(s.documentos.id, s.certificadoDocumentos.documentoId))
      .innerJoin(s.certificados, eq(s.certificados.id, s.certificadoDocumentos.certificadoId))
      .where(and(ne(s.certificadoDocumentos.certificadoId, c.id), inArray(s.documentos.sha256, docs.map((d) => d.sha))))
    const vistos = new Set<string>()
    for (const rep of repetidos) {
      if (vistos.has(rep.sha)) continue
      vistos.add(rep.sha)
      const d = docs.find((x) => x.sha === rep.sha)
      r.alertas.push({ tipo: 'foto_repetida', mensaje: `El archivo "${d?.nombre}" ya se presentó en el certificado ${rep.cert}`, evidencia: { sha256: rep.sha, certificado: rep.cert } })
    }
  }
  for (const [i, it] of items.entries()) {
    if (!it.facturaNumero || !it.facturaCuit) continue
    const [otra] = await tx.select({ cert: s.certificados.numero }).from(s.certificadoItems).innerJoin(s.certificados, eq(s.certificados.id, s.certificadoItems.certificadoId))
      .where(and(ne(s.certificadoItems.certificadoId, c.id), eq(s.certificadoItems.facturaNumero, it.facturaNumero), eq(s.certificadoItems.facturaCuit, it.facturaCuit))).limit(1)
    if (otra) r.alertas.push({ tipo: 'factura_repetida', mensaje: `La factura ${it.facturaNumero} ya se usó en el certificado ${otra.cert}`, item: i })
  }
  return { ...r, items, codigos }
}

/** Vista previa de validaciones para el editor */
export async function previsualizarValidaciones(certId: string) {
  const db = getDb()
  const { cert, tarea } = await obtenerCertificado(certId, db)
  const r = await validarParaEmitir(db, cert, tarea)
  return { bloqueantes: r.bloqueantes, alertas: r.alertas }
}

// ─────────────────────────────── Acciones del flujo ───────────────────────────────

export interface DatosAccionCert {
  comentario?: string | null
  motivo?: string | null
  lockVersion?: number | null
  observacionesItems?: Array<{ itemId: number; comentario: string }>
  reversa?: { numeroDocumento: string; fecha: string; archivo?: File | null }
}

export async function ejecutarAccionCertificado(certId: string, accion: string, datos: DatosAccionCert, u: Usuario) {
  return getDb().transaction(async (tx) => {
    const [c] = await tx.select().from(s.certificados).where(eq(s.certificados.id, certId)).for('update')
    if (!c) throw new ErrorNegocio('El certificado no existe')
    if (datos.lockVersion != null && datos.lockVersion !== c.lockVersion) throw new ErrorNegocio('El certificado cambió mientras lo revisabas. Actualizá la página.')
    const [t] = await tx.select().from(s.tareas).where(eq(s.tareas.id, c.tareaId))
    const def = await flujoPorId(c.flujoId, tx)
    const ctx = await contexto(tx, c, t, u, def)
    const disp = exigirAccion(def, ctx, accion)
    const tr = disp.transicion
    exigirRequisitos(tr, datos, def)
    const rol = rolEnEstado(def, tr, c.estado, ctx)
    const actor: Actor = actorDe(u, rol)
    const estado: { alertas: Hallazgo[] } = { alertas: [] }

    for (const v of tr.validaciones ?? []) await validar(tx, v, c, t, datos, u, estado)
    const destino = resolverDestino(tr, ctx)
    const set: Partial<typeof s.certificados.$inferInsert> = { estado: destino, updatedAt: new Date(), lockVersion: c.lockVersion + 1, tomadoPor: null, tomadoAt: null }
    let cActual = c
    for (const ef of tr.efectos ?? []) {
      cActual = await efecto(tx, ef, { c: cActual, t, tr, datos, u, actor, enNombreDe: disp.enNombreDe ?? null, set, estado, ultimaAprobacionId: ctx.ultimaAprobacionId, origen: c.estado })
    }
    if (destino !== 'REVISION_RECHAZO' && c.estado === 'REVISION_RECHAZO') set.pasoOrigen = null
    await tx.update(s.certificados).set(set).where(eq(s.certificados.id, c.id))
    await registrarEvento(tx, actor, {
      entidad: 'certificado', entidadId: c.id, accion, estadoDesde: c.estado, estadoHasta: destino, enNombreDe: disp.enNombreDe ?? null,
      comentario: datos.comentario ?? null,
      cambios: { version: set.versionActual ?? c.versionActual, ...(datos.motivo ? { motivo: datos.motivo } : {}), ...(set.subtotalActual ? { subtotal: set.subtotalActual } : {}), ...(datos.observacionesItems?.length ? { observacionesItems: datos.observacionesItems } : {}) },
    })
    await notificarCambio(tx, { ...c, ...set } as Certificado, t, tr, destino, actor)
    return destino
  })
}

async function validar(tx: Tx, v: string, c: Certificado, t: Tarea, datos: DatosAccionCert, u: Usuario, estado: { alertas: Hallazgo[] }) {
  switch (v) {
    case 'emision': {
      const r = await validarParaEmitir(tx, c, t)
      if (r.bloqueantes.length) throw new ErrorNegocio(`No se puede emitir:\n• ${r.bloqueantes.map((b) => b.mensaje).join('\n• ')}`)
      estado.alertas = r.alertas
      return
    }
    case 'solo_materiales_cambiados': {
      const prev = await tx.select().from(s.certificadoItems).where(and(eq(s.certificadoItems.certificadoId, c.id), eq(s.certificadoItems.version, c.versionActual - 1)))
      const act = await tx.select().from(s.certificadoItems).where(and(eq(s.certificadoItems.certificadoId, c.id), eq(s.certificadoItems.version, c.versionActual)))
      if (!soloMaterialesCambiaron(prev as ItemEntrada[], act as ItemEntrada[])) throw new ErrorNegocio('En un rebote solo se pueden corregir materiales: la mano de obra no puede cambiar')
      return
    }
    case 'alertas_resueltas': {
      const [a] = await tx.select({ n: sql<number>`count(*)::int` }).from(s.alertas)
        .where(and(eq(s.alertas.entidad, 'certificado'), eq(s.alertas.entidadId, c.id), eq(s.alertas.estado, 'abierta')))
      if (a.n > 0) throw new ErrorNegocio(`Hay ${a.n} alerta(s) sin resolver: revisalas y dejá constancia antes de aprobar`)
      return
    }
    case 'consumo_registrado': {
      const items = await tx.select({ tipo: s.certificadoItems.tipo }).from(s.certificadoItems).where(and(eq(s.certificadoItems.certificadoId, c.id), eq(s.certificadoItems.version, c.versionActual)))
      const consumos = await tx.select({ tipo: s.consumosSap.tipo }).from(s.consumosSap).where(and(eq(s.consumosSap.certificadoId, c.id), eq(s.consumosSap.version, c.versionActual)))
      if (items.some((i) => i.tipo === 'material') && !consumos.some((x) => x.tipo === 'consumo')) throw new ErrorNegocio('Registrá el documento de consumo SAP antes de aprobar')
      if (items.some((i) => i.tipo === 'recuperado') && !consumos.some((x) => x.tipo === 'ingreso_recuperados')) throw new ErrorNegocio('Registrá el documento de ingreso de recuperados antes de aprobar')
      await validar(tx, 'alertas_resueltas', c, t, datos, u, estado)
      return
    }
    case 'reversa_registrada': {
      const r = datos.reversa
      if (!r?.numeroDocumento?.trim() || !r.fecha) throw new ErrorNegocio('Indicá el número y la fecha del documento de reversa SAP')
      const doc = r.archivo && r.archivo.size ? await guardarArchivo(tx, r.archivo, u.id, 'reversa_sap') : null
      await tx.insert(s.consumosSap).values({ certificadoId: c.id, version: c.versionActual, tipo: 'reversa', numeroDocumento: r.numeroDocumento.trim(), fecha: r.fecha, documentoId: doc?.id ?? null, registradoPor: u.id })
      return
    }
    default:
      throw new Error(`Validación no implementada: ${v}`)
  }
}

interface CtxEfecto {
  c: Certificado; t: Tarea; tr: TransicionDef; datos: DatosAccionCert; u: Usuario; actor: Actor; enNombreDe: string | null
  set: Partial<typeof s.certificados.$inferInsert>; estado: { alertas: Hallazgo[] }; ultimaAprobacionId: number | null; origen: string
}

async function efecto(tx: Tx, ef: string, e: CtxEfecto): Promise<Certificado> {
  const { c, t, set } = e
  switch (ef) {
    case 'emitir_version': {
      const v = await valorizarCertificado(tx, c, t.tipoTrabajo)
      const ahora = new Date()
      await tx.update(s.certificadoVersiones).set({ estado: 'emitida', emitidaAt: ahora, emitidaPor: e.u.id, subtotal: v.subtotal, motivo: e.datos.comentario ?? null })
        .where(and(eq(s.certificadoVersiones.certificadoId, c.id), eq(s.certificadoVersiones.version, c.versionActual)))
      const mo = await tx.select({ req: s.codigosMo.requiereSegundaAprobacion }).from(s.certificadoItems).innerJoin(s.codigosMo, eq(s.codigosMo.id, s.certificadoItems.codigoMoId))
        .where(and(eq(s.certificadoItems.certificadoId, c.id), eq(s.certificadoItems.version, c.versionActual)))
      set.emitidoAt = ahora
      set.primeraEmisionAt = c.primeraEmisionAt ?? ahora
      set.subtotalEmision = c.subtotalEmision ?? v.subtotal
      set.subtotalActual = v.subtotal
      set.lpuActualId = v.lpuId
      set.requiereSegundaAprobacion = mo.some((m) => m.req)
      // Congela el precio de emisión de los ítems que se emiten por primera vez
      await tx.update(s.certificadoItems).set({ precioEmision: sql`${s.certificadoItems.precioUnitario}` })
        .where(and(eq(s.certificadoItems.certificadoId, c.id), eq(s.certificadoItems.version, c.versionActual), sql`${s.certificadoItems.precioEmision} is null`))
      const items = await tx.select({ id: s.certificadoItems.id }).from(s.certificadoItems).where(and(eq(s.certificadoItems.certificadoId, c.id), eq(s.certificadoItems.version, c.versionActual))).orderBy(asc(s.certificadoItems.orden))
      if (e.estado.alertas.length) {
        await tx.insert(s.alertas).values(e.estado.alertas.map((a) => ({
          entidad: 'certificado', entidadId: c.id, version: c.versionActual, tipo: a.tipo ?? 'otra', mensaje: a.mensaje, evidencia: a.evidencia ?? null,
          itemId: a.item != null ? items[a.item]?.id ?? null : null,
        })))
      }
      return { ...c, ...set } as Certificado
    }
    case 'invalidar_aprobaciones':
      await tx.update(s.aprobaciones).set({ vigente: false }).where(eq(s.aprobaciones.certificadoId, c.id))
      set.reenvios = 0
      return c
    case 'nueva_version_borrador': {
      const nueva = c.versionActual + 1
      const items = await tx.select().from(s.certificadoItems).where(and(eq(s.certificadoItems.certificadoId, c.id), eq(s.certificadoItems.version, c.versionActual)))
      if (items.length) await tx.insert(s.certificadoItems).values(items.map(({ id: _id, ...it }) => ({ ...it, version: nueva })))
      const docs = await tx.select().from(s.certificadoDocumentos).where(and(eq(s.certificadoDocumentos.certificadoId, c.id), eq(s.certificadoDocumentos.version, c.versionActual)))
      if (docs.length) await tx.insert(s.certificadoDocumentos).values(docs.map((d) => ({ ...d, version: nueva })))
      await tx.insert(s.certificadoVersiones).values({ certificadoId: c.id, version: nueva, estado: 'borrador' })
      set.versionActual = nueva
      return { ...c, versionActual: nueva }
    }
    case 'registrar_aprobacion': {
      const [a] = await tx.insert(s.aprobaciones).values({
        certificadoId: c.id, version: c.versionActual, paso: e.origen, accion: e.tr.accion, usuarioId: e.u.id, rol: e.actor.rol ?? null,
        enNombreDe: e.enNombreDe, motivo: e.datos.motivo ?? null, comentario: e.datos.comentario ?? null,
      }).returning()
      const obs = (e.datos.observacionesItems ?? []).filter((o) => o.comentario?.trim())
      if (obs.length) {
        const validos = await tx.select({ id: s.certificadoItems.id }).from(s.certificadoItems)
          .where(and(eq(s.certificadoItems.certificadoId, c.id), eq(s.certificadoItems.version, c.versionActual), inArray(s.certificadoItems.id, obs.map((o) => o.itemId))))
        const ok = new Set(validos.map((v) => v.id))
        const filas = obs.filter((o) => ok.has(o.itemId)).map((o) => ({ aprobacionId: a.id, itemId: o.itemId, comentario: o.comentario.trim() }))
        if (filas.length) await tx.insert(s.observacionesItem).values(filas)
      }
      return c
    }
    case 'tarea_certificado_emitido':
      await transicionSistemaTarea(tx, t, 'certificado_emitido', `Certificado ${c.numero} emitido`)
      return c
    case 'tarea_certificado_aprobado': {
      const [tarea] = await tx.select().from(s.tareas).where(eq(s.tareas.id, t.id))
      await transicionSistemaTarea(tx, tarea, c.esFinal ? 'certificado_final_aprobado' : 'certificado_parcial_aprobado', `Certificado ${c.numero} aprobado`)
      return c
    }
    case 'tarea_certificado_anulado': {
      const activos = await tx.select({ id: s.certificados.id }).from(s.certificados)
        .where(and(eq(s.certificados.tareaId, t.id), ne(s.certificados.id, c.id), notInArray(s.certificados.estado, ['ANULADO', 'ANULADO_REVERTIDO', 'PENDIENTE_REVERSA_SAP', 'APROBADO', 'EN_LIQUIDACION', 'CERRADO'])))
      const [tarea] = await tx.select().from(s.tareas).where(eq(s.tareas.id, t.id))
      if (!activos.length) await transicionSistemaTarea(tx, tarea, 'certificado_anulado', `Certificado ${c.numero} anulado`)
      return c
    }
    case 'recordar_paso_origen':
      set.pasoOrigen = e.origen
      return c
    case 'contar_reenvio': {
      const reenvios = c.reenvios + 1
      set.reenvios = reenvios
      const p = await parametros(tx)
      if (reenvios >= p.reenvios_para_escalar) {
        await notificar(tx, [t.supervisorId], `Escalamiento: ${c.numero} lleva ${reenvios} reenvíos sin cambios`, 'Intervení para destrabar el certificado', `/i/certificados/${c.id}`)
      }
      return c
    }
    case 'invalidar_ultima_aprobacion':
      if (e.ultimaAprobacionId) await tx.update(s.aprobaciones).set({ vigente: false }).where(eq(s.aprobaciones.id, e.ultimaAprobacionId))
      return c
    default:
      throw new Error(`Efecto no implementado: ${ef}`)
  }
}

async function notificarCambio(tx: Tx, c: Certificado, t: Tarea, tr: TransicionDef, destino: string, actor: Actor) {
  const linkI = `/i/certificados/${c.id}`
  const linkC = `/c/certificados/${c.id}`
  const titulo = `${c.numero}: ${tr.etiqueta.toLowerCase()}`
  const cuerpo = `Por ${actor.nombreCompleto}`
  switch (destino) {
    case 'VAL_TECNICA': case 'REVISION_RECHAZO': case 'PEDIDO_RETIRO':
      await notificar(tx, [t.solicitanteId], titulo, cuerpo, linkI); break
    case 'APROB_GERENTE':
      await notificar(tx, await usuariosConRol(tx, 'gerente', t.subregionId), titulo, cuerpo, linkI); break
    case 'VAL_MATERIALES': case 'PENDIENTE_REVERSA_SAP':
      await notificar(tx, await usuariosConRol(tx, 'administracion', t.subregionId), titulo, cuerpo, linkI); break
    case 'APROB_FINAL':
      await notificar(tx, await usuariosConRol(tx, t.tipoTrabajo === 'obra' ? 'adm_obra' : 'cerco', t.subregionId), titulo, cuerpo, linkI); break
    case 'OBSERVADO': case 'REBOTE_MATERIALES': case 'APROBADO': case 'BORRADOR':
      await notificar(tx, await usuariosDeContratista(tx, c.contratistaId), titulo, cuerpo, linkC); break
  }
  if (destino === 'REBOTE_MATERIALES') await notificar(tx, [t.solicitanteId], titulo, cuerpo, linkI)
}

// ─────────────────────────────── Tomar / soltar ───────────────────────────────

export async function tomarCertificado(certId: string, u: Usuario) {
  return getDb().transaction(async (tx) => {
    const [c] = await tx.select().from(s.certificados).where(eq(s.certificados.id, certId)).for('update')
    if (!c) throw new ErrorNegocio('El certificado no existe')
    const [t] = await tx.select().from(s.tareas).where(eq(s.tareas.id, c.tareaId))
    if (c.tomadoPor && c.tomadoPor !== u.id) throw new ErrorNegocio('Otra persona ya lo está trabajando')
    const def = await flujoPorId(c.flujoId, tx)
    const ctx = await contexto(tx, { ...c, tomadoPor: null }, t, u, def)
    const actorEstado = estadoDef(def, c.estado).actor
    if (!actorEstado || !coincideActor(actorEstado, ctx)) throw new ErrorNegocio('No te corresponde este paso')
    await tx.update(s.certificados).set({ tomadoPor: u.id, tomadoAt: new Date(), lockVersion: c.lockVersion + 1 }).where(eq(s.certificados.id, c.id))
    await registrarEvento(tx, actorDe(u), { entidad: 'certificado', entidadId: c.id, accion: 'tomar', estadoDesde: c.estado, estadoHasta: c.estado })
  })
}

export async function soltarCertificado(certId: string, u: Usuario) {
  return getDb().transaction(async (tx) => {
    const [c] = await tx.select().from(s.certificados).where(eq(s.certificados.id, certId)).for('update')
    if (!c?.tomadoPor) return
    if (c.tomadoPor !== u.id && !u.supervisados.includes(c.tomadoPor)) throw new ErrorNegocio('No podés liberar un certificado que tomó otra persona')
    await tx.update(s.certificados).set({ tomadoPor: null, tomadoAt: null, lockVersion: c.lockVersion + 1 }).where(eq(s.certificados.id, c.id))
    await registrarEvento(tx, actorDe(u), { entidad: 'certificado', entidadId: c.id, accion: 'soltar', enNombreDe: c.tomadoPor !== u.id ? c.tomadoPor : null })
  })
}

// ─────────────────────────────── Materiales y SAP ───────────────────────────────

/** Administración registra el documento SAP (consumo o ingreso de recuperados) y el sistema compara */
export async function registrarDocumentoSap(certId: string, d: { tipo: 'consumo' | 'ingreso_recuperados' | 'correccion'; numeroDocumento: string; fecha: string; archivo?: File | null }, u: Usuario) {
  if (!d.numeroDocumento?.trim() || !d.fecha) throw new ErrorNegocio('Indicá el número y la fecha del documento SAP')
  return getDb().transaction(async (tx) => {
    const [c] = await tx.select().from(s.certificados).where(eq(s.certificados.id, certId)).for('update')
    if (!c) throw new ErrorNegocio('El certificado no existe')
    const [t] = await tx.select().from(s.tareas).where(eq(s.tareas.id, c.tareaId))
    if (c.estado !== 'VAL_MATERIALES') throw new ErrorNegocio('El certificado no está en validación de materiales')
    if (!tieneRol(u, 'administracion') || !u.subregionIds.includes(t.subregionId)) throw new ErrorNegocio('No autorizado')
    if (c.tomadoPor && c.tomadoPor !== u.id) throw new ErrorNegocio('Otra persona lo está trabajando')
    let detalle: Record<string, number> | null = null
    let docId: string | null = null
    if (d.archivo && d.archivo.size) {
      const doc = await guardarArchivo(tx, d.archivo, u.id, d.tipo === 'ingreso_recuperados' ? 'ingreso_recuperados' : 'consumo_sap')
      docId = doc.id
      try {
        const hojas = await leerLibro(d.archivo)
        const m = leerDetalleCodigos(hojas[0]?.grilla ?? [])
        if (m.size) detalle = Object.fromEntries(m)
      } catch { /* PDF u otro formato: se guarda sin detalle */ }
    }
    await tx.insert(s.consumosSap).values({ certificadoId: c.id, version: c.versionActual, tipo: d.tipo, numeroDocumento: d.numeroDocumento.trim(), fecha: d.fecha, documentoId: docId, detalle, registradoPor: u.id })
    // Comparación entre lo declarado por el contratista y lo registrado en SAP
    let diferencias = 0
    if (detalle) {
      const tipoItem = d.tipo === 'ingreso_recuperados' ? 'recuperado' : 'material'
      const decl = await tx.select({ cod: s.materiales.codigoSap, desc: s.materiales.descripcion, cant: s.certificadoItems.cantidad }).from(s.certificadoItems)
        .innerJoin(s.materiales, eq(s.materiales.id, s.certificadoItems.materialId))
        .where(and(eq(s.certificadoItems.certificadoId, c.id), eq(s.certificadoItems.version, c.versionActual), eq(s.certificadoItems.tipo, tipoItem)))
      const declarado = new Map<string, number>()
      for (const x of decl) declarado.set(x.cod, (declarado.get(x.cod) ?? 0) + Number(x.cant))
      const codigos = new Set([...declarado.keys(), ...Object.keys(detalle)])
      for (const cod of codigos) {
        const a = declarado.get(cod) ?? 0
        const b = detalle[cod] ?? 0
        if (Math.abs(a - b) > 0.0001) {
          diferencias++
          await tx.insert(s.alertas).values({
            entidad: 'certificado', entidadId: c.id, version: c.versionActual, tipo: 'consumo_diferente',
            mensaje: `Material ${cod}: declarado ${a}, registrado en SAP ${b}`, evidencia: { codigo: cod, declarado: a, sap: b, documento: d.numeroDocumento },
          })
        }
      }
    }
    await tx.update(s.certificados).set({ tomadoPor: u.id, tomadoAt: c.tomadoAt ?? new Date(), lockVersion: c.lockVersion + 1 }).where(eq(s.certificados.id, c.id))
    await registrarEvento(tx, actorDe(u, 'administracion'), {
      entidad: 'certificado', entidadId: c.id, accion: `registrar_${d.tipo}`, cambios: { numeroDocumento: d.numeroDocumento, fecha: d.fecha, detalle: !!detalle, diferencias },
    })
    return { diferencias, conDetalle: !!detalle }
  })
}

export async function resolverAlerta(alertaId: number, resolucion: string, u: Usuario) {
  if (!resolucion?.trim()) throw new ErrorNegocio('Dejá constancia de cómo se resolvió la alerta')
  return getDb().transaction(async (tx) => {
    const [a] = await tx.select().from(s.alertas).where(eq(s.alertas.id, alertaId)).for('update')
    if (!a) throw new ErrorNegocio('La alerta no existe')
    if (a.estado !== 'abierta') throw new ErrorNegocio('La alerta ya fue resuelta')
    if (u.tipo !== 'interno') throw new ErrorNegocio('No autorizado')
    await tx.update(s.alertas).set({ estado: 'resuelta', resueltaPor: u.id, resolucion: resolucion.trim(), resueltaAt: new Date() }).where(eq(s.alertas.id, a.id))
    await registrarEvento(tx, actorDe(u), { entidad: a.entidad, entidadId: a.entidadId, accion: 'resolver_alerta', cambios: { alerta: a.id, tipo: a.tipo, mensaje: a.mensaje }, comentario: resolucion.trim() })
  })
}

// ─────────────────────────────── Consulta completa ───────────────────────────────

export async function certificadoCompleto(certId: string) {
  const db = getDb()
  const { cert, tarea } = await obtenerCertificado(certId, db)
  const [contratista] = await db.select().from(s.contratistas).where(eq(s.contratistas.id, cert.contratistaId))
  const itemsDe = (version: number) => db.select({ item: s.certificadoItems, codigo: s.codigosMo, material: s.materiales }).from(s.certificadoItems)
    .leftJoin(s.codigosMo, eq(s.codigosMo.id, s.certificadoItems.codigoMoId))
    .leftJoin(s.materiales, eq(s.materiales.id, s.certificadoItems.materialId))
    .where(and(eq(s.certificadoItems.certificadoId, cert.id), eq(s.certificadoItems.version, version))).orderBy(asc(s.certificadoItems.orden))
  const versiones = await db.select().from(s.certificadoVersiones).where(eq(s.certificadoVersiones.certificadoId, cert.id)).orderBy(asc(s.certificadoVersiones.version))
  const emitidas = versiones.filter((v) => v.estado === 'emitida')
  // Versión a mostrar a los aprobadores: la última emitida (la actual puede ser un borrador en corrección)
  const versionVista = ESTADOS_EDITABLES.includes(cert.estado) ? cert.versionActual : (emitidas.at(-1)?.version ?? cert.versionActual)
  const anterior = emitidas.filter((v) => v.version < versionVista).at(-1)?.version ?? null
  const [items, itemsAnterior, docs, aprobaciones, alertas, consumos, revals, obs] = await Promise.all([
    itemsDe(versionVista),
    anterior ? itemsDe(anterior) : Promise.resolve([]),
    db.select({ doc: s.documentos, version: s.certificadoDocumentos.version }).from(s.certificadoDocumentos)
      .innerJoin(s.documentos, eq(s.documentos.id, s.certificadoDocumentos.documentoId))
      .where(eq(s.certificadoDocumentos.certificadoId, cert.id)),
    db.select({ a: s.aprobaciones, nombre: s.usuarios.nombre, apellido: s.usuarios.apellido }).from(s.aprobaciones)
      .innerJoin(s.usuarios, eq(s.usuarios.id, s.aprobaciones.usuarioId)).where(eq(s.aprobaciones.certificadoId, cert.id)).orderBy(asc(s.aprobaciones.id)),
    db.select().from(s.alertas).where(and(eq(s.alertas.entidad, 'certificado'), eq(s.alertas.entidadId, cert.id))).orderBy(asc(s.alertas.id)),
    db.select().from(s.consumosSap).where(eq(s.consumosSap.certificadoId, cert.id)).orderBy(asc(s.consumosSap.id)),
    db.select().from(s.revalorizaciones).where(eq(s.revalorizaciones.certificadoId, cert.id)).orderBy(asc(s.revalorizaciones.id)),
    db.select({ o: s.observacionesItem, aprob: s.aprobaciones }).from(s.observacionesItem).innerJoin(s.aprobaciones, eq(s.aprobaciones.id, s.observacionesItem.aprobacionId))
      .where(eq(s.aprobaciones.certificadoId, cert.id)),
  ])
  const docsVersion = docs.filter((d) => d.version === versionVista).map((d) => d.doc)
  const docsAnterior = new Set(docs.filter((d) => d.version === anterior).map((d) => d.doc.id))
  return {
    cert, tarea, contratista, versiones, versionVista, versionAnterior: anterior, items, itemsAnterior, documentos: docsVersion,
    documentosNuevos: anterior ? docsVersion.filter((d) => !docsAnterior.has(d.id)).map((d) => d.id) : [],
    aprobaciones, alertas, consumos, revalorizaciones: revals, observaciones: obs,
  }
}

export { ESTADOS_CONGELADOS }
