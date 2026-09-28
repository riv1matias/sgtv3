import { requerirUsuario } from '@/server/sesion'
import { CentroAyuda } from '@/components/centro-ayuda'

export const metadata = { title: 'Ayuda' }

export default async function Ayuda() {
  const u = await requerirUsuario('interno')
  return <CentroAyuda u={u} portal="i" />
}
