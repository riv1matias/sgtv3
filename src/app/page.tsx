import { redirect } from 'next/navigation'
import { usuarioActual } from '@/server/sesion'

export default async function Inicio() {
  const u = await usuarioActual()
  if (!u) redirect('/login')
  redirect(u.tipo === 'interno' ? '/i' : '/c')
}
