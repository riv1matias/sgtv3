import Link from 'next/link'
import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { requerirUsuario, tieneRol } from '@/server/sesion'
import { listarLpus } from '@/server/servicios/lpu'
import { lpusPublicadas } from '@/server/servicios/precios'
import { accionCodigo, accionImportarLpu, accionRegla } from '@/app/acciones/gestion'
import { BotonEnviar, Formulario } from '@/components/formulario'
import { Badge, Campo, Card, Encabezado, Input, Pesos, Pestanas, Select, Tabla, Td, Textarea, Th, Vacio } from '@/components/ui'
import { formatoCantidad } from '@/domain/dinero'
import { formatoFecha, formatoFechaHora, hoy } from '@/lib/fechas'
import { TIPOS_IMPUTACION } from '@/lib/etiquetas'

export const metadata = { title: 'Catálogos y LPU' }

const ESTADO_LPU: Record<string, [string, string]> = { borrador: ['Borrador', 'amber'], publicada: ['Publicada', 'green'], descartada: ['Descartada', 'gray'], rectificada: ['Rectificada', 'gray'] }
const TIPOS_REGLA: Record<string, string> = { requiere_codigo_base: 'Requiere código base', incompatible: 'Incompatible con', maximo_por_certificado: 'Máximo por certificado', solo_tipo_trabajo: 'Solo para tipos de trabajo' }

