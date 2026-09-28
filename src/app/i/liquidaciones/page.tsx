import { requerirUsuario } from '@/server/sesion'
import { ListaLiquidaciones } from '@/components/liquidaciones'

export const metadata = { title: 'Liquidaciones' }

export default async function Pagina({ searchParams }: { searchParams: Promise<{ cerrado?: string }> }) {
  return <ListaLiquidaciones u={await requerirUsuario('interno')} cerrado={(await searchParams).cerrado} />
}
