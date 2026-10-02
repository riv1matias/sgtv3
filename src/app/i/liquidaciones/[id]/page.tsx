import { requerirUsuario } from '@/server/sesion'
import { DetalleLiquidacion } from '@/components/liquidaciones'

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const u = await requerirUsuario('interno')
  return <DetalleLiquidacion id={Number((await params).id)} u={u} />
}
