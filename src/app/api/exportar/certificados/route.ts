import ExcelJS from 'exceljs'
import { usuarioActual } from '@/server/sesion'
import { listarCertificados } from '@/server/consultas'
import { registrarEvento } from '@/server/auditoria'
import { actorDe } from '@/server/usuarios'
import { libroABuffer } from '@/server/excel'
import { getDb } from '@/db'

/** Exportación del listado de certificados (respeta alcance; los contratistas solo exportan lo propio, con campos limitados) */
export async function GET(req: Request) {
  const u = await usuarioActual()
  if (!u) return new Response('No autorizado', { status: 401 })
  const sp = Object.fromEntries(new URL(req.url).searchParams.entries())
  const filas = []
  for (let pagina = 1; pagina <= 400; pagina++) {
    const r = await listarCertificados(u, { ...sp, pagina })
    filas.push(...r.filas)
    if (r.filas.length < 25) break
  }
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Certificados')
  const interno = u.tipo === 'interno'
  const cab = ['Certificado', 'Tarea', 'Título', 'Tipo', 'Subregión', ...(interno ? ['Contratista', 'Solicitante'] : []), 'Estado', 'Período', 'Subtotal actual', 'Subtotal final']
  ws.addRow(cab).font = { bold: true }
  for (const f of filas) ws.addRow([f.numero, f.tareaNumero, f.titulo, f.tipoTrabajo, f.subregion, ...(interno ? [f.contratista, f.solicitanteNombre] : []), f.estado, f.periodo, Number(f.subtotal ?? 0), f.subtotalFinal ? Number(f.subtotalFinal) : null])
  ws.columns.forEach((c) => { c.width = 18 })
  await registrarEvento(getDb(), actorDe(u), { entidad: 'exportacion', entidadId: 'certificados', accion: 'exportar', cambios: { filtros: sp, filas: filas.length } })
  return new Response(new Uint8Array(await libroABuffer(wb)), {
    headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="certificados.xlsx"' },
  })
}
