/**
 * Importación de la LPU desde el Excel que envía Compras (hoja "Maestro" / "LPU…"): spec 06.
 * Trabaja sobre una grilla (filas × columnas) para no depender del formato del archivo.
 */
import { aTexto, dec } from './dinero'

export type Celda = string | number | Date | boolean | null | undefined

export interface FilaLpu {
  fila: number
  categoria: string | null
  codigoS4: string
  descripcion: string
  unidad: string
  aliases: Array<{ alias: string; origen: string }>
  precioMantenimiento: string | null
  precioObras: string | null
}

export interface LecturaLpu {
  filas: FilaLpu[]
  vigencia: string | null
  porcentaje: string | null
  errores: string[]
  hoja?: string
}

const norm = (v: Celda) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim()

function texto(v: Celda): string {
  if (v == null) return ''
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(v)
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  return String(v).trim()
}

function precio(v: Celda): string | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/\$|\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.'))
  if (!isFinite(n)) return null
  return aTexto(dec(n), 4)
}

function fecha(v: Celda): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    // Serial de Excel (días desde 1899-12-30)
    return new Date(Date.UTC(1899, 11, 30) + v * 86_400_000).toISOString().slice(0, 10)
  }
  const s = texto(v)
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return null
}

/** Encuentra la fila de encabezados y lee todos los códigos */
export function leerGrillaLpu(grilla: Celda[][]): LecturaLpu {
  const errores: string[] = []
  let vigencia: string | null = null
  let porcentaje: string | null = null

  let hdr = -1
  for (let r = 0; r < Math.min(grilla.length, 40); r++) {
    const fila = Array.from(grilla[r], norm)
    if (fila.includes('S4') && fila.some((c) => c.includes('DESCRIPCION'))) { hdr = r; break }
    const iv = fila.findIndex((c) => c === 'VIGENCIA')
    if (iv >= 0) {
      // La vigencia es la primera fecha razonable a la derecha (el Excel trae fechas "centinela" como 2049)
      for (const c of grilla[r].slice(iv + 1)) {
        const f = fecha(c)
        if (f && f < '2040-01-01') { vigencia = f; break }
      }
      const sig = grilla[r + 1]?.find((c) => typeof c === 'number' && c > 0 && c < 1)
      if (typeof sig === 'number') porcentaje = aTexto(dec(sig * 100), 4)
    }
  }
  if (hdr < 0) return { filas: [], vigencia, porcentaje, errores: ['No se encontró la fila de encabezados (se esperan las columnas "S4" y "DESCRIPCIÓN")'] }

  const h = Array.from(grilla[hdr], norm)
  const col = (pred: (c: string) => boolean) => h.findIndex(pred)
  const cS4 = col((c) => c === 'S4')
  const cDesc = col((c) => c.includes('DESCRIPCION'))
  const cUm = col((c) => c === 'UDM' || c === 'UNIDAD' || c === 'UM')
  const cMant = col((c) => c.includes('MANTENIMIENTO'))
  const cObras = col((c) => c.includes('OBRAS'))
  const cCat = col((c) => c.includes('STANDARD') || c.includes('MANUALES') || c === 'CATEGORIA')
  const cCod = col((c) => c === 'CODIGO')
  const cTeco = col((c) => c.includes('TECO'))
  const cCable = col((c) => c.includes('CABLE'))
  if (cMant < 0 && cObras < 0) errores.push('No se encontraron columnas de precio (MANTENIMIENTO / OBRAS)')
  if (cUm < 0) errores.push('No se encontró la columna de unidad de medida')

  const filas: FilaLpu[] = []
  const vistos = new Set<string>()
  for (let r = hdr + 1; r < grilla.length; r++) {
    const f = grilla[r]
    const s4 = texto(f[cS4]).replace(/\.0+$/, '')
    if (!s4) continue
    if (!/^\d+$/.test(s4)) { errores.push(`Fila ${r + 1}: código S4 inválido "${s4}"`); continue }
    if (vistos.has(s4)) { errores.push(`Fila ${r + 1}: código S4 duplicado ${s4}`); continue }
    vistos.add(s4)
    const aliases: FilaLpu['aliases'] = []
    const alias = (c: number, origen: string) => {
      const v = texto(f[c]).replace(/\.0+$/, '')
      if (c >= 0 && v && v !== s4 && /^[\w-]+$/.test(v) && !aliases.some((a) => a.alias === v)) aliases.push({ alias: v, origen })
    }
    alias(cCod, 'codigo')
    alias(cTeco, 'ex_teco')
    alias(cCable, 'ex_cable')
    const desc = texto(f[cDesc])
    const um = texto(f[cUm]).toUpperCase()
    if (!desc) errores.push(`Fila ${r + 1}: ${s4} sin descripción`)
    if (!um) errores.push(`Fila ${r + 1}: ${s4} sin unidad`)
    filas.push({
      fila: r + 1,
      categoria: cCat >= 0 ? texto(f[cCat]) || null : null,
      codigoS4: s4,
      descripcion: desc,
      unidad: um,
      aliases,
      precioMantenimiento: cMant >= 0 ? precio(f[cMant]) : null,
      precioObras: cObras >= 0 ? precio(f[cObras]) : null,
    })
  }
  if (filas.length === 0) errores.push('No se encontraron códigos')
  return { filas, vigencia, porcentaje, errores }
}

