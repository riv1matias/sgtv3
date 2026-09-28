import { notFound } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { requerirUsuario } from '@/server/sesion'
import { listarCertificados, listarTareas } from '@/server/consultas'
import { Tablero } from '@/components/tablero'
import { TablaCertificados, TablaTareas } from '@/components/filas'
import { TablaStock } from '@/components/stock'
import { Badge, Card, Dato, Encabezado, Pestanas } from '@/components/ui'
import { nombreRol } from '@/lib/etiquetas'

export default async function Contratista360({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const u = await requerirUsuario('interno')
  const [{ id }, { tab = 'resumen' }] = await Promise.all([params, searchParams])
  const db = getDb()
  const [c] = await db.select().from(s.contratistas).where(eq(s.contratistas.id, Number(id)))
  if (!c) notFound()
  const [subs, usuarios] = await Promise.all([
    db.select({ nombre: s.subregiones.nombre }).from(s.contratistaSubregiones).innerJoin(s.subregiones, eq(s.subregiones.id, s.contratistaSubregiones.subregionId)).where(eq(s.contratistaSubregiones.contratistaId, c.id)),
    db.select({ u: s.usuarios, rol: s.usuarioRoles.rol }).from(s.usuarios).leftJoin(s.usuarioRoles, eq(s.usuarioRoles.usuarioId, s.usuarios.id)).where(eq(s.usuarios.contratistaId, c.id)).orderBy(asc(s.usuarios.apellido)),
  ])
  const base = `/i/contratistas/${c.id}`
  return (
    <>
      <Encabezado volver={{ href: '/i/contratistas', texto: 'Contratistas' }} titulo={c.razonSocial}
        subtitulo={<span className="flex items-center gap-2">CUIT {c.cuit} · centro {c.centroSap} {c.suspendido && <Badge color="red">Suspendido</Badge>}</span>} />
      <Pestanas activa={tab} items={[
        { clave: 'resumen', texto: 'Indicadores', href: base },
        { clave: 'tareas', texto: 'Tareas', href: `${base}?tab=tareas` },
        { clave: 'certificados', texto: 'Certificados', href: `${base}?tab=certificados` },
        { clave: 'stock', texto: 'Stock', href: `${base}?tab=stock` },
        { clave: 'datos', texto: 'Datos y usuarios', href: `${base}?tab=datos` },
      ]} />
      {tab === 'resumen' && <Tablero u={u} f={{ contratista: String(c.id) }} />}
      {tab === 'tareas' && <Card sinPadding><TablaTareas filas={(await listarTareas(u, { contratista: String(c.id), estado: 'activas' })).filas} portal="i" vacio="Sin tareas activas" /></Card>}
      {tab === 'certificados' && <Card sinPadding><TablaCertificados filas={(await listarCertificados(u, { contratista: String(c.id) })).filas} portal="i" /></Card>}
      {tab === 'stock' && <TablaStock contratistaId={c.id} />}
      {tab === 'datos' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Card titulo="Datos">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Dato label="Razón social">{c.razonSocial}</Dato><Dato label="CUIT">{c.cuit}</Dato>
              <Dato label="Centro SAP">{c.centroSap}</Dato><Dato label="Almacenes">Proyecto {c.almacenProyecto} · Mantenimiento {c.almacenMantenimiento}</Dato>
              <Dato label="Subregiones habilitadas" className="sm:col-span-2">{subs.map((x) => x.nombre).join(', ')}</Dato>
            </dl>
          </Card>
          <Card titulo="Usuarios">
            <ul className="space-y-2 text-sm">{usuarios.map((x) => <li key={x.u.id + x.rol}>{x.u.nombre} {x.u.apellido} <span className="text-xs text-slate-500">· {nombreRol(x.rol)} · {x.u.email}</span></li>)}</ul>
          </Card>
        </div>
      )}
    </>
  )
}
