'use server'

import { redirect } from 'next/navigation'
import { cerrarSesion, crearSesion, requerirUsuario } from '@/server/sesion'
import { cargarUsuario } from '@/server/usuarios'
import { getDb } from '@/db'
import { registrarEvento } from '@/server/auditoria'
import { eq } from 'drizzle-orm'
import { schema as s } from '@/db'

/** Ingreso de desarrollo: elegir un usuario de prueba. En producción se usa el IdP corporativo (IDIRA). */
export async function ingresarDev(fd: FormData) {
  if (process.env.AUTH_MODE === 'oidc') throw new Error('El ingreso de desarrollo está deshabilitado')
  const id = String(fd.get('usuarioId') ?? '')
  const u = await cargarUsuario(id)
  if (!u) redirect('/login?error=1')
  await crearSesion(u.id)
  await registrarEvento(getDb(), { id: u.id, nombreCompleto: u.nombreCompleto, rol: u.roles[0] ?? null, empresa: u.contratistaNombre }, { entidad: 'usuario', entidadId: u.id, accion: 'ingresar', comentario: 'Ingreso (modo desarrollo)' })
  redirect(u.tipo === 'interno' ? '/i' : u.roles.includes('contratista_tecnico') && !u.roles.includes('contratista_responsable') ? '/campo' : '/c')
}

export async function salir() {
  await cerrarSesion()
  redirect('/login')
}

export async function marcarNotificacionesLeidas() {
  const u = await requerirUsuario()
  await getDb().update(s.notificaciones).set({ leida: true }).where(eq(s.notificaciones.usuarioId, u.id))
  redirect(u.tipo === 'interno' ? '/i/notificaciones' : '/c/notificaciones')
}
