import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { ErrorNegocio } from '@/domain/flujo/motor'
import { aTexto, dec, suma } from '@/domain/dinero'
import { conIva } from '@/domain/precios'
import { registrarEvento, SISTEMA } from '../auditoria'
import { guardarArchivo } from '../archivos'
import { notificar, parametros, siguienteNumero, usuariosDeContratista } from '../comun'
import { actorDe, tieneRol, type Usuario } from '../usuarios'
import { valorizarCertificado } from './precios'

function exigirAdmin(u: Usuario) {
  if (!tieneRol(u, 'administracion', 'cerco', 'adm_obra')) throw new ErrorNegocio('Solo Administración o CERCO gestionan liquidaciones')
}

export async function crearPeriodo(nombre: string, fechaCorte: string, u: Usuario) {
  exigirAdmin(u)
  if (!/^\d{4}-\d{2}$/.test(nombre)) throw new ErrorNegocio('El período se indica como AAAA-MM')
  if (!fechaCorte) throw new ErrorNegocio('Indicá la fecha de corte')
  return getDb().transaction(async (tx) => {
    const [p] = await tx.insert(s.periodos).values({ nombre, fechaCorte }).onConflictDoNothing().returning()
    if (!p) throw new ErrorNegocio('El período ya existe')
    await registrarEvento(tx, actorDe(u), { entidad: 'periodo', entidadId: String(p.id), accion: 'crear', cambios: { nombre, fechaCorte } })
    return p
  })
}

/**
 * Cierra el período: por contratista toma los certificados APROBADOS, congela el precio con la LPU
 * vigente a la fecha de corte (según la política), suma ajustes pendientes y genera la liquidación.
 */
