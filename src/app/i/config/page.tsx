import { redirect } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { requerirUsuario, tieneRol } from '@/server/sesion'
import { parametros } from '@/server/comun'
import { flujoVigente } from '@/server/flujos'
import { accionKml, accionParametros, accionVencimientos } from '@/app/acciones/gestion'
import { BotonEnviar, Formulario } from '@/components/formulario'
import { Badge, Campo, Card, Encabezado, Input, Pestanas, Select, Tabla, Td, Th } from '@/components/ui'
import { nombreRol } from '@/lib/etiquetas'
import type { DefinicionFlujo } from '@/domain/flujo/tipos'

export const metadata = { title: 'Configuración' }

function FlujoTabla({ def }: { def: DefinicionFlujo }) {
  const et = (c: string) => (c.startsWith('$') ? `(${c.slice(1)})` : def.estados.find((e) => e.clave === c)?.etiqueta ?? c)
  const actor = (a: unknown): string => (Array.isArray(a) ? a.map((x) => (x.pool ? nombreRol(x.pool) : nombreRol(x.actor)) + (x.si ? ' si ' + JSON.stringify(x.si) : '')).join(' / ') : typeof a === 'object' && a ? nombreRol((a as { pool: string }).pool) : nombreRol(a as string))
  return (
    <Tabla>
      <thead><tr><Th>Acción</Th><Th>Desde</Th><Th>Hacia</Th><Th>Quién</Th><Th>Requiere</Th><Th>Validaciones / efectos</Th></tr></thead>
      <tbody className="divide-y divide-slate-100">
        {def.transiciones.map((t, i) => (
          <tr key={i}>
            <Td className="font-medium">{t.etiqueta}</Td>
            <Td className="text-xs">{t.desde.map(et).join(', ')}</Td>
            <Td className="text-xs">{typeof t.hacia === 'string' ? et(t.hacia) : t.hacia.map((h) => `${h.si ? `si ${typeof h.si === 'string' ? h.si : JSON.stringify(h.si)} → ` : 'si no → '}${et(h.ir_a)}`).join('; ')}</Td>
            <Td className="text-xs">{actor(t.actor ?? def.estados.find((e) => e.clave === t.desde[0])?.actor)}</Td>
            <Td className="text-xs">{(t.requiere ?? []).join(', ')}{t.condicion ? ` · cond: ${JSON.stringify(t.condicion)}` : ''}</Td>
            <Td className="text-xs text-slate-500">{[...(t.validaciones ?? []), ...(t.efectos ?? [])].join(', ')}</Td>
          </tr>
        ))}
      </tbody>
    </Tabla>
  )
}

