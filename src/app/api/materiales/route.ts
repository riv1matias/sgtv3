import { usuarioActual } from '@/server/sesion'
import { buscarMateriales } from '@/server/servicios/lpu'

export async function GET(req: Request) {
  if (!(await usuarioActual())) return new Response('No autorizado', { status: 401 })
  const r = await buscarMateriales(new URL(req.url).searchParams.get('q') ?? '', 15)
  return Response.json(r.map((m) => ({ id: m.id, codigoSap: m.codigoSap, descripcion: m.descripcion, unidad: m.unidad, recuperable: m.recuperable })))
}