export async function cerrarPeriodo(periodoId: number, u: Usuario) {
  exigirAdmin(u)
  return getDb().transaction(async (tx) => {
    const [p] = await tx.select().from(s.periodos).where(eq(s.periodos.id, periodoId)).for('update')
    if (!p) throw new ErrorNegocio('El período no existe')
    if (p.estado !== 'abierto') throw new ErrorNegocio('El período ya está cerrado')
    const par = await parametros(tx)
    const aprobados = await tx.select({ c: s.certificados, tipo: s.tareas.tipoTrabajo }).from(s.certificados)
      .innerJoin(s.tareas, eq(s.tareas.id, s.certificados.tareaId)).where(eq(s.certificados.estado, 'APROBADO'))
    const ajustesPend = await tx.select().from(s.ajustes).where(isNull(s.ajustes.liquidacionId))
    // Solo se liquida a quien tiene certificados aprobados; los ajustes de los demás esperan a su próxima liquidación
    const contratistas = new Set(aprobados.map((a) => a.c.contratistaId))
    const actor = actorDe(u, 'administracion')
    const creadas = []
    for (const contratistaId of contratistas) {
      const certs = aprobados.filter((a) => a.c.contratistaId === contratistaId)
      const finales: string[] = []
      for (const { c, tipo } of certs) {
        const fechaRef = par.politica_precios.referencia === 'cierre' ? p.fechaCorte : undefined
        const v = await valorizarCertificado(tx, c, tipo, { fechaForzada: c.precioForzado ? undefined : fechaRef })
        finales.push(v.subtotal)
        await tx.update(s.certificados).set({ subtotalFinal: v.subtotal, subtotalActual: v.subtotal, lpuActualId: v.lpuId, estado: 'EN_LIQUIDACION', updatedAt: new Date(), lockVersion: c.lockVersion + 1 }).where(eq(s.certificados.id, c.id))
        if (c.subtotalActual !== v.subtotal) {
          await tx.insert(s.revalorizaciones).values({ certificadoId: c.id, lpuId: v.lpuId ?? c.lpuActualId ?? 0, subtotalAnterior: c.subtotalActual ?? '0', subtotalNuevo: v.subtotal, motivo: `Congelamiento al cierre del período ${p.nombre}` })
        }
        await registrarEvento(tx, SISTEMA, { entidad: 'certificado', entidadId: c.id, accion: 'incluir_en_liquidacion', estadoDesde: 'APROBADO', estadoHasta: 'EN_LIQUIDACION', cambios: { periodo: p.nombre, subtotalFinal: v.subtotal, subtotalEmision: c.subtotalEmision } })
      }
      const ajustes = ajustesPend.filter((a) => a.contratistaId === contratistaId)
      const totalAjustes = suma(ajustes.map((a) => (a.tipo === 'debito' ? -dec(a.importe) : dec(a.importe))))
      const subtotal = suma(finales.map(dec))
      const imp = conIva(aTexto(subtotal + totalAjustes), par.iva_alicuota)
      const n = await siguienteNumero(tx, `liq:${p.nombre.slice(0, 4)}`)
      const [l] = await tx.insert(s.liquidaciones).values({
        numero: `LIQ-${p.nombre.slice(0, 4)}-${String(n).padStart(5, '0')}`, periodoId: p.id, contratistaId, estado: 'pendiente_factura',
        subtotal: aTexto(subtotal), ajustes: aTexto(totalAjustes), iva: imp.iva, total: imp.total,
      }).returning()
      if (certs.length) await tx.update(s.certificados).set({ liquidacionId: l.id }).where(inArray(s.certificados.id, certs.map((x) => x.c.id)))
      if (ajustes.length) await tx.update(s.ajustes).set({ liquidacionId: l.id }).where(inArray(s.ajustes.id, ajustes.map((a) => a.id)))
      await registrarEvento(tx, actor, { entidad: 'liquidacion', entidadId: String(l.id), accion: 'generar', estadoHasta: 'pendiente_factura', cambios: { periodo: p.nombre, certificados: certs.length, subtotal: l.subtotal, ajustes: l.ajustes, total: l.total } })
      await notificar(tx, await usuariosDeContratista(tx, contratistaId), `Liquidación ${l.numero} lista para facturar`, `Total $ ${l.total}`, `/c/liquidaciones/${l.id}`)
      creadas.push(l)
    }
    await tx.update(s.periodos).set({ estado: 'cerrado', cerradoPor: u.id, cerradoAt: new Date() }).where(eq(s.periodos.id, p.id))
    await registrarEvento(tx, actor, { entidad: 'periodo', entidadId: String(p.id), accion: 'cerrar', estadoDesde: 'abierto', estadoHasta: 'cerrado', cambios: { liquidaciones: creadas.length } })
    return creadas
  })
}

/** El contratista adjunta la factura: se advierte si no coincide, pero no se bloquea (spec 11 F3) */
export async function subirFacturaLiquidacion(liqId: number, datos: { numero: string; importe: string; archivo: File }, u: Usuario) {
  if (!datos.numero?.trim()) throw new ErrorNegocio('Indicá el número de factura')
  if (!datos.archivo?.size) throw new ErrorNegocio('Adjuntá la factura')
  return getDb().transaction(async (tx) => {
    const [l] = await tx.select().from(s.liquidaciones).where(eq(s.liquidaciones.id, liqId)).for('update')
    if (!l) throw new ErrorNegocio('La liquidación no existe')
    if (u.contratistaId !== l.contratistaId || !tieneRol(u, 'contratista_responsable')) throw new ErrorNegocio('No autorizado')
    if (l.estado !== 'pendiente_factura') throw new ErrorNegocio('La liquidación ya tiene factura')
    const doc = await guardarArchivo(tx, datos.archivo, u.id, 'factura')
    const importe = datos.importe ? aTexto(dec(datos.importe)) : null
    await tx.update(s.liquidaciones).set({ estado: 'cerrada', facturaDocumentoId: doc.id, facturaNumero: datos.numero.trim(), facturaImporte: importe, cerradaAt: new Date() }).where(eq(s.liquidaciones.id, l.id))
    if (importe && dec(importe) !== dec(l.total)) {
      await tx.insert(s.alertas).values({ entidad: 'liquidacion', entidadId: String(l.id), tipo: 'factura_diferente', mensaje: `La factura ${datos.numero} informa $ ${importe} y la liquidación $ ${l.total}`, evidencia: { factura: importe, liquidacion: l.total } })
    }
    const certs = await tx.select().from(s.certificados).where(and(eq(s.certificados.liquidacionId, l.id), eq(s.certificados.estado, 'EN_LIQUIDACION')))
    for (const c of certs) {
      await tx.update(s.certificados).set({ estado: 'CERRADO', updatedAt: new Date(), lockVersion: c.lockVersion + 1 }).where(eq(s.certificados.id, c.id))
      await registrarEvento(tx, SISTEMA, { entidad: 'certificado', entidadId: c.id, accion: 'cerrar', estadoDesde: 'EN_LIQUIDACION', estadoHasta: 'CERRADO', cambios: { liquidacion: l.numero, factura: datos.numero } })
    }
    await registrarEvento(tx, actorDe(u, 'contratista'), { entidad: 'liquidacion', entidadId: String(l.id), accion: 'adjuntar_factura', estadoDesde: 'pendiente_factura', estadoHasta: 'cerrada', cambios: { factura: datos.numero, importe, total: l.total } })
  })
}

