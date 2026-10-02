import { requerirUsuario } from '@/server/sesion'
import { ListaCertificados } from '@/components/listados'

export const metadata = { title: 'Certificados' }

export default async function Pagina({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirUsuario('contratista')
  return <ListaCertificados u={u} sp={await searchParams} portal="c" />
}
