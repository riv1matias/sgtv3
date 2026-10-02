import { usuarioActual } from '@/server/sesion'
import { buscarCodigos } from '@/server/servicios/lpu'

export async function GET(req: Request) {
  if (!(await usuarioActual())) return new Response('No autorizado', { status: 401 })
  const p = new URL(req.url).searchParams
  const lista = p.get('lista') === 'obras' ? 'obras' : p.get('lista') === 'mantenimiento' ? 'mantenimiento' : undefined
  const r = await buscarCodigos(p.get('q') ?? '', lista, 15)
  return Response.json(r.map((c) => ({
    id: c.id, codigoS4: c.codigoS4, descripcion: c.descripcion, unidad: c.unidad, categoria: c.categoria, alcance: c.alcance,
    montoAbierto: c.montoAbierto, requiereFactura: c.requiereFactura, soloUrgencia: c.soloUrgencia, requiereSegundaAprobacion: c.requiereSegundaAprobacion, precio: c.precio,
  })))
}