export async function crearAjuste(d: { contratistaId: number; tipo: 'debito' | 'credito'; importe: string; motivo: string; certificadoId?: string | null; archivo?: File | null }, u: Usuario) {
  exigirAdmin(u)
  if (!['debito', 'credito'].includes(d.tipo)) throw new ErrorNegocio('Tipo de ajuste inválido')
  if (!(Number(d.importe) > 0)) throw new ErrorNegocio('El importe debe ser mayor a cero')
  if (!d.motivo?.trim()) throw new ErrorNegocio('El motivo es obligatorio')
  return getDb().transaction(async (tx) => {
    const doc = d.archivo?.size ? await guardarArchivo(tx, d.archivo, u.id, 'otro') : null
    const [a] = await tx.insert(s.ajustes).values({ contratistaId: d.contratistaId, tipo: d.tipo, importe: aTexto(dec(d.importe)), motivo: d.motivo.trim(), certificadoId: d.certificadoId || null, documentoId: doc?.id ?? null, creadoPor: u.id }).returning()
    await registrarEvento(tx, actorDe(u), { entidad: 'ajuste', entidadId: String(a.id), accion: 'crear', cambios: { contratistaId: a.contratistaId, tipo: a.tipo, importe: a.importe }, comentario: a.motivo })
    await notificar(tx, await usuariosDeContratista(tx, d.contratistaId), `Nuevo ajuste (${d.tipo === 'debito' ? 'débito' : 'crédito'}) en tu próxima liquidación`, `$ ${a.importe}: ${a.motivo}`, '/c/liquidaciones')
    return a
  })
}

export async function listarPeriodos() {
  return getDb().select().from(s.periodos).orderBy(desc(s.periodos.nombre))
}

export async function liquidacionCompleta(id: number) {
  const db = getDb()
  const [l] = await db.select({ l: s.liquidaciones, p: s.periodos, c: s.contratistas }).from(s.liquidaciones)
    .innerJoin(s.periodos, eq(s.periodos.id, s.liquidaciones.periodoId)).innerJoin(s.contratistas, eq(s.contratistas.id, s.liquidaciones.contratistaId))
    .where(eq(s.liquidaciones.id, id))
  if (!l) throw new ErrorNegocio('La liquidación no existe')
  const certs = await db.select({ c: s.certificados, numeroTarea: s.tareas.numero, titulo: s.tareas.titulo }).from(s.certificados)
    .innerJoin(s.tareas, eq(s.tareas.id, s.certificados.tareaId)).where(eq(s.certificados.liquidacionId, id)).orderBy(asc(s.certificados.numero))
  const ajustes = await db.select().from(s.ajustes).where(eq(s.ajustes.liquidacionId, id))
  const alertas = await db.select().from(s.alertas).where(and(eq(s.alertas.entidad, 'liquidacion'), eq(s.alertas.entidadId, String(id))))
  return { ...l, certs, ajustes, alertas }
}
