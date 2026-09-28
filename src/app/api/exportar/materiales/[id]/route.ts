import ExcelJS from 'exceljs'
import { and, eq } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { usuarioActual } from '@/server/sesion'
import { puedeVerCertificado, obtenerCertificado } from '@/server/servicios/certificados'
import { registrarEvento } from '@/server/auditoria'
import { actorDe } from '@/server/usuarios'
import { libroABuffer } from '@/server/excel'

/** Reporte de materiales con el formato del "Formulario de consumos" que usa Administración para SAP */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const u = await usuarioActual()
  if (!u || u.tipo !== 'interno') return new Response('No autorizado', { status: 401 })
  const { cert: c, tarea: t } = await obtenerCertificado((await params).id).catch(() => ({ cert: null, tarea: null }) as never)
  if (!c || !puedeVerCertificado(u, c, t)) return new Response('No encontrado', { status: 404 })
  const db = getDb()
  const [imp] = t.imputacionId ? await db.select().from(s.imputaciones).where(eq(s.imputaciones.id, t.imputacionId)) : []
  const [contr] = await db.select().from(s.contratistas).where(eq(s.contratistas.id, c.contratistaId))
  const items = await db.select({ i: s.certificadoItems, m: s.materiales }).from(s.certificadoItems).innerJoin(s.materiales, eq(s.materiales.id, s.certificadoItems.materialId))
    .where(and(eq(s.certificadoItems.certificadoId, c.id), eq(s.certificadoItems.version, c.versionActual)))
  const extra = t.datosExtra as Record<string, string>
  const wb = new ExcelJS.Workbook()
  for (const [nombre, tipo] of [['Consumo', 'material'], ['Recuperados', 'recuperado']] as const) {
    const filas = items.filter((x) => x.i.tipo === tipo)
    if (!filas.length) continue
    const ws = wb.addWorksheet(nombre)
    ws.addRow([nombre === 'Consumo' ? 'FORMULARIO DE CONSUMOS' : 'INGRESO DE MATERIALES RECUPERADOS'])
    ws.addRow(['EC', contr.razonSocial, 'Certificado', c.numero, 'Tarea', t.numero])
    ws.addRow(['IMPUTACIÓN', imp?.numero ?? '', 'CENTRO', c.centro ?? '', 'ALMACÉN', c.almacen ?? ''])
    ws.addRow([])
    const h = ws.addRow(['CODIGO', 'DESCRIPCION', 'CANTIDAD', 'UM', 'CENTRO', 'ALMACEN', 'PEP', 'GRAFO', 'CUENTA', 'CeBe', 'OBSERVACIONES'])
    h.font = { bold: true }
    for (const x of filas) {
      ws.addRow([x.m.codigoSap, x.m.descripcion, Number(x.i.cantidad), x.m.unidad, c.centro, c.almacen, imp?.tipo === 'pep' ? imp.numero : '', extra.grafo ?? '', '', '', [x.i.estadoRecuperado, x.i.observacion].filter(Boolean).join(' · ')])
    }
    ws.columns.forEach((col, i) => { col.width = [12, 45, 10, 6, 8, 8, 18, 10, 10, 10, 30][i] })
  }
  await registrarEvento(db, actorDe(u, 'administracion'), { entidad: 'certificado', entidadId: c.id, accion: 'exportar_materiales', cambios: { version: c.versionActual } })
  return new Response(new Uint8Array(await libroABuffer(wb)), {
    headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="materiales-${c.numero}.xlsx"` },
  })
}
