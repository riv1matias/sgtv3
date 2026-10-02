import Link from 'next/link'
import { and, desc, eq, gte, ilike, lte, or, type SQL } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { requerirUsuario, tieneRol } from '@/server/sesion'
import { verificarAuditoria } from '@/server/auditoria'
import { Aviso, Badge, Boton, Card, Encabezado, Input, Select, Vacio, clasesBoton } from '@/components/ui'
import { Icono } from '@/components/iconos'
import { formatoFechaHora } from '@/lib/fechas'
import { nombreRol } from '@/lib/etiquetas'

export const metadata = { title: 'Auditoría' }

const ENTIDADES: Record<string, string> = {
  tarea: 'Tarea', certificado: 'Certificado', liquidacion: 'Liquidación', lpu: 'LPU', codigo_mo: 'Código de MO', regla: 'Regla de CERCO', parametro: 'Parámetro',
  usuario: 'Usuario', periodo: 'Período', ajuste: 'Ajuste', contratista: 'Contratista', organizacion: 'Organización',
}
const POR_VEZ = 50

export default async function Auditoria({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const u = await requerirUsuario('interno')
  if (!tieneRol(u, 'auditor', 'cerco', 'supervisor', 'admin_sistema', 'gerente')) return <Aviso tono="alerta">No tenés acceso a la auditoría completa. El historial de cada tarea y certificado está en su ficha.</Aviso>
  const sp = await searchParams
  const conds: SQL[] = []
  if (sp.entidad) conds.push(eq(s.eventos.entidad, sp.entidad))
  if (sp.q) conds.push(or(ilike(s.eventos.usuarioNombre, `%${sp.q}%`), ilike(s.eventos.accion, `%${sp.q}%`), ilike(s.eventos.comentario, `%${sp.q}%`), eq(s.eventos.entidadId, sp.q))!)
  if (sp.desde) conds.push(gte(s.eventos.ocurridoEn, new Date(sp.desde + 'T00:00:00-03:00')))
  if (sp.hasta) conds.push(lte(s.eventos.ocurridoEn, new Date(sp.hasta + 'T23:59:59-03:00')))
  const [eventos, verif] = await Promise.all([
    getDb().select().from(s.eventos).where(conds.length ? and(...conds) : undefined).orderBy(desc(s.eventos.id)).limit(Math.min(Number(sp.ver) || POR_VEZ, 1000) + 1),
    sp.verificar ? verificarAuditoria() : Promise.resolve(null),
  ])
  const hayMas = eventos.length > (Math.min(Number(sp.ver) || POR_VEZ, 1000))
  const visibles = hayMas ? eventos.slice(0, -1) : eventos
  const masUrl = `?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([k, v]) => v && k !== 'verificar')) as Record<string, string>, ver: String(visibles.length + POR_VEZ) })}`
  const link = (e: (typeof eventos)[number]) => (e.entidad === 'tarea' ? `/i/tareas/${e.entidadId}` : e.entidad === 'certificado' ? `/i/certificados/${e.entidadId}` : e.entidad === 'liquidacion' ? `/i/liquidaciones/${e.entidadId}` : e.entidad === 'lpu' ? `/i/catalogos/lpu/${e.entidadId}` : null)
  return (
    <>
      <Encabezado titulo="Auditoría" subtitulo="Registro inmutable: cada evento está encadenado al anterior con un hash; la base rechaza modificaciones y borrados"
        acciones={<Link href="?verificar=1" className={clasesBoton('primario')}><Icono nombre="escudo" /> Verificar integridad</Link>} />
      {verif && (
        <div className="mb-5">
          {verif.ok
            ? <Aviso tono="ok" titulo="Cadena íntegra">{verif.cantidad} eventos verificados. Último hash: <span className="font-mono text-xs">{verif.ultimo}</span></Aviso>
            : <Aviso tono="error" titulo="¡La cadena fue alterada!">Evento #{verif.eventoId}: {verif.motivo}</Aviso>}
        </div>
      )}
      <Card sinPadding>
        <form className="flex flex-wrap items-end gap-2 border-b border-slate-100 p-3">
          <div className="min-w-[14rem] flex-1"><Input name="q" defaultValue={sp.q} placeholder="Persona, acción, comentario o ID" aria-label="Buscar" /></div>
          <div className="w-full sm:w-48"><Select name="entidad" defaultValue={sp.entidad ?? ''} aria-label="Sobre qué"><option value="">Todo</option>{Object.entries(ENTIDADES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></div>
          <label className="text-xs text-slate-500">Desde<Input type="date" name="desde" defaultValue={sp.desde} className="mt-0.5 w-40" /></label>
          <label className="text-xs text-slate-500">Hasta<Input type="date" name="hasta" defaultValue={sp.hasta} className="mt-0.5 w-40" /></label>
          <Boton estilo="primario">Buscar</Boton>
        </form>
        {!visibles.length && <Vacio icono="buscar">No hay eventos con esos filtros.</Vacio>}
        <ul className="divide-y divide-slate-100">
          {visibles.map((e) => {
            const l = link(e)
            const cambio = e.estadoDesde && e.estadoHasta && e.estadoDesde !== e.estadoHasta
            return (
              <li key={e.id} className="grid gap-x-4 gap-y-1 px-5 py-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <div className="text-xs text-slate-500">
                  <div className="whitespace-nowrap text-slate-700">{formatoFechaHora(e.ocurridoEn)}</div>
                  <div className="font-mono text-[10px] text-slate-400" title={e.hash}>#{e.id} · {e.hash.slice(0, 8)}</div>
                </div>
                <div className="min-w-0 text-sm">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <b className="font-medium text-slate-900">{e.usuarioNombre}</b>
                    <span className="text-xs text-slate-500">({nombreRol(e.rol)}{e.empresa ? ` · ${e.empresa}` : ''}{e.enNombreDe ? ' · en nombre de otra persona' : ''})</span>
                    <span className="text-slate-700">{e.accion.replaceAll('_', ' ')}</span>
                    <Badge>{ENTIDADES[e.entidad] ?? e.entidad}</Badge>
                    {l && <Link className="text-xs font-medium text-marca-700 hover:underline" href={l}>abrir</Link>}
                    {cambio && <span className="text-xs text-slate-500">{e.estadoDesde} → <b className="font-medium text-slate-700">{e.estadoHasta}</b></span>}
                  </div>
                  {e.comentario && <div className="mt-1 rounded-lg bg-slate-50 px-3 py-1.5 text-slate-700">{e.comentario}</div>}
                  {e.cambios != null && Object.keys(e.cambios as object).length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-slate-500 hover:text-marca-700">Ver datos registrados</summary>
                      <dl className="mt-1 grid gap-x-4 gap-y-0.5 rounded-lg bg-slate-50 p-2 text-xs sm:grid-cols-[max-content_minmax(0,1fr)]">
                        {Object.entries(e.cambios as Record<string, unknown>).map(([k, v]) => (
                          <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="break-all font-mono text-[11px] text-slate-700">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</dd></div>
                        ))}
                      </dl>
                    </details>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        {hayMas && <div className="border-t border-slate-100 p-3 text-center"><Link href={masUrl} className={clasesBoton()}>Mostrar más eventos</Link></div>}
      </Card>
    </>
  )
}
