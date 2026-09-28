import { requerirUsuario } from '@/server/sesion'
import { ListaTareas } from '@/components/listados'

export const metadata = { title: 'Tareas' }

export default async function Pagina({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirUsuario('contratista')
  return <ListaTareas u={u} sp={await searchParams} portal="c" />
}
