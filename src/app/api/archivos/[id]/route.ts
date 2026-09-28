import { and, eq, or, sql } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { usuarioActual } from '@/server/sesion'
import { leerArchivo } from '@/server/archivos'

/** Descarga de archivos con control de acceso: un contratista solo accede a lo vinculado a su empresa */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const u = await usuarioActual()
  if (!u) return new Response('No autorizado', { status: 401 })
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response('No encontrado', { status: 404 })
  const db = getDb()
  const [doc] = await db.select().from(s.documentos).where(eq(s.documentos.id, id))
  if (!doc) return new Response('No encontrado', { status: 404 })
  if (u.tipo === 'contratista') {
    const cid = u.contratistaId ?? -1
    const r = await db.execute<{ ok: number }>(sql`
      select 1 as ok where exists (select 1 from certificado_documentos cd join certificados c on c.id = cd.certificado_id where cd.documento_id = ${id} and c.contratista_id = ${cid})
        or exists (select 1 from tarea_documentos td join tareas t on t.id = td.tarea_id where td.documento_id = ${id} and t.contratista_id = ${cid})
        or exists (select 1 from tarea_bitacora b join tareas t on t.id = b.tarea_id where b.documento_id = ${id} and t.contratista_id = ${cid})
        or exists (select 1 from certificado_items i join certificados c on c.id = i.certificado_id where i.factura_documento_id = ${id} and c.contratista_id = ${cid})
        or exists (select 1 from liquidaciones l where l.factura_documento_id = ${id} and l.contratista_id = ${cid})
        or ${doc.subidoPor} = ${u.id}`)
    if (!r.rows.length) return new Response('No autorizado', { status: 403 })
  }
  void and; void or
  const buf = await leerArchivo(doc.storageKey)
  const descargar = new URL(req.url).searchParams.has('descargar')
  const inline = !descargar && /^(image\/|application\/pdf)/.test(doc.mime ?? '')
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': doc.mime || 'application/octet-stream',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(doc.nombre)}`,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
