import type { Usuario } from '@/server/usuarios'
import { listarCertificados, listarTareas, maestros, POR_PAGINA, type FiltrosLista } from '@/server/consultas'
import { flujoVigente } from '@/server/flujos'
import { TablaCertificados, TablaTareas } from './filas'
import { Boton, Card, Encabezado, Input, LinkBoton, Paginacion, Select, clasesBoton } from './ui'
import { Icono } from './iconos'
import { TIPOS_TRABAJO } from '@/lib/etiquetas'

type SP = Record<string, string | undefined>

function qs(sp: SP, cambios: SP) {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...sp, ...cambios })) if (v) p.set(k, v)
  return `?${p.toString()}`
}

async function Filtros({ sp, u, clave, estados }: { sp: SP; u: Usuario; clave: 'tarea' | 'certificado'; estados: Array<{ clave: string; etiqueta: string }> }) {
  const m = u.tipo === 'interno' ? await maestros(u) : null
  const secundarios = [sp.tipo, sp.contratista, sp.subregion, sp.urgencia].filter(Boolean).length
  const hayFiltros = Object.entries(sp).some(([k, v]) => v && k !== 'pagina')
  return (
    <form className="no-print border-b border-slate-100 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Icono nombre="buscar" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input name="q" defaultValue={sp.q} placeholder={clave === 'tarea' ? 'Buscar por N°, título o dirección' : 'Buscar por N° de certificado o tarea'} className="pl-9" />
        </div>
        <div className="w-full sm:w-56">
          <Select name="estado" defaultValue={sp.estado ?? ''} aria-label="Estado">
            <option value="">Todos los estados</option>
            <option value={clave === 'tarea' ? 'activas' : 'en_curso'}>{clave === 'tarea' ? 'Solo activas' : 'Solo en curso'}</option>
            {estados.map((e) => <option key={e.clave} value={e.clave}>{e.etiqueta}</option>)}
          </Select>
        </div>
        <Boton estilo="primario">Buscar</Boton>
        {hayFiltros && <LinkBoton href="?" estilo="fantasma">Limpiar</LinkBoton>}
      </div>
      <details open={secundarios > 0} className="group mt-2">
        <summary className="inline-flex cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 text-xs font-medium text-slate-500 hover:text-marca-700">
          <Icono nombre="ajustes" className="h-3.5 w-3.5" /> Más filtros{secundarios > 0 && <span className="rounded-full bg-marca-100 px-1.5 text-[10px] text-marca-800">{secundarios}</span>}
          <Icono nombre="chevron" className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Select name="tipo" defaultValue={sp.tipo ?? ''} aria-label="Tipo de trabajo">
            <option value="">Todos los tipos de trabajo</option>
            {Object.entries(TIPOS_TRABAJO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          {m && (
            <>
              <Select name="contratista" defaultValue={sp.contratista ?? ''} aria-label="Contratista">
                <option value="">Todos los contratistas</option>
                {m.contratistas.map((c) => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}
              </Select>
              <Select name="subregion" defaultValue={sp.subregion ?? ''} aria-label="Subregión">
                <option value="">Todas mis subregiones</option>
                {m.misSubregiones.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
              </Select>
            </>
          )}
          {clave === 'tarea' && (
            <label className="flex items-center gap-2 rounded-lg px-2 text-sm text-slate-600"><input type="checkbox" name="urgencia" value="1" defaultChecked={sp.urgencia === '1'} className="h-4 w-4 accent-marca-600" /> Solo urgencias</label>
          )}
        </div>
      </details>
    </form>
  )
}

export async function ListaTareas({ u, sp, portal }: { u: Usuario; sp: SP; portal: 'i' | 'c' }) {
  const f: FiltrosLista = { ...sp, pagina: Number(sp.pagina ?? 1) }
  const [{ filas, total, pagina }, flujo] = await Promise.all([listarTareas(u, f), flujoVigente('tarea')])
  return (
    <>
      <Encabezado titulo="Tareas" subtitulo={portal === 'i' ? 'Tareas de tus subregiones y de tu equipo' : 'Tareas asignadas a tu empresa'}
        acciones={portal === 'i' && u.roles.includes('solicitante') && <LinkBoton href="/i/tareas/nueva" estilo="primario"><Icono nombre="mas" /> Nueva tarea</LinkBoton>} />
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
        acciones={<a href={`/api/exportar/certificados${qs(sp, {})}`} className={clasesBoton()}><Icono nombre="descargar" /> Exportar a Excel</a>} />
      <Card sinPadding>
        <Filtros sp={sp} u={u} clave="certificado" estados={flujo.def.estados} />
        <TablaCertificados filas={filas} portal={portal} vacio="No hay certificados con esos filtros" />
        <Paginacion pagina={pagina} total={total} porPagina={POR_PAGINA} base={(p) => qs(sp, { pagina: String(p) })} />
      </Card>
    </>
  )
}
