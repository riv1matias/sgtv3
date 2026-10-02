import { and, eq, inArray, notInArray } from 'drizzle-orm'
import { getDb, schema as s, type Tx } from '@/db'
import { fechaReferencia, listaPara, lpuVigente, valorizar, type ListaPrecio, type PoliticaPrecios } from '@/domain/precios'
import { hoy } from '@/lib/fechas'
import { registrarEvento, type Actor } from '../auditoria'
import { parametros } from '../comun'

type Lpu = typeof s.lpuVersiones.$inferSelect
const cachePrecios = new Map<string, Map<number, string>>()

export function limpiarCachePrecios() {
  cachePrecios.clear()
}

export async function lpusPublicadas(tx: Tx = getDb()): Promise<Lpu[]> {
  return tx.select().from(s.lpuVersiones).where(eq(s.lpuVersiones.estado, 'publicada'))
}

export async function preciosDeLpu(tx: Tx, lpuId: number, lista: ListaPrecio): Promise<Map<number, string>> {
  const k = `${lpuId}:${lista}`
  const c = cachePrecios.get(k)
  if (c) return c
  const filas = await tx.select({ codigo: s.lpuPrecios.codigoMoId, precio: s.lpuPrecios.precio }).from(s.lpuPrecios)
    .where(and(eq(s.lpuPrecios.lpuId, lpuId), eq(s.lpuPrecios.lista, lista)))
  const m = new Map(filas.filter((f) => Number(f.precio) > 0).map((f) => [f.codigo, f.precio]))
  cachePrecios.set(k, m)
  return m
}

/**
 * Función de precio para una fecha: toma la LPU vigente y, si un código fue dado de baja,
 * conserva el último precio que tuvo (spec 11 D3).
 */
export async function precioALaFecha(tx: Tx, lista: ListaPrecio, fecha: string, lpus?: Lpu[]) {
  const todas = (lpus ?? (await lpusPublicadas(tx))).filter((l) => l.vigenciaDesde <= fecha)
    .sort((a, b) => (a.vigenciaDesde === b.vigenciaDesde ? b.id - a.id : b.vigenciaDesde.localeCompare(a.vigenciaDesde)))
  const mapas: Map<number, string>[] = []
  for (const l of todas) mapas.push(await preciosDeLpu(tx, l.id, lista))
  const vigente = todas[0] ?? null
  return {
    lpu: vigente,
    precio: (codigoId: number): string | null => {
      for (const m of mapas) { const p = m.get(codigoId); if (p) return p }
      return null
    },
    /** Solo la LPU vigente (para decidir si un código aplica al tipo de trabajo) */
    enVigente: (codigoId: number) => (mapas[0]?.has(codigoId) ?? false),
  }
}

type Cert = typeof s.certificados.$inferSelect

/** Valoriza la versión actual de un certificado según la política de precios y guarda el resultado */
export async function valorizarCertificado(tx: Tx, cert: Cert, tipoTrabajo: string, opts: { fechaForzada?: string; politica?: PoliticaPrecios } = {}) {
  const p = await parametros(tx)
  const politica = opts.politica ?? p.politica_precios
  const lista = listaPara(tipoTrabajo)
  const lpus = await lpusPublicadas(tx)
  const hoyStr = hoy()
  const primera = cert.primeraEmisionAt ? hoy(cert.primeraEmisionAt) : null
  const fRef = opts.fechaForzada ?? fechaReferencia(politica, primera, hoyStr, cert.precioForzado)
  const actual = await precioALaFecha(tx, lista, fRef, lpus)
  const items = await tx.select({ item: s.certificadoItems, montoAbierto: s.codigosMo.montoAbierto }).from(s.certificadoItems)
    .leftJoin(s.codigosMo, eq(s.codigosMo.id, s.certificadoItems.codigoMoId))
    .where(and(eq(s.certificadoItems.certificadoId, cert.id), eq(s.certificadoItems.version, cert.versionActual)))
  const v = valorizar(
    items.map((x) => ({ tipo: x.item.tipo as 'mo', codigoMoId: x.item.codigoMoId, cantidad: x.item.cantidad, importe: x.item.importe, montoAbierto: !!x.montoAbierto, precioEmision: x.item.precioEmision })),
    actual.precio,
    { politica: cert.precioForzado ? { ...politica, aplicarBajas: true, aplicarSubas: true } : politica, alicuotaIva: p.iva_alicuota },
  )
  for (const [i, x] of items.entries()) {
    const l = v.lineas[i]
    if (x.item.precioUnitario !== l.precioUnitario || x.item.subtotal !== l.subtotal) {
      await tx.update(s.certificadoItems).set({ precioUnitario: l.precioUnitario, subtotal: l.subtotal }).where(eq(s.certificadoItems.id, x.item.id))
    }
  }
  return { ...v, lpuId: actual.lpu?.id ?? null, fechaReferencia: fRef }
}

/** Estados en los que el certificado ya no se revaloriza */
export const ESTADOS_CONGELADOS = ['EN_LIQUIDACION', 'CERRADO', 'ANULADO', 'ANULADO_REVERTIDO', 'PENDIENTE_REVERSA_SAP']

/** Revaloriza todos los certificados emitidos y no cerrados (al publicar o rectificar una LPU) */
export async function revalorizarAbiertos(tx: Tx, lpuId: number, actor: Actor, motivo: string) {
  const certs = await tx.select({ c: s.certificados, tipo: s.tareas.tipoTrabajo }).from(s.certificados)
    .innerJoin(s.tareas, eq(s.tareas.id, s.certificados.tareaId))
    .where(notInArray(s.certificados.estado, [...ESTADOS_CONGELADOS, 'BORRADOR']))
  let cambiados = 0
  for (const { c, tipo } of certs) {
    if (!c.primeraEmisionAt) continue
    const v = await valorizarCertificado(tx, c, tipo)
    if (c.subtotalActual !== v.subtotal) {
      await tx.insert(s.revalorizaciones).values({ certificadoId: c.id, lpuId, subtotalAnterior: c.subtotalActual ?? '0', subtotalNuevo: v.subtotal, motivo })
      await tx.update(s.certificados).set({ subtotalActual: v.subtotal, lpuActualId: v.lpuId }).where(eq(s.certificados.id, c.id))
      await registrarEvento(tx, actor, {
        entidad: 'certificado', entidadId: c.id, accion: 'revalorizar', cambios: { subtotal: { antes: c.subtotalActual, despues: v.subtotal }, lpuId }, comentario: motivo,
      })
      cambiados++
    }
  }
  // Los borradores solo actualizan el precio mostrado
  const borradores = await tx.select({ c: s.certificados, tipo: s.tareas.tipoTrabajo }).from(s.certificados)
    .innerJoin(s.tareas, eq(s.tareas.id, s.certificados.tareaId)).where(inArray(s.certificados.estado, ['BORRADOR']))
  for (const { c, tipo } of borradores) {
    const v = await valorizarCertificado(tx, c, tipo)
    await tx.update(s.certificados).set({ subtotalActual: v.subtotal, lpuActualId: v.lpuId }).where(eq(s.certificados.id, c.id))
  }
  return cambiados
}