export default async function Catalogos({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string; codigo?: string }> }) {
  const u = await requerirUsuario('interno')
  const { tab = 'lpu', q = '', codigo } = await searchParams
  const db = getDb()
  const puedeLpu = tieneRol(u, 'compras', 'admin_sistema')
  const puedeReglas = tieneRol(u, 'cerco', 'admin_sistema')
  const puedeCodigos = tieneRol(u, 'compras', 'cerco', 'admin_sistema')
  const pubs = (await lpusPublicadas(db)).filter((l) => l.vigenciaDesde <= hoy()).sort((a, b) => b.vigenciaDesde.localeCompare(a.vigenciaDesde))
  const vigente = pubs[0]
  return (
    <>
      <Encabezado titulo="Catálogos y LPU" subtitulo={vigente ? `LPU vigente: ${vigente.nombre} (desde ${formatoFecha(vigente.vigenciaDesde)})` : 'Sin LPU vigente'} />
      <Pestanas activa={tab} items={[
        { clave: 'lpu', texto: 'LPU', href: '?tab=lpu' },
        { clave: 'codigos', texto: 'Códigos de mano de obra', href: '?tab=codigos' },
        { clave: 'reglas', texto: 'Reglas de CERCO', href: '?tab=reglas' },
        { clave: 'materiales', texto: 'Materiales', href: '?tab=materiales' },
        { clave: 'imputaciones', texto: 'Imputaciones', href: '?tab=imputaciones' },
      ]} />

      {tab === 'lpu' && (
        <div className={puedeLpu ? 'grid gap-5 lg:grid-cols-3' : ''}>
          <Card titulo="Versiones de la LPU" className={puedeLpu ? 'lg:col-span-2' : ''} sinPadding acciones={!puedeLpu && <span className="text-xs text-slate-500">La carga y publica Compras</span>}>
            <Tabla>
              <thead><tr><Th>Nombre</Th><Th>Vigencia desde</Th><Th>% informado</Th><Th>Estado</Th><Th>Cargada por</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(await listarLpus()).map(({ l, nombre, apellido }) => (
                  <tr key={l.id}>
                    <Td><Link className="font-medium text-marca-700 hover:underline" href={`/i/catalogos/lpu/${l.id}`}>{l.nombre}</Link>{vigente?.id === l.id && <Badge color="green" className="ml-2">Vigente</Badge>}</Td>
                    <Td>{formatoFecha(l.vigenciaDesde)}</Td>
                    <Td className="num">{l.porcentajeInformado ? `${Number(l.porcentajeInformado).toFixed(2)}%` : '—'}</Td>
                    <Td><Badge color={ESTADO_LPU[l.estado]?.[1]}>{ESTADO_LPU[l.estado]?.[0] ?? l.estado}</Badge></Td>
                    <Td className="text-xs text-slate-500">{nombre} {apellido}<br />{formatoFechaHora(l.publicadaAt ?? l.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          </Card>
          {puedeLpu ? (
            <Card titulo="Importar nueva LPU">
              <p className="mb-3 text-xs text-slate-500">Subí el mismo Excel (.xlsx) que envía Compras (hoja Maestro / LPU). Se crea un borrador con la vista previa de cambios; nada cambia hasta publicarla.</p>
              <Formulario accion={accionImportarLpu} className="space-y-3">
                <Campo label="Archivo Excel"><Input type="file" name="archivo" accept=".xlsx,.csv" required /></Campo>
                <Campo label="Nombre (opcional)"><Input name="nombre" placeholder="LPU octubre 2026" /></Campo>
                <Campo label="Vigencia desde" ayuda="Si se deja vacía se toma la del Excel. Puede ser retroactiva o futura."><Input type="date" name="vigencia" /></Campo>
                <BotonEnviar>Analizar archivo</BotonEnviar>
              </Formulario>
            </Card>
          ) : null}
        </div>
      )}

      {tab === 'codigos' && <Codigos q={q} codigo={codigo} vigenteId={vigente?.id} editar={puedeCodigos} />}
      {tab === 'reglas' && <Reglas editar={puedeReglas} />}

      {tab === 'materiales' && (
        <Card sinPadding>
          <form className="flex gap-2 border-b border-slate-100 p-3"><input type="hidden" name="tab" value="materiales" /><Input name="q" defaultValue={q} placeholder="Código SAP o descripción" className="w-72" /><button className="rounded-lg bg-slate-800 px-3 text-sm text-white">Buscar</button></form>
          <Tabla>
            <thead><tr><Th>Código SAP</Th><Th>Descripción</Th><Th>UM</Th><Th>Grupo</Th><Th>Recuperable</Th><Th className="text-right">Umbral de alerta</Th><Th className="text-right">Precio ref.</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {(await db.select().from(s.materiales).where(q ? or(ilike(s.materiales.codigoSap, `${q}%`), ilike(s.materiales.descripcion, `%${q}%`)) : undefined).orderBy(asc(s.materiales.codigoSap)).limit(200)).map((m) => (
                <tr key={m.id}><Td className="font-mono text-xs">{m.codigoSap}</Td><Td>{m.descripcion}</Td><Td>{m.unidad}</Td><Td>{m.grupo}</Td><Td>{m.recuperable ? 'Sí' : 'No'}</Td><Td className="num">{formatoCantidad(m.umbralAlerta)}</Td><Td className="num"><Pesos v={m.precioReferencia} /></Td></tr>
              ))}
            </tbody>
          </Tabla>
        </Card>
      )}

      {tab === 'imputaciones' && (
        <Card sinPadding>
          <Tabla>
            <thead><tr><Th>Tipo</Th><Th>Número</Th><Th>Descripción</Th><Th className="text-right">Presupuesto</Th><Th className="text-right">Tareas</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {(await db.select({ i: s.imputaciones, n: sql<number>`(select count(*)::int from tareas t where t.imputacion_id = imputaciones.id)` }).from(s.imputaciones).orderBy(asc(s.imputaciones.tipo), asc(s.imputaciones.numero))).map(({ i, n }) => (
                <tr key={i.id}><Td><Badge>{TIPOS_IMPUTACION[i.tipo]}</Badge></Td><Td className="font-mono text-xs">{i.numero}</Td><Td>{i.descripcion}</Td><Td className="num"><Pesos v={i.presupuesto} /></Td><Td className="num">{n}</Td></tr>
              ))}
            </tbody>
          </Tabla>
          <p className="p-3 text-xs text-slate-500">Las OT se cargan desde Helix y los PEP/órdenes de controlling desde SAP (importación periódica; integración futura).</p>
        </Card>
      )}
    </>
  )
}

async function Codigos({ q, codigo, vigenteId, editar }: { q: string; codigo?: string; vigenteId?: number; editar: boolean }) {
  const db = getDb()
  const porAlias = q ? await db.select({ id: s.codigoMoAlias.codigoMoId }).from(s.codigoMoAlias).where(eq(s.codigoMoAlias.alias, q)) : []
  const filas = await db.select().from(s.codigosMo)
    .where(q ? or(ilike(s.codigosMo.codigoS4, `${q}%`), ilike(s.codigosMo.descripcion, `%${q}%`), ilike(s.codigosMo.categoria, `${q}%`), porAlias.length ? inArray(s.codigosMo.id, porAlias.map((a) => a.id)) : sql`false`) : undefined)
    .orderBy(desc(s.codigosMo.activo), asc(s.codigosMo.codigoS4)).limit(300)
  const precios = vigenteId && filas.length ? await db.select().from(s.lpuPrecios).where(and(eq(s.lpuPrecios.lpuId, vigenteId), inArray(s.lpuPrecios.codigoMoId, filas.map((f) => f.id)))) : []
  const p = (id: number, l: string) => precios.find((x) => x.codigoMoId === id && x.lista === l)?.precio ?? null
  const sel = codigo ? filas.find((f) => f.id === Number(codigo)) ?? (await db.select().from(s.codigosMo).where(eq(s.codigosMo.id, Number(codigo))))[0] : null
  const aliases = sel ? await db.select().from(s.codigoMoAlias).where(eq(s.codigoMoAlias.codigoMoId, sel.id)) : []
  const historial = sel ? await db.select({ p: s.lpuPrecios, l: s.lpuVersiones }).from(s.lpuPrecios).innerJoin(s.lpuVersiones, eq(s.lpuVersiones.id, s.lpuPrecios.lpuId)).where(and(eq(s.lpuPrecios.codigoMoId, sel.id), eq(s.lpuVersiones.estado, 'publicada'))).orderBy(asc(s.lpuVersiones.vigenciaDesde)) : []
  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <Card sinPadding className="xl:col-span-2">
        <form className="flex gap-2 border-b border-slate-100 p-3"><input type="hidden" name="tab" value="codigos" /><Input name="q" defaultValue={q} placeholder="Código S4, alias, descripción o categoría" className="w-80" /><button className="rounded-lg bg-slate-800 px-3 text-sm text-white">Buscar</button></form>
        <Tabla>
          <thead><tr><Th>S4</Th><Th>Descripción</Th><Th>UM</Th><Th>Categoría</Th><Th className="text-right">$ Mant.</Th><Th className="text-right">$ Obras</Th><Th>Atributos</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filas.map((c) => (
              <tr key={c.id} className={!c.activo ? 'opacity-50' : sel?.id === c.id ? 'bg-marca-50' : ''}>
                <Td className="font-mono text-xs"><Link className="text-marca-700 hover:underline" href={`?tab=codigos&q=${encodeURIComponent(q)}&codigo=${c.id}`}>{c.codigoS4}</Link></Td>
                <Td>{c.descripcion}</Td><Td>{c.unidad}</Td><Td className="text-xs">{c.categoria}</Td>
                <Td className="num">{c.montoAbierto ? 'AD' : <Pesos v={p(c.id, 'mantenimiento')} />}</Td>
                <Td className="num">{c.montoAbierto ? 'AD' : <Pesos v={p(c.id, 'obras')} />}</Td>
                <Td className="space-x-1">
                  {c.requiereSegundaAprobacion && <Badge color="indigo">2da aprob.</Badge>}{c.requiereFactura && <Badge color="amber">Factura</Badge>}
                  {c.soloUrgencia && <Badge color="red">Urgencia</Badge>}{!c.activo && <Badge color="gray">Baja</Badge>}
                </Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Card>
      <div>
        {sel ? (
          <Card titulo={`${sel.codigoS4} · ${sel.descripcion}`}>
            <div className="mb-3 text-xs text-slate-500">Alias: {aliases.map((a) => `${a.alias} (${a.origen})`).join(', ') || '—'}</div>
            {historial.length > 0 && (
              <div className="mb-4">
                <div className="mb-1 text-xs font-semibold text-slate-500">Historial de precios</div>
                <ul className="space-y-0.5 text-xs">{historial.map((h) => <li key={h.l.id + h.p.lista} className="flex justify-between"><span>{formatoFecha(h.l.vigenciaDesde)} · {h.p.lista}</span><Pesos v={h.p.precio} chico /></li>)}</ul>
              </div>
            )}
            {editar ? (
              <Formulario accion={accionCodigo} className="space-y-2">
                <input type="hidden" name="codigoId" value={sel.id} />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requiereSegundaAprobacion" defaultChecked={sel.requiereSegundaAprobacion} /> Requiere 2da aprobación (gerente)</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requiereFactura" defaultChecked={sel.requiereFactura} /> Requiere factura adjunta</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="soloUrgencia" defaultChecked={sel.soloUrgencia} /> Solo en tareas de urgencia</label>
                <Campo label="Umbral de alerta (cantidad o importe)"><Input name="umbralAlerta" defaultValue={sel.umbralAlerta ?? ''} /></Campo>
                <Campo label="Alcance (qué incluye y qué no)"><Textarea name="alcance" defaultValue={sel.alcance ?? ''} rows={4} /></Campo>
                <BotonEnviar chico>Guardar cambios</BotonEnviar>
                <p className="text-xs text-slate-400">Los cambios aplican a los certificados que se emitan desde ahora y quedan auditados.</p>
              </Formulario>
            ) : <p className="whitespace-pre-line text-sm text-slate-700">{sel.alcance ?? 'Sin alcance cargado'}</p>}
          </Card>
        ) : <Card><Vacio>Elegí un código para ver su alcance, alias e historial de precios</Vacio></Card>}
      </div>
    </div>
  )
}

async function Reglas({ editar }: { editar: boolean }) {
  const db = getDb()
  const reglas = await db.select().from(s.reglasCodigo).orderBy(desc(s.reglasCodigo.activa), asc(s.reglasCodigo.id))
  const codigos = await db.select({ id: s.codigosMo.id, s4: s.codigosMo.codigoS4, d: s.codigosMo.descripcion }).from(s.codigosMo).where(eq(s.codigosMo.activo, true)).orderBy(asc(s.codigosMo.codigoS4))
  const nombre = (id: number | null) => { const c = codigos.find((x) => x.id === id); return c ? `${c.s4} ${c.d}` : '—' }
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card titulo="Reglas activas" className="lg:col-span-2" sinPadding>
        {reglas.length ? (
          <Tabla>
            <thead><tr><Th>Regla</Th><Th>Mensaje al validador</Th><Th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {reglas.map((r) => (
                <tr key={r.id} className={r.activa ? '' : 'opacity-50'}>
                  <Td><div className="text-xs font-semibold text-slate-500">{TIPOS_REGLA[r.tipo] ?? r.tipo}</div><div>{nombre(r.codigoMoId)}</div>{r.codigoRelacionadoId && <div className="text-xs text-slate-500">→ {nombre(r.codigoRelacionadoId)}</div>}{r.parametro && <div className="text-xs text-slate-500">Parámetro: {r.parametro}</div>}</Td>
                  <Td>{r.mensaje}</Td>
                  <Td>{editar && r.activa && <Formulario accion={accionRegla}><input type="hidden" name="op" value="desactivar" /><input type="hidden" name="reglaId" value={r.id} /><BotonEnviar chico estilo="fantasma">Desactivar</BotonEnviar></Formulario>}</Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        ) : <Vacio>Sin reglas</Vacio>}
      </Card>
      {editar && (
        <Card titulo="Nueva regla">
          <p className="mb-3 text-xs text-slate-500">Las reglas generan alertas (no bloquean) para el validador al emitir el certificado.</p>
          <Formulario accion={accionRegla} className="space-y-3" reiniciar>
            <Campo label="Tipo"><Select name="tipo">{Object.entries(TIPOS_REGLA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Campo>
            <Campo label="Código"><Select name="codigoMoId" required>{codigos.map((c) => <option key={c.id} value={c.id}>{c.s4} {c.d}</option>)}</Select></Campo>
            <Campo label="Código relacionado (base o incompatible)"><Select name="codigoRelacionadoId" defaultValue=""><option value="">—</option>{codigos.map((c) => <option key={c.id} value={c.id}>{c.s4} {c.d}</option>)}</Select></Campo>
            <Campo label="Parámetro" ayuda="Máximo por certificado (ej. 1) o tipos de trabajo separados por coma (mantenimiento,eventos)"><Input name="parametro" /></Campo>
            <Campo label="Mensaje para el validador"><Input name="mensaje" required /></Campo>
            <BotonEnviar chico>Crear regla</BotonEnviar>
          </Formulario>
        </Card>
      )}
    </div>
  )
}
