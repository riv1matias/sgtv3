import { requerirUsuario } from '@/server/sesion'
import { Notificaciones } from '@/components/comunes'

export const metadata = { title: 'Notificaciones' }

export default async function Pagina() {
  return <Notificaciones u={await requerirUsuario('contratista')} />
}
