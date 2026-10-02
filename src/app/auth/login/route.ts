import { cookies } from 'next/headers'
import { urlDeIngreso } from '@/server/oidc'

/** Inicio del ingreso con el IdP corporativo (IDIRA) */
export async function GET() {
  if (process.env.AUTH_MODE !== 'oidc') return Response.redirect(new URL('/login', process.env.OIDC_REDIRECT_URI ?? 'http://localhost:3000'))
  const { url, state, nonce, verifier } = await urlDeIngreso()
  ;(await cookies()).set('sgt_oidc', JSON.stringify({ state, nonce, verifier }), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/auth', maxAge: 600 })
  return Response.redirect(url)
}