export interface CodigoActual { codigoS4: string; descripcion: string; unidad: string; activo: boolean }
export interface PrecioActual { codigoS4: string; lista: 'mantenimiento' | 'obras'; precio: string }

export interface DiferenciaLpu {
  altas: FilaLpu[]
  bajas: CodigoActual[]
  cambiosDescripcion: Array<{ codigoS4: string; antes: string; despues: string }>
  cambiosUnidad: Array<{ codigoS4: string; antes: string; despues: string }>
  variaciones: Array<{ codigoS4: string; descripcion: string; lista: string; antes: string; despues: string; variacionPct: number | null }>
  variacionPromedio: { mantenimiento: number | null; obras: number | null }
  sinCambios: number
}

/** Compara la LPU leída contra el catálogo y la LPU vigente */
export function diferenciaLpu(lectura: LecturaLpu, codigos: CodigoActual[], precios: PrecioActual[]): DiferenciaLpu {
  const porCodigo = new Map(codigos.map((c) => [c.codigoS4, c]))
  const precio = new Map(precios.map((p) => [`${p.codigoS4}:${p.lista}`, p.precio]))
  const nuevos = new Set(lectura.filas.map((f) => f.codigoS4))
  const d: DiferenciaLpu = { altas: [], bajas: [], cambiosDescripcion: [], cambiosUnidad: [], variaciones: [], variacionPromedio: { mantenimiento: null, obras: null }, sinCambios: 0 }
  const acum: Record<string, number[]> = { mantenimiento: [], obras: [] }
  for (const f of lectura.filas) {
    const c = porCodigo.get(f.codigoS4)
    if (!c) { d.altas.push(f); continue }
    let cambio = false
    if (c.descripcion !== f.descripcion) { d.cambiosDescripcion.push({ codigoS4: f.codigoS4, antes: c.descripcion, despues: f.descripcion }); cambio = true }
    if (c.unidad !== f.unidad) { d.cambiosUnidad.push({ codigoS4: f.codigoS4, antes: c.unidad, despues: f.unidad }); cambio = true }
    for (const lista of ['mantenimiento', 'obras'] as const) {
      const nuevo = lista === 'mantenimiento' ? f.precioMantenimiento : f.precioObras
      const antes = precio.get(`${f.codigoS4}:${lista}`) ?? null
      if ((nuevo ?? '0') === (antes ?? '0') || (nuevo != null && antes != null && dec(nuevo) === dec(antes))) continue
      const a = antes != null ? Number(antes) : 0
      const n = nuevo != null ? Number(nuevo) : 0
      const pct = a > 0 && n > 0 ? ((n - a) / a) * 100 : null
      if (pct != null) acum[lista].push(pct)
      d.variaciones.push({ codigoS4: f.codigoS4, descripcion: f.descripcion, lista, antes: antes ?? '0', despues: nuevo ?? '0', variacionPct: pct })
      cambio = true
    }
    if (!cambio) d.sinCambios++
  }
  for (const c of codigos) if (c.activo && !nuevos.has(c.codigoS4)) d.bajas.push(c)
  const prom = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
  d.variacionPromedio = { mantenimiento: prom(acum.mantenimiento), obras: prom(acum.obras) }
  return d
}
