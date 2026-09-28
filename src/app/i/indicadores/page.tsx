import { requerirUsuario } from '@/server/sesion'
import { Tablero } from '@/components/tablero'

export const metadata = { title: 'Indicadores' }

export default async function Pagina({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirUsuario('interno')
  return <Tablero u={u} f={await searchParams} />
}
