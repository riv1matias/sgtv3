import { eq } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { requerirUsuario, tieneRol } from '@/server/sesion'
import { maestros } from '@/server/consultas'
import { AyudaContextual, Aviso, Encabezado } from '@/components/ui'
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
      <AyudaContextual titulo="Consejos para un buen pedido" href="/i/ayuda#guia-pedir">
        <ul>
          <li>Con la <b>ubicación</b> el sistema detecta la subregión y te muestra solo los contratistas habilitados.</li>
          <li>Describí el trabajo con detalle: el contratista lo usa para cotizar con los códigos de la LPU.</li>
          <li>Si ya lo pediste por teléfono o mensaje, marcá <b>urgencia</b> y dejá la justificación.</li>
          <li>Si el trabajo va a tener avances (por ejemplo, una obra), indicá cuántos certificados esperás.</li>
        </ul>
      </AyudaContextual>
      <FormNuevaTarea subregiones={subregiones} contratistas={contratistas} imputaciones={m.imputaciones} />
    </>
  )
}
