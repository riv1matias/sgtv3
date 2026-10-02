/**
 * Política de precios (spec 03 §5): qué LPU se aplica a un certificado no cerrado
 * y cómo se revaloriza cuando se publica una nueva.
 */
import { aTexto, dec, mul, porcentaje, redondear, suma, type Decimal } from './dinero'

export type ListaPrecio = 'mantenimiento' | 'obras'

export interface PoliticaPrecios {
  /** Fecha que determina la LPU: primera emisión o cierre del período */
  referencia: 'emision' | 'cierre'
  aplicarSubas: boolean
  aplicarBajas: boolean
}

export const POLITICA_DEFECTO: PoliticaPrecios = { referencia: 'cierre', aplicarSubas: true, aplicarBajas: false }

export interface LpuResumen { id: number; vigenciaDesde: string; estado: string }

/** Lista de precio según el tipo de trabajo (Eventos usa la de mantenimiento, a confirmar: P8) */
export function listaPara(tipoTrabajo: string): ListaPrecio {
  return tipoTrabajo === 'obra' ? 'obras' : 'mantenimiento'
}

/** LPU publicada vigente a una fecha (YYYY-MM-DD): manda la vigencia, no la publicación */
export function lpuVigente<T extends LpuResumen>(lpus: T[], fecha: string): T | null {
  let mejor: T | null = null
  for (const l of lpus) {
    if (l.estado !== 'publicada' || l.vigenciaDesde > fecha) continue
    if (!mejor || l.vigenciaDesde > mejor.vigenciaDesde || (l.vigenciaDesde === mejor.vigenciaDesde && l.id > mejor.id)) mejor = l
  }
  return mejor
}

/** Fecha de referencia del precio para un certificado no cerrado */
export function fechaReferencia(p: PoliticaPrecios, primeraEmision: string | null, hoy: string, precioForzado?: string | null): string {
  if (precioForzado === 'emision' && primeraEmision) return primeraEmision
  if (precioForzado === 'actualizado') return hoy
  if (p.referencia === 'emision' && primeraEmision) return primeraEmision
  return hoy
}

/** Aplica la política de subas y bajas respecto del precio de emisión */
export function precioSegunPolitica(p: PoliticaPrecios, precioEmision: Decimal | null, candidato: Decimal): Decimal {
  if (precioEmision == null) return candidato
  if (candidato > precioEmision && !p.aplicarSubas) return precioEmision
  if (candidato < precioEmision && !p.aplicarBajas) return precioEmision
  return candidato
}

export interface ItemValorizable {
  tipo: 'mo' | 'material' | 'recuperado'
  codigoMoId?: number | null
  cantidad?: string | null
  importe?: string | null
  montoAbierto?: boolean
  /** Precio congelado a la primera emisión del ítem */
  precioEmision?: string | null
}

export interface Valorizacion {
  lineas: Array<{ precioUnitario: string | null; subtotal: string }>
  subtotal: string
  iva: string
  total: string
  sinPrecio: number[]
}

/**
 * Valoriza los ítems de MO. precioDe(codigoId) devuelve el precio de la LPU aplicable (o null si no hay),
 * precioEmisionDe devuelve el precio que tenía al emitirse (para la política de subas/bajas).
 */
export function valorizar(
  items: ItemValorizable[],
  precioDe: (codigoId: number) => string | null,
  opciones: { politica?: PoliticaPrecios; precioEmisionDe?: (codigoId: number) => string | null; alicuotaIva?: string } = {},
): Valorizacion {
  const pol = opciones.politica ?? POLITICA_DEFECTO
  const sinPrecio: number[] = []
  const lineas = items.map((it) => {
    if (it.tipo !== 'mo') return { precioUnitario: null, subtotal: '0.00' }
    if (it.montoAbierto) return { precioUnitario: null, subtotal: aTexto(redondear(dec(it.importe))) }
    const p = it.codigoMoId != null ? precioDe(it.codigoMoId) : null
    if (p == null) {
      if (it.codigoMoId != null) sinPrecio.push(it.codigoMoId)
      return { precioUnitario: null, subtotal: '0.00' }
    }
    const pe = it.precioEmision ?? (opciones.precioEmisionDe && it.codigoMoId != null ? opciones.precioEmisionDe(it.codigoMoId) : null)
    const precio = precioSegunPolitica(pol, pe != null ? dec(pe) : null, dec(p))
    return { precioUnitario: aTexto(precio, 4), subtotal: aTexto(redondear(mul(dec(it.cantidad), precio))) }
  })
  const sub = suma(lineas.map((l) => dec(l.subtotal)))
  const alicuota = dec(opciones.alicuotaIva ?? '21')
  const iva = redondear(porcentaje(sub, alicuota))
  return { lineas, subtotal: aTexto(sub), iva: aTexto(iva), total: aTexto(sub + iva), sinPrecio }
}

/** IVA y total a partir de un subtotal neto */
export function conIva(subtotal: string, alicuota = '21') {
  const s = dec(subtotal)
  const iva = redondear(porcentaje(s, dec(alicuota)))
  return { subtotal: aTexto(s), iva: aTexto(iva), total: aTexto(s + iva) }
}
