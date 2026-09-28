import { requerirUsuario } from '@/server/sesion'
import { DetalleTarea } from '@/components/detalle-tarea'

export default async function Pagina({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; creada?: string }> }) {
  const u = await requerirUsuario('interno')
  const [{ id }, sp] = await Promise.all([params, searchParams])
  return <DetalleTarea id={id} u={u} tab={sp.tab} creada={sp.creada === '1'} />
}
