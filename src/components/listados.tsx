import type { Usuario } from '@/server/usuarios'
import { listarCertificados, listarTareas, maestros, POR_PAGINA, type FiltrosLista } from '@/server/consultas'
import { flujoVigente } from '@/server/flujos'
import { TablaCertificados, TablaTareas } from './filas'
import { Card, Encabezado, Input, LinkBoton, Paginacion, Select } from './ui'
import { TIPOS_TRABAJO } from '@/lib/etiquetas'

type SP = Record<string, string | undefined>

function qs(sp: SP, cambios: SP) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...sp, ...cambios })) if (v) p.set(k, v)
  return `?${p.toString()}`
}

async function Filtros({ sp, u, clave, estados }: { sp: SP; u: Usuario; clave: 'tarea' | 'certificado'; estados: Array<{ clave: string; etiqueta: string }> }) {
  const m = u.tipo === 'interno' ? await maestros(u) : null
  return (
    <form className="no-print flex flex-wrap items-end gap-2 border-b border-slate-100 p-3">
      <Input name="q" defaultValue={sp.q} placeholder={clave === 'tarea' ? 'N°, título o dirección' : 'N° de certificado o tarea'} className="w-56" />
      <Select name="estado" defaultValue={sp.estado ?? ''} className="w-52">
        <option value="">Todos los estados</option>
        <option value={clave === 'tarea' ? 'activas' : 'en_curso'}>{clave === 'tarea' ? 'Activas' : 'En curso'}</option>
        {estados.map((e) => <option key={e.clave} value={e.clave}>{e.etiqueta}</option>)}
      </Select>
      <Select name="tipo" defaultValue={sp.tipo ?? ''} className="w-40">
        <option value="">Todos los tipos</option>
        {Object.entries(TIPOS_TRABAJO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </Select>
      {m && (
        <>
          <Select name="contratista" defaultValue={sp.contratista ?? ''} className="w-52">
            <option value="">Todos los contratistas</option>
            {m.contratistas.map((c) => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}
          </Select>
          <Select name="subregion" defaultValue={sp.subregion ?? ''} className="w-44">
            <option value="">Todas mis subregiones</option>
            {m.misSubregiones.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
          </Select>
        </>
      )}
      {clave === 'tarea' && (
        <label className="flex items-center gap-1.5 px-1 text-sm text-slate-600"><input type="checkbox" name="urgencia" value="1" defaultChecked={sp.urgencia === '1'} /> Urgencias</label>
      )}
      <button className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900">Filtrar</button>
      {Object.values(sp).some(Boolean) && <LinkBoton href="?" chico estilo="fantasma">Limpiar</LinkBoton>}
    </form>
  )
}

export async function ListaTareas({ u, sp, portal }: { u: Usuario; sp: SP; portal: 'i' | 'c' }) {
  const f: FiltrosLista = { ...sp, pagina: Number(sp.pagina ?? 1) }
  const [{ filas, total, pagina }, flujo] = await Promise.all([listarTareas(u, f), flujoVigente('tarea')])
  return (
    <>
      <Encabezado titulo="Tareas" subtitulo={portal === 'i' ? 'Tareas de tus subregiones y de tu equipo' : 'Tareas asignadas a tu empresa'}
        acciones={portal === 'i' && u.roles.includes('solicitante') && <LinkBoton href="/i/tareas/nueva" estilo="primario">+ Nueva tarea</LinkBoton>} />
      <Card sinPadding>
        <Filtros sp={sp} u={u} clave="tarea" estados={flujo.def.estados} />
        <TablaTareas filas={filas} portal={portal} vacio="No hay tareas con esos filtros" />
        <Paginacion pagina={pagina} total={total} porPagina={POR_PAGINA} base={(p) => qs(sp, { pagina: String(p) })} />
      </Card>
    </>
  )
}

export async function ListaCertificados({ u, sp, portal }: { u: Usuario; sp: SP; portal: 'i' | 'c' }) {
  const f = { ...sp, pagina: Number(sp.pagina ?? 1) }
  const [{ filas, total, pagina }, flujo] = await Promise.all([listarCertificados(u, f), flujoVigente('certificado')])
  return (
    <>
      <Encabezado titulo="Certificados" subtitulo={portal === 'i' ? 'Certificados emitidos en tu alcance' : 'Certificados de tu empresa'}
        acciones={<a href={`/api/exportar/certificados${qs(sp, {})}`} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50">Exportar a Excel</a>} />
      <Card sinPadding>
        <Filtros sp={sp} u={u} clave="certificado" estados={flujo.def.estados} />
        <TablaCertificados filas={filas} portal={portal} vacio="No hay certificados con esos filtros" />
        <Paginacion pagina={pagina} total={total} porPagina={POR_PAGINA} base={(p) => qs(sp, { pagina: String(p) })} />
      </Card>
    </>
  )
}
