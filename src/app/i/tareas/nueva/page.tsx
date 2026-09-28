import { eq } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { requerirUsuario, tieneRol } from '@/server/sesion'
import { maestros } from '@/server/consultas'
import { Aviso, Encabezado } from '@/components/ui'
import { FormNuevaTarea } from './form'

export const metadata = { title: 'Nueva tarea' }

export default async function NuevaTarea() {
  const u = await requerirUsuario('interno')
  if (!tieneRol(u, 'solicitante')) return <Aviso tono="alerta">Solo los solicitantes (técnicos, inspectores, supervisores, analistas) pueden pedir tareas.</Aviso>
  const m = await maestros(u)
  const polys = await getDb().select({ id: s.subregiones.id, poligono: s.subregiones.poligono }).from(s.subregiones)
  const subregiones = m.misSubregiones.map((x) => ({ ...x, poligono: polys.find((p) => p.id === x.id)?.poligono ?? null }))
  const contratistas = m.contratistas.filter((c) => !c.suspendido).map((c) => ({ id: c.id, razonSocial: c.razonSocial, subregiones: m.habilitaciones.filter((h) => h.contratistaId === c.id).map((h) => h.subregionId) }))
  void eq
  return (
    <>
      <Encabezado titulo="Nueva tarea" subtitulo="El contratista recibe el pedido y tiene 48 h para aceptarlo" volver={{ href: '/i/tareas', texto: 'Tareas' }} />
      <FormNuevaTarea subregiones={subregiones} contratistas={contratistas} imputaciones={m.imputaciones} />
    </>
  )
}
