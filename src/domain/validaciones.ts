/**
 * Validaciones del certificado al emitir (spec 05 "Validaciones y alertas").
 * Bloqueantes: impiden emitir. Alertas: no bloquean; las ve y resuelve el validador.
 */
import { dec, esPositivo } from './dinero'

export interface ItemEntrada {
  tipo: 'mo' | 'material' | 'recuperado'
  codigoMoId?: number | null
  materialId?: number | null
  cantidad?: string | null
  importe?: string | null
  justificacion?: string | null
  facturaNumero?: string | null
  facturaCuit?: string | null
  facturaFecha?: string | null
  facturaImporte?: string | null
  facturaDocumentoId?: string | null
}

export interface CodigoInfo {
  id: number
  codigoS4: string
  descripcion: string
  montoAbierto: boolean
  requiereFactura: boolean
  soloUrgencia: boolean
  umbralAlerta: string | null
  activo: boolean
}

export interface MaterialInfo { id: number; codigoSap: string; descripcion: string; umbralAlerta: string | null; activo: boolean; recuperable: boolean }

export interface ReglaInfo {
  id: number
  tipo: 'requiere_codigo_base' | 'incompatible' | 'maximo_por_certificado' | 'solo_tipo_trabajo' | string
  codigoMoId: number
  codigoRelacionadoId: number | null
  parametro: string | null
  mensaje: string
}

export interface EntradaValidacion {
  items: ItemEntrada[]
  codigos: Map<number, CodigoInfo>
  materiales: Map<number, MaterialInfo>
  reglas: ReglaInfo[]
  tarea: { urgencia: boolean; tipoTrabajo: string; imputacionId: number | null }
  cabecera: { periodo?: string | null; fechaEjecDesde?: string | null; fechaEjecHasta?: string | null }
  cantidadDocumentos: number
  tienePrecio: (codigoMoId: number) => boolean
  hoy: string
  antiguedadMaximaDias: number
}

export interface Hallazgo { mensaje: string; item?: number; tipo?: string; evidencia?: Record<string, unknown> }
export interface ResultadoValidacion { bloqueantes: Hallazgo[]; alertas: Hallazgo[] }

