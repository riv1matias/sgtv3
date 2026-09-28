import { cookies } from 'next/headers'
import { eq, or } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { canjearCodigo } from '@/server/oidc'
import { crearSesion } from '@/server/sesion'
import { registrarEvento } from '@/server/auditoria'

/**
 * Vuelta del IdP. El usuario debe existir (alta por sincronización con el directorio o por un administrador):
 * se vincula por sujeto del IdP o, la primera vez, por email.
 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const base = new URL('/', url)
  const jar = await cookies()
  const guardado = jar.get('sgt_oidc')?.value
  jar.delete('sgt_oidc')
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!guardado || !code || !state) return Response.redirect(new URL('/login?error=1', base))
  const g = JSON.parse(guardado) as { state: string; nonce: string; verifier: string }
  if (g.state !== state) return Response.redirect(new URL('/login?error=1', base))
  const id = await canjearCodigo(code, g.verifier, g.nonce)
  const db = getDb()
  const [u] = await db.select().from(s.usuarios).where(or(eq(s.usuarios.idpSubject, id.sub), id.email ? eq(s.usuarios.email, id.email.toLowerCase()) : eq(s.usuarios.idpSubject, id.sub)))
  if (!u || !u.activo) return Response.redirect(new URL('/login?error=1', base))
  if (!u.idpSubject) await db.update(s.usuarios).set({ idpSubject: id.sub }).where(eq(s.usuarios.id, u.id))
  await crearSesion(u.id)
  await registrarEvento(db, { id: u.id, nombreCompleto: `${u.nombre} ${u.apellido}` }, { entidad: 'usuario', entidadId: u.id, accion: 'ingresar', comentario: 'Ingreso con IDIRA' })
  return Response.redirect(new URL(u.tipo === 'interno' ? '/i' : '/c', base))
}