export default async function Config({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const u = await requerirUsuario('interno')
  if (!tieneRol(u, 'admin_sistema')) redirect('/i/config/delegaciones')
  const tab = (await searchParams).tab ?? 'usuarios'
  const db = getDb()
  const p = await parametros()
  return (
    <>
      <Encabezado titulo="Configuración" subtitulo="Usuarios, organización, parámetros y flujos" />
      <Pestanas activa={tab} items={[
        { clave: 'usuarios', texto: 'Usuarios y roles', href: '?tab=usuarios' },
        { clave: 'organizacion', texto: 'Organización y polígonos', href: '?tab=organizacion' },
        { clave: 'parametros', texto: 'Parámetros', href: '?tab=parametros' },
        { clave: 'flujos', texto: 'Flujos', href: '?tab=flujos' },
        { clave: 'delegaciones', texto: 'Mis delegaciones', href: '/i/config/delegaciones' },
      ]} />
      {tab === 'usuarios' && (
        <Card sinPadding>
          <Tabla>
            <thead><tr><Th>Usuario</Th><Th>Tipo</Th><Th>Roles</Th><Th>Subregiones</Th><Th>Supervisor</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {await (async () => {
                const us = await db.select().from(s.usuarios).orderBy(asc(s.usuarios.tipo), asc(s.usuarios.apellido))
                const roles = await db.select().from(s.usuarioRoles)
                const subs = await db.select({ u: s.usuarioSubregiones.usuarioId, n: s.subregiones.nombre }).from(s.usuarioSubregiones).innerJoin(s.subregiones, eq(s.subregiones.id, s.usuarioSubregiones.subregionId))
                const contr = await db.select().from(s.contratistas)
                return us.map((x) => (
                  <tr key={x.id}>
                    <Td><div className="font-medium">{x.nombre} {x.apellido}</div><div className="text-xs text-slate-500">{x.email} · {x.cargo}</div></Td>
                    <Td>{x.tipo === 'interno' ? <Badge color="blue">Interno</Badge> : <Badge color="violet">{contr.find((c) => c.id === x.contratistaId)?.razonSocial}</Badge>}</Td>
                    <Td className="text-xs">{roles.filter((r) => r.usuarioId === x.id).map((r) => nombreRol(r.rol)).join(', ')}</Td>
                    <Td className="text-xs text-slate-600">{subs.filter((y) => y.u === x.id).map((y) => y.n).join(', ') || (x.tipo === 'interno' ? 'Nacional' : 'Las del contratista')}</Td>
                    <Td className="text-xs">{us.find((y) => y.id === x.supervisorId) ? `${us.find((y) => y.id === x.supervisorId)!.nombre} ${us.find((y) => y.id === x.supervisorId)!.apellido}` : '—'}</Td>
                  </tr>
                ))
              })()}
            </tbody>
          </Tabla>
          <p className="p-3 text-xs text-slate-500">En producción los usuarios se crean al primer ingreso por IDIRA y los roles/subregiones se sincronizan desde el directorio corporativo; esta pantalla permite revisarlos.</p>
        </Card>
      )}
      {tab === 'organizacion' && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card titulo="Subregiones" className="lg:col-span-2" sinPadding>
            <Tabla>
              <thead><tr><Th>Región</Th><Th>Subregión</Th><Th>Código</Th><Th>Polígono</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(await db.select({ s: s.subregiones, r: s.regiones }).from(s.subregiones).innerJoin(s.regiones, eq(s.regiones.id, s.subregiones.regionId)).orderBy(asc(s.regiones.nombre), asc(s.subregiones.nombre))).map((x) => (
                  <tr key={x.s.id}><Td>{x.r.nombre}</Td><Td>{x.s.nombre}</Td><Td className="font-mono text-xs">{x.s.codigo}</Td><Td>{x.s.poligono ? <Badge color="green">Cargado</Badge> : <Badge color="amber">Sin polígono</Badge>}</Td></tr>
                ))}
              </tbody>
            </Tabla>
          </Card>
          <Card titulo="Importar KML de subregiones">
            <p className="mb-3 text-xs text-slate-500">Cada Placemark se asigna a la subregión con el mismo nombre o código. Con los polígonos, la subregión de una tarea se detecta sola por su ubicación.</p>
            <Formulario accion={accionKml} className="space-y-3">
              <Input type="file" name="archivo" accept=".kml" required />
              <BotonEnviar chico>Importar</BotonEnviar>
            </Formulario>
          </Card>
        </div>
      )}
      {tab === 'parametros' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card titulo="Parámetros del circuito">
            <Formulario accion={accionParametros} className="space-y-4">
              <fieldset className="rounded-lg border border-slate-200 p-3">
                <legend className="px-1 text-xs font-semibold text-slate-600">Política de precios (P1)</legend>
                <Campo label="Fecha que define el precio">
                  <Select name="referencia" defaultValue={p.politica_precios.referencia}>
                    <option value="cierre">LPU vigente al cierre del período de pago</option>
                    <option value="emision">LPU vigente a la primera emisión</option>
                  </Select>
                </Campo>
                <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="aplicarSubas" defaultChecked={p.politica_precios.aplicarSubas} /> Si la LPU nueva sube un precio, aplicarlo a certificados no cerrados</label>
                <label className="mt-1 flex items-center gap-2 text-sm"><input type="checkbox" name="aplicarBajas" defaultChecked={p.politica_precios.aplicarBajas} /> Si la LPU nueva baja un precio, aplicarlo</label>
              </fieldset>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Alícuota de IVA (%)"><Input name="iva_alicuota" defaultValue={p.iva_alicuota} /></Campo>
                <Campo label="Horas para aceptar una tarea"><Input type="number" name="horas_aceptacion" defaultValue={p.horas_aceptacion} /></Campo>
                <Campo label="Antigüedad máxima para certificar (días)"><Input type="number" name="antiguedad_maxima_dias" defaultValue={p.antiguedad_maxima_dias} /></Campo>
                <Campo label="Reenvíos sin cambios antes de escalar"><Input type="number" name="reenvios_para_escalar" defaultValue={p.reenvios_para_escalar} /></Campo>
                <Campo label="Radio para posibles duplicados (m)"><Input type="number" name="radio_duplicados_metros" defaultValue={p.radio_duplicados_metros} /></Campo>
              </div>
              <BotonEnviar>Guardar parámetros</BotonEnviar>
            </Formulario>
          </Card>
          <Card titulo="Tareas programadas">
            <p className="mb-3 text-sm text-slate-600">En producción corren periódicamente: vencimiento de tareas sin aceptar, verificación de la cadena de auditoría y recordatorios. Acá se pueden ejecutar a mano.</p>
            <Formulario accion={accionVencimientos}><BotonEnviar estilo="secundario">Procesar vencimientos ahora</BotonEnviar></Formulario>
          </Card>
        </div>
      )}
      {tab === 'flujos' && (
        <div className="space-y-5">
          {await Promise.all(['certificado', 'tarea'].map(async (k) => {
            const f = await flujoVigente(k)
            return (
              <Card key={k} titulo={`Flujo de ${k} — versión ${f.def.version} (vigente desde ${f.def.vigente_desde})`} sinPadding>
                <div className="flex flex-wrap gap-1.5 border-b border-slate-100 p-3">{f.def.estados.map((e) => <Badge key={e.clave} color={e.color}>{e.etiqueta}{e.sla_horas ? ` · SLA ${e.sla_horas} h` : ''}</Badge>)}</div>
                <FlujoTabla def={f.def} />
              </Card>
            )
          }))}
          <p className="text-xs text-slate-500">Los flujos se definen en archivos versionados (carpeta <code>flujos/</code>). Cada instancia queda anclada a la versión con la que nació; una versión nueva se valida (estados alcanzables, piezas existentes) antes de publicarse.</p>
        </div>
      )}
    </>
  )
}
