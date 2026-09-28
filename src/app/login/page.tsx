import { asc, eq } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { ingresarDev } from '@/app/acciones/sesion'
import { nombreRol } from '@/lib/etiquetas'
import { Icono, Marca, type NombreIcono } from '@/components/iconos'

export const metadata = { title: 'Ingresar' }

/** Qué puede hacer cada perfil, para elegir con qué usuario recorrer la demo */
const QUE_HACE: Record<string, string> = {
  solicitante: 'Pide trabajos y valida lo certificado',
  supervisor: 'Ve a su equipo y aprueba en su lugar',
  gerente: 'Segunda aprobación por códigos especiales',
  administracion: 'Materiales, SAP y liquidaciones',
  cerco: 'Aprobación final de mantenimiento',
  adm_obra: 'Aprobación final de obras',
  compras: 'Publica la LPU',
  auditor: 'Consulta la auditoría completa',
  admin_sistema: 'Configura el sistema',
  contratista_responsable: 'Acepta tareas, certifica y factura',
  contratista_tecnico: 'Carga la bitácora desde el celular',
}

const RECORRIDOS: Array<{ titulo: string; texto: string; quien: string; icono: NombreIcono }> = [
  { titulo: 'Certificar como proveedor', texto: 'Tarea T-AMBA-000014 lista para certificar: códigos LPU, materiales, fotos y emisión.', quien: 'Mariana López', icono: 'certificado' },
  { titulo: 'Validar como solicitante', texto: 'Bandeja de validación técnica: aprobar, observar por ítem o pedir retiro.', quien: 'Lucía Fernández', icono: 'check' },
  { titulo: 'Materiales y SAP', texto: 'Reporte SAP, documento de consumo y comparación automática.', quien: 'Sofía Acosta', icono: 'materiales' },
]

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
  const idPorNombre = new Map(lista.map((x) => [`${x.u.nombre} ${x.u.apellido}`, x.u.id]))

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <section className="fondo-marca relative flex flex-col justify-between overflow-hidden px-6 py-8 text-white sm:px-10 lg:min-h-screen lg:py-12">
        <Marca claro />
        <div className="my-10 max-w-md lg:my-0">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Tareas y certificación de contratistas, en un solo lugar.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-marca-100/90">
            Del pedido del trabajo a la factura: aceptación, ejecución, certificado sobre la LPU, aprobaciones, materiales para SAP y liquidación. Sin mails ni planillas.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-marca-50">
            {[
              ['check', 'Cada paso con responsable y plazo visible'],
              ['candado', 'Auditoría inmutable de todo lo que pasa'],
              ['grafico', 'Indicadores financieros y de cumplimiento'],
            ].map(([i, t]) => (
              <li key={t} className="flex items-center gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10"><Icono nombre={i as NombreIcono} className="h-3.5 w-3.5 text-marca-200" /></span>{t}</li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-marca-200/70">Personal S.A. · Uso interno y de contratistas habilitados</p>
      </section>

      <section className="flex items-start justify-center bg-white px-4 py-8 sm:px-8 lg:max-h-screen lg:overflow-y-auto lg:py-12">
        <div className="w-full max-w-2xl">
          {oidc ? (
            <div className="mx-auto max-w-sm pt-16 text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Ingresar</h2>
              <p className="mb-6 mt-2 text-sm text-slate-600">Usá tu cuenta corporativa. Los contratistas ingresan con el usuario externo que les dio Personal.</p>
              <a href="/auth/login" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-marca-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-marca-700">
                <Icono nombre="candado" /> Ingresar con IDIRA
              </a>
              <p className="mt-6 text-xs text-slate-400">¿Problemas para ingresar? Contactá a la Mesa de Ayuda.</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200"><Icono nombre="info" className="h-3.5 w-3.5" /> Entorno de demostración · datos ficticios</span>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">¿Con qué perfil querés entrar?</h2>
                <p className="mt-1 text-sm text-slate-500">Elegí un usuario para ver el sistema como lo ve esa persona. En producción se ingresa con IDIRA.</p>
              </div>
              {error && <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">No se pudo ingresar con ese usuario.</p>}

              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Recorridos sugeridos</h3>
              <div className="mb-8 grid gap-3 sm:grid-cols-3">
                {RECORRIDOS.map((r) => {
                  const id = idPorNombre.get(r.quien)
                  if (!id) return null
                  return (
                    <form key={r.titulo} action={ingresarDev} className="h-full">
                      <input type="hidden" name="usuarioId" value={id} />
                      <button aria-label={`Recorrido: ${r.titulo}`} className="group flex h-full w-full flex-col rounded-2xl border border-marca-200 bg-gradient-to-b from-marca-50 to-white p-4 text-left transition hover:-translate-y-0.5 hover:border-marca-400 hover:shadow-md">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-marca-500 text-white"><Icono nombre={r.icono} /></span>
                        <span className="mt-3 text-sm font-semibold text-slate-900">{r.titulo}</span>
                        <span className="mt-1 flex-1 text-xs leading-snug text-slate-600">{r.texto}</span>
                        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-marca-700">Entrar como {r.quien} <Icono nombre="flecha" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></span>
                      </button>
                    </form>
                  )
                })}
              </div>

              {(['interno', 'contratista'] as const).map((tipo) => (
                <div key={tipo} className="mb-7">
                  <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <Icono nombre={tipo === 'interno' ? 'usuario' : 'empresa'} className="h-3.5 w-3.5" />
                    {tipo === 'interno' ? 'Personal propio' : 'Contratistas'}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {lista.filter((x) => x.u.tipo === tipo).map((x) => (
                      <form key={x.u.id} action={ingresarDev}>
                        <input type="hidden" name="usuarioId" value={x.u.id} />
                        <button className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-marca-400 hover:bg-marca-50/60">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${tipo === 'interno' ? 'bg-marca-100 text-marca-800' : 'bg-pink-100 text-pink-800'}`}>{x.u.nombre[0]}{x.u.apellido[0]}</span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-slate-900">{x.u.nombre} {x.u.apellido}</span>
                            <span className="block truncate text-xs text-slate-500">{x.roles.map(nombreRol).join(' · ')}{x.contratista ? ` — ${x.contratista}` : x.u.cargo ? ` — ${x.u.cargo}` : ''}</span>
                            {x.roles[0] && QUE_HACE[x.roles[0]] && <span className="block truncate text-[11px] text-slate-400">{QUE_HACE[x.roles[0]]}</span>}
                          </span>
                        </button>
                      </form>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </section>
    </main>
  )
}