export function validarEmision(e: EntradaValidacion): ResultadoValidacion {
  const bloqueantes: Hallazgo[] = []
  const alertas: Hallazgo[] = []
  const mo = e.items.map((it, i) => ({ it, i })).filter((x) => x.it.tipo === 'mo')

  if (mo.length === 0) bloqueantes.push({ mensaje: 'El certificado debe tener al menos un ítem de mano de obra' })
  if (e.cantidadDocumentos === 0) bloqueantes.push({ mensaje: 'Adjuntá al menos un documento (fotos, conforme a obra, remitos…)' })
  if (!e.tarea.imputacionId) bloqueantes.push({ mensaje: 'La tarea no tiene imputación asignada: pedile al solicitante que la defina' })
  if (!e.cabecera.fechaEjecDesde || !e.cabecera.fechaEjecHasta) bloqueantes.push({ mensaje: 'Completá las fechas reales de ejecución' })
  else if (e.cabecera.fechaEjecDesde > e.cabecera.fechaEjecHasta) bloqueantes.push({ mensaje: 'La fecha de inicio de ejecución es posterior a la de fin' })
  else if (e.cabecera.fechaEjecHasta > e.hoy) bloqueantes.push({ mensaje: 'La fecha de fin de ejecución no puede ser futura' })
  if (!e.cabecera.periodo) bloqueantes.push({ mensaje: 'Indicá el período de certificación' })

  const conteo = new Map<number, number>()
  for (const { it, i } of mo) {
    const c = it.codigoMoId != null ? e.codigos.get(it.codigoMoId) : undefined
    if (!c) { bloqueantes.push({ mensaje: 'Ítem de mano de obra sin código válido', item: i }); continue }
    conteo.set(c.id, (conteo.get(c.id) ?? 0) + 1)
    const nombre = `${c.codigoS4} ${c.descripcion}`
    if (c.montoAbierto) {
      if (!esPositivo(it.importe)) bloqueantes.push({ mensaje: `${nombre}: indicá el importe`, item: i })
      if (!it.justificacion?.trim()) bloqueantes.push({ mensaje: `${nombre}: la justificación es obligatoria`, item: i })
    } else {
      if (!esPositivo(it.cantidad)) bloqueantes.push({ mensaje: `${nombre}: la cantidad debe ser mayor a cero`, item: i })
      if (!e.tienePrecio(c.id)) bloqueantes.push({ mensaje: `${nombre}: el código no aplica a trabajos de tipo ${e.tarea.tipoTrabajo} (sin precio en la LPU)`, item: i })
    }
    if (c.requiereFactura) {
      if (!it.facturaNumero || !it.facturaCuit || !it.facturaFecha || !esPositivo(it.facturaImporte) || !it.facturaDocumentoId) {
        bloqueantes.push({ mensaje: `${nombre}: adjuntá la factura del proveedor con número, CUIT, fecha e importe`, item: i })
      } else if (esPositivo(it.importe) && dec(it.importe) !== dec(it.facturaImporte)) {
        alertas.push({ tipo: 'factura_diferente', mensaje: `${nombre}: el importe cargado difiere del de la factura`, item: i, evidencia: { importe: it.importe, factura: it.facturaImporte } })
      }
      if (it.facturaCuit && !cuitValido(it.facturaCuit)) alertas.push({ tipo: 'factura_cuit', mensaje: `${nombre}: el CUIT de la factura no es válido`, item: i })
    }
    if (c.soloUrgencia && !e.tarea.urgencia) bloqueantes.push({ mensaje: `${nombre}: solo se puede certificar en tareas marcadas como urgencia`, item: i })
    if (!c.activo) alertas.push({ tipo: 'codigo_baja', mensaje: `${nombre}: el código fue dado de baja en la LPU vigente`, item: i })
    const valor = c.montoAbierto ? it.importe : it.cantidad
    if (c.umbralAlerta && esPositivo(valor) && dec(valor) > dec(c.umbralAlerta)) {
      alertas.push({ tipo: 'umbral', mensaje: `${nombre}: ${c.montoAbierto ? 'importe' : 'cantidad'} atípica (supera ${c.umbralAlerta})`, item: i, evidencia: { valor, umbral: c.umbralAlerta } })
    }
  }

  for (const [i, it] of e.items.entries()) {
    if (it.tipo === 'mo') continue
    const m = it.materialId != null ? e.materiales.get(it.materialId) : undefined
    const que = it.tipo === 'material' ? 'Material' : 'Material recuperado'
    if (!m) { bloqueantes.push({ mensaje: `${que} sin código válido`, item: i }); continue }
    if (!esPositivo(it.cantidad)) bloqueantes.push({ mensaje: `${m.codigoSap} ${m.descripcion}: la cantidad debe ser mayor a cero`, item: i })
    if (!m.activo) alertas.push({ tipo: 'material_baja', mensaje: `${m.codigoSap}: material inactivo en el catálogo`, item: i })
    if (it.tipo === 'recuperado' && !m.recuperable) alertas.push({ tipo: 'no_recuperable', mensaje: `${m.codigoSap}: el material no figura como recuperable`, item: i })
    if (m.umbralAlerta && esPositivo(it.cantidad) && dec(it.cantidad) > dec(m.umbralAlerta)) {
      alertas.push({ tipo: 'umbral', mensaje: `${m.codigoSap} ${m.descripcion}: cantidad atípica (supera ${m.umbralAlerta})`, item: i })
    }
  }

  // Reglas de negocio definidas por CERCO
  const codigosPresentes = new Set(conteo.keys())
  for (const r of e.reglas) {
    if (!codigosPresentes.has(r.codigoMoId)) continue
    const idx = mo.find((x) => x.it.codigoMoId === r.codigoMoId)?.i
    switch (r.tipo) {
      case 'requiere_codigo_base':
        if (r.codigoRelacionadoId != null && !codigosPresentes.has(r.codigoRelacionadoId)) alertas.push({ tipo: 'regla_codigo', mensaje: r.mensaje, item: idx, evidencia: { regla: r.id } })
        break
      case 'incompatible':
        if (r.codigoRelacionadoId != null && codigosPresentes.has(r.codigoRelacionadoId)) alertas.push({ tipo: 'regla_codigo', mensaje: r.mensaje, item: idx, evidencia: { regla: r.id } })
        break
      case 'maximo_por_certificado':
        if ((conteo.get(r.codigoMoId) ?? 0) > Number(r.parametro ?? 1)) alertas.push({ tipo: 'regla_codigo', mensaje: r.mensaje, item: idx, evidencia: { regla: r.id } })
        break
      case 'solo_tipo_trabajo':
        if (r.parametro && !r.parametro.split(',').includes(e.tarea.tipoTrabajo)) alertas.push({ tipo: 'regla_codigo', mensaje: r.mensaje, item: idx, evidencia: { regla: r.id } })
        break
    }
  }

  if (e.cabecera.fechaEjecHasta && diasEntre(e.cabecera.fechaEjecHasta, e.hoy) > e.antiguedadMaximaDias) {
    alertas.push({ tipo: 'tardio', mensaje: `Trabajo certificado ${diasEntre(e.cabecera.fechaEjecHasta, e.hoy)} días después de ejecutado (máximo ${e.antiguedadMaximaDias})` })
  }

  return { bloqueantes, alertas }
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(hasta + 'T00:00:00Z') - Date.parse(desde + 'T00:00:00Z')) / 86_400_000)
}

/** Dígito verificador de CUIT/CUIL */
export function cuitValido(cuit: string): boolean {
  const d = cuit.replace(/\D/g, '')
  if (d.length !== 11) return false
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  const s = pesos.reduce((acc, p, i) => acc + p * Number(d[i]), 0)
  let v = 11 - (s % 11)
  if (v === 11) v = 0
  if (v === 10) v = 9
  return v === Number(d[10])
}

/** Solo cambiaron materiales/recuperados entre dos versiones (para el rebote) */
export function soloMaterialesCambiaron(anterior: ItemEntrada[], nueva: ItemEntrada[]): boolean {
  const firma = (xs: ItemEntrada[]) => xs.filter((x) => x.tipo === 'mo')
    .map((x) => `${x.codigoMoId}|${x.cantidad ? dec(x.cantidad) : ''}|${x.importe ? dec(x.importe) : ''}`).sort().join(';')
  return firma(anterior) === firma(nueva)
}
