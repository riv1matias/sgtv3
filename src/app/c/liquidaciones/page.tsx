import { requerirUsuario } from '@/server/sesion'
import { ListaLiquidaciones } from '@/components/liquidaciones'

export const metadata = { title: 'Liquidaciones' }

export default async function Pagina() {
  return <ListaLiquidaciones u={await requerirUsuario('contratista')} />
}
