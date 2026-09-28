import { requerirUsuario } from '@/server/sesion'
import { VistaCertificado } from '@/components/vista-certificado'

export default async function Pagina({ params }: { params: Promise<{ id: string }> }) {
  const u = await requerirUsuario('interno')
  return <VistaCertificado id={(await params).id} u={u} />
}
