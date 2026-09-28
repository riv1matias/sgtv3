import ExcelJS from 'exceljs'
import type { Celda } from '@/domain/lpu'
import { ErrorNegocio } from '@/domain/flujo/motor'

export interface Hoja { nombre: string; grilla: Celda[][] }

function valorCelda(v: ExcelJS.CellValue): Celda {
  if (v == null) return null
  if (v instanceof Date) return v
  if (typeof v === 'object') {
    if ('result' in v) return valorCelda((v as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue)
    if ('richText' in v) return (v as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join('')
    if ('text' in v) return String((v as ExcelJS.CellHyperlinkValue).text)
    if ('error' in v) return null
    return null
  }
  return v as Celda
}

function parseCsv(texto: string): Celda[][] {
  const filas: string[][] = []
  const sep = (texto.split('\n')[0].match(/;/g)?.length ?? 0) > (texto.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ','
  let fila: string[] = []
  let campo = ''
  let comillas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (comillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++ } else if (c === '"') comillas = false
      else campo += c
    } else if (c === '"') comillas = true
    else if (c === sep) { fila.push(campo); campo = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      fila.push(campo); filas.push(fila); fila = []; campo = ''
    } else campo += c
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila) }
  return filas.map((f) => f.map((x) => { const n = Number(x.replace(',', '.')); return x.trim() !== '' && !isNaN(n) && /^-?[\d.,]+$/.test(x.trim()) ? n : x }))
}

/** Lee todas las hojas de un .xlsx o un .csv como grillas de valores */
export async function leerLibro(archivo: File | { name: string; buffer: Buffer }): Promise<Hoja[]> {
  const nombre = 'name' in archivo ? archivo.name : ''
  const buf = archivo instanceof File ? Buffer.from(await archivo.arrayBuffer()) : archivo.buffer
  const ext = nombre.toLowerCase().split('.').pop()
  if (ext === 'csv' || ext === 'txt') return [{ nombre: 'csv', grilla: parseCsv(buf.toString('utf8')) }]
  if (ext === 'xlsb' || ext === 'xls') throw new ErrorNegocio('Formato no soportado: guardá el archivo como Excel .xlsx o .csv')
  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.load(buf as unknown as ArrayBuffer)
  } catch {
    throw new ErrorNegocio('No se pudo leer el archivo Excel (.xlsx)')
  }
  const hojas: Hoja[] = []
  wb.eachSheet((ws) => {
    const grilla: Celda[][] = []
    ws.eachRow({ includeEmpty: true }, (row, n) => {
      const vals = row.values as ExcelJS.CellValue[]
      grilla[n - 1] = Array.from(vals.slice(1), (v) => valorCelda(v))
    })
    for (let i = 0; i < grilla.length; i++) if (!grilla[i]) grilla[i] = []
    hojas.push({ nombre: ws.name, grilla })
  })
  return hojas
}

/** Lee un detalle "código → cantidad" (documento de consumo SAP, stock, etc.) */
export function leerDetalleCodigos(grilla: Celda[][]): Map<string, number> {
  const norm = (v: Celda) => String(v ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
  let hdr = -1, cCod = -1, cCant = -1
  for (let r = 0; r < Math.min(grilla.length, 30) && hdr < 0; r++) {
    const f = grilla[r].map(norm)
    const cc = f.findIndex((c) => c.includes('MATERIAL') || c.includes('CODIGO') || c.includes('CATALOGO'))
    const cq = f.findIndex((c) => c.includes('CANT'))
    if (cc >= 0 && cq >= 0) { hdr = r; cCod = cc; cCant = cq }
  }
  const out = new Map<string, number>()
  if (hdr < 0) return out
  for (const f of grilla.slice(hdr + 1)) {
    const cod = String(f[cCod] ?? '').replace(/\.0+$/, '').trim()
    const cant = Number(f[cCant])
    if (!cod || !isFinite(cant)) continue
    out.set(cod, (out.get(cod) ?? 0) + Math.abs(cant))
  }
  return out
}

export async function libroABuffer(wb: ExcelJS.Workbook): Promise<Buffer> {
  return Buffer.from(await wb.xlsx.writeBuffer())
}
