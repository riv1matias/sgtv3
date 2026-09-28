import Link from 'next/link'
import { and, desc, eq, gte, ilike, lte, or, type SQL } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { requerirUsuario, tieneRol } from '@/server/sesion'
import { verificarAuditoria } from '@/server/auditoria'
import { Aviso, Badge, Card, Encabezado, Input, Select, Tabla, Td, Th } from '@/components/ui'
import { formatoFechaHora } from '@/lib/fechas'
import { nombreRol } from '@/lib/etiquetas'

export const metadata = { title: 'Auditoría' }

const ENTIDADES = ['tarea', 'certificado', 'liquidacion', 'lpu', 'codigo_mo', 'regla', 'parametro', 'usuario', 'periodo', 'ajuste', 'contratista', 'organizacion']

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
    getDb().select().from(s.eventos).where(conds.length ? and(...conds) : undefined).orderBy(desc(s.eventos.id)).limit(300),
    sp.verificar ? verificarAuditoria() : Promise.resolve(null),
  ])
  const link = (e: (typeof eventos)[number]) => (e.entidad === 'tarea' ? `/i/tareas/${e.entidadId}` : e.entidad === 'certificado' ? `/i/certificados/${e.entidadId}` : e.entidad === 'liquidacion' ? `/i/liquidaciones/${e.entidadId}` : e.entidad === 'lpu' ? `/i/catalogos/lpu/${e.entidadId}` : null)
  return (
    <>
      <Encabezado titulo="Auditoría" subtitulo="Registro inmutable: cada evento está encadenado al anterior con un hash; la base rechaza modificaciones y borrados"
        acciones={<Link href="?verificar=1" className="rounded-lg bg-marca-600 px-3 py-2 text-sm font-medium text-white hover:bg-marca-700">Verificar integridad de la cadena</Link>} />
      {verif && (
        <div className="mb-5">
          {verif.ok
            ? <Aviso tono="ok" titulo="Cadena íntegra">{verif.cantidad} eventos verificados. Último hash: <span className="font-mono text-xs">{verif.ultimo}</span></Aviso>
            : <Aviso tono="error" titulo="¡La cadena fue alterada!">Evento #{verif.eventoId}: {verif.motivo}</Aviso>}
        </div>
      )}
      <Card sinPadding>
        <form className="flex flex-wrap items-end gap-2 border-b border-slate-100 p-3">
          <Input name="q" defaultValue={sp.q} placeholder="Usuario, acción, comentario o ID" className="w-64" />
          <Select name="entidad" defaultValue={sp.entidad ?? ''} className="w-44"><option value="">Todas las entidades</option>{ENTIDADES.map((e) => <option key={e}>{e}</option>)}</Select>
          <Input type="date" name="desde" defaultValue={sp.desde} className="w-40" />
          <Input type="date" name="hasta" defaultValue={sp.hasta} className="w-40" />
          <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm text-white">Filtrar</button>
        </form>
        <Tabla>
          <thead><tr><Th>#</Th><Th>Fecha y hora</Th><Th>Quién</Th><Th>Entidad</Th><Th>Acción</Th><Th>Estado</Th><Th>Detalle</Th><Th>Hash</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {eventos.map((e) => {
              const l = link(e)
              return (
                <tr key={e.id} className="align-top">
                  <Td className="text-xs text-slate-400">{e.id}</Td>
                  <Td className="whitespace-nowrap text-xs">{formatoFechaHora(e.ocurridoEn)}</Td>
                  <Td><div className="text-sm">{e.usuarioNombre}</div><div className="text-xs text-slate-500">{nombreRol(e.rol)}{e.empresa ? ` · ${e.empresa}` : ''}{e.enNombreDe ? ' · en nombre de otro' : ''}</div></Td>
                  <Td><Badge>{e.entidad}</Badge>{l && <div><Link className="text-xs text-marca-700 hover:underline" href={l}>ver</Link></div>}</Td>
                  <Td className="text-sm">{e.accion.replaceAll('_', ' ')}</Td>
                  <Td className="whitespace-nowrap text-xs text-slate-500">{e.estadoDesde && e.estadoHasta && e.estadoDesde !== e.estadoHasta ? `${e.estadoDesde} → ${e.estadoHasta}` : e.estadoHasta ?? ''}</Td>
                  <Td className="max-w-md text-xs text-slate-600">{e.comentario && <div className="mb-1 text-slate-800">{e.comentario}</div>}{e.cambios ? <code className="block max-h-24 overflow-auto whitespace-pre-wrap break-all rounded bg-slate-50 p-1 text-[11px]">{JSON.stringify(e.cambios)}</code> : null}</Td>
                  <Td className="font-mono text-[10px] text-slate-400" >{e.hash.slice(0, 10)}…</Td>
                </tr>
              )
            })}
          </tbody>
        </Tabla>
      </Card>
    </>
  )
}
