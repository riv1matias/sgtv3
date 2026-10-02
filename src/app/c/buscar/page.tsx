import { requerirUsuario } from '@/server/sesion'
import { Busqueda } from '@/components/comunes'

export const metadata = { title: 'Buscar' }

export default async function Pagina({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const u = await requerirUsuario('contratista')
  return <Busqueda u={u} q={(await searchParams).q ?? ''} />
}
