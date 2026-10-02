import { NextResponse, type NextRequest } from 'next/server'

/**
 * Encabezados de seguridad y separación de portales por dominio.
 * Si se configuran PORTAL_INTERNO_HOST / PORTAL_CONTRATISTAS_HOST, cada dominio solo sirve su portal.
 */
export function proxy(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  const path = req.nextUrl.pathname
  const interno = process.env.PORTAL_INTERNO_HOST
  const contratistas = process.env.PORTAL_CONTRATISTAS_HOST
  if (contratistas && host === contratistas && path.startsWith('/i')) return new NextResponse('No encontrado', { status: 404 })
  if (interno && host === interno && (path.startsWith('/c') || path.startsWith('/campo'))) return new NextResponse('No encontrado', { status: 404 })
  const res = NextResponse.next()
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('Permissions-Policy', 'camera=(self), geolocation=(self), microphone=()')
  if (process.env.NODE_ENV === 'production') res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  return res
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
