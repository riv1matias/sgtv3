import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SignJWT, jwtVerify } from 'jose'
import { cargarUsuario, type Usuario } from './usuarios'

export type { Usuario }

const COOKIE = 'sgt_sesion'
const clave = () => new TextEncoder().encode(process.env.SESSION_SECRET ?? 'desarrollo-inseguro-cambiar-en-produccion-0000')

export async function crearSesion(usuarioId: string) {
  const token = await new SignJWT({ uid: usuarioId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(clave())
  ;(await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 12 * 3600 })
}

export async function cerrarSesion() {
  ;(await cookies()).delete(COOKIE)
}

async function usuarioIdDeSesion(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, clave())
    return typeof payload.uid === 'string' ? payload.uid : null
  } catch {
    return null
  }
}

/** Usuario de la sesión (memoizado por request) */
export const usuarioActual = cache(async (): Promise<Usuario | null> => {
  const id = await usuarioIdDeSesion()
  return id ? cargarUsuario(id) : null
})

/** Exige sesión y el portal correcto; redirige si no corresponde */
export async function requerirUsuario(portal?: 'interno' | 'contratista'): Promise<Usuario> {
  const u = await usuarioActual()
  if (!u) redirect('/login')
  if (portal && u.tipo !== portal) redirect(u.tipo === 'interno' ? '/i' : '/c')
  return u
}

export { tieneRol, esNacional, actorDe } from './usuarios'
