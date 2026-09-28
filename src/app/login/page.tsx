import { asc, eq } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { ingresarDev } from '@/app/acciones/sesion'
import { nombreRol } from '@/lib/etiquetas'

export const metadata = { title: 'Ingresar' }

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const oidc = process.env.AUTH_MODE === 'oidc'
  const usuarios = oidc ? [] : await getDb().select({ u: s.usuarios, rol: s.usuarioRoles.rol, contratista: s.contratistas.razonSocial }).from(s.usuarios)
    .leftJoin(s.usuarioRoles, eq(s.usuarioRoles.usuarioId, s.usuarios.id))
    .leftJoin(s.contratistas, eq(s.contratistas.id, s.usuarios.contratistaId))
    .where(eq(s.usuarios.activo, true)).orderBy(asc(s.usuarios.tipo), asc(s.usuarios.apellido))
  const agrupados = new Map<string, { u: (typeof usuarios)[number]['u']; roles: string[]; contratista: string | null }>()
  for (const x of usuarios) {
    const g = agrupados.get(x.u.id) ?? { u: x.u, roles: [], contratista: x.contratista }
    if (x.rol) g.roles.push(x.rol)
    agrupados.set(x.u.id, g)
  }
  const lista = [...agrupados.values()]
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-marca-900 via-marca-800 to-slate-900 p-4">
      <div className="w-full max-w-3xl">
        <div className="mb-6 text-center text-white">
          <div className="text-3xl font-semibold tracking-tight">SGT</div>
          <div className="mt-1 text-sm text-marca-100">Gestión de tareas y certificación de contratistas</div>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          {oidc ? (
            <div className="text-center">
              <p className="mb-4 text-sm text-slate-600">Ingresá con tu cuenta corporativa. Los contratistas usan su usuario externo.</p>
              <a href="/auth/login" className="inline-flex rounded-lg bg-marca-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-marca-700">Ingresar con IDIRA</a>
            </div>
          ) : (
            <>
              <h1 className="text-base font-semibold text-slate-900">Entorno de demostración</h1>
              <p className="mb-4 mt-1 text-sm text-slate-500">
                Elegí un usuario para ver el sistema con su perfil. En producción el ingreso es con el IdP corporativo (IDIRA). Todos los datos son ficticios.
              </p>
              {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">No se pudo ingresar con ese usuario.</p>}
              {(['interno', 'contratista'] as const).map((tipo) => (
                <div key={tipo} className="mb-5">
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{tipo === 'interno' ? 'Personal propio' : 'Contratistas'}</h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {lista.filter((x) => x.u.tipo === tipo).map((x) => (
                      <form key={x.u.id} action={ingresarDev}>
                        <input type="hidden" name="usuarioId" value={x.u.id} />
                        <button className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:border-marca-400 hover:bg-marca-50">
                          <div className="text-sm font-medium text-slate-900">{x.u.nombre} {x.u.apellido}</div>
                          <div className="text-xs text-slate-500">{x.roles.map(nombreRol).join(' · ')}{x.contratista ? ` — ${x.contratista}` : x.u.cargo ? ` — ${x.u.cargo}` : ''}</div>
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
