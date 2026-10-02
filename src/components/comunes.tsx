import Link from 'next/link'
import { and, eq, ilike, or, sql } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import type { Usuario } from '@/server/usuarios'
import { alcanceTareas, notificacionesDe } from '@/server/consultas'
import { marcarNotificacionesLeidas } from '@/app/acciones/sesion'
import { Card, Encabezado, Vacio } from './ui'
import { formatoFechaHora, hace } from '@/lib/fechas'
import { TIPOS_IMPUTACION } from '@/lib/etiquetas'

/** Búsqueda global: reconoce número de tarea, certificado, OT/PEP, CUIT, contratista o dirección */
export async function Busqueda({ u, q }: { u: Usuario; q: string }) {
  const portal = u.tipo === 'interno' ? 'i' : 'c'
  const texto = q.trim()
  const db = getDb()
  const patron = `%${texto}%`
  const [tareas, certs, imps, contrs] = texto ? await Promise.all([
    db.select({ id: s.tareas.id, numero: s.tareas.numero, titulo: s.tareas.titulo, direccion: s.tareas.direccion }).from(s.tareas)
      .where(and(alcanceTareas(u), or(ilike(s.tareas.numero, patron), ilike(s.tareas.titulo, patron), ilike(s.tareas.direccion, patron)))).limit(20),
    db.select({ id: s.certificados.id, numero: s.certificados.numero, titulo: s.tareas.titulo }).from(s.certificados).innerJoin(s.tareas, eq(s.tareas.id, s.certificados.tareaId))
      .where(and(alcanceTareas(u), ilike(s.certificados.numero, patron))).limit(20),
    u.tipo === 'interno' ? db.select({ imp: s.imputaciones, tareas: sql<number>`(select count(*)::int from tareas t where t.imputacion_id = imputaciones.id)` }).from(s.imputaciones)
      .where(or(ilike(s.imputaciones.numero, patron), ilike(s.imputaciones.descripcion, patron))).limit(10) : Promise.resolve([]),
    u.tipo === 'interno' ? db.select().from(s.contratistas).where(or(ilike(s.contratistas.razonSocial, patron), ilike(s.contratistas.cuit, patron))).limit(10) : Promise.resolve([]),
  ]) : [[], [], [], []]
  const total = tareas.length + certs.length + imps.length + contrs.length
  // Coincidencia exacta: ir directo
  const exacta = tareas.length + certs.length === 1 && !imps.length && !contrs.length
  return (
    <>
      <Encabezado titulo={`Resultados para “${texto}”`} subtitulo={`${total} resultado(s)`} />
      {!total && <Card><Vacio>No se encontró nada. Probá con el número de tarea, certificado, OT, PEP, CUIT o parte de la dirección.</Vacio></Card>}
      <div className="grid gap-5 lg:grid-cols-2">
        {tareas.length > 0 && <Card titulo="Tareas"><ul className="space-y-2 text-sm">{tareas.map((t) => <li key={t.id}><Link className="font-medium text-marca-700 hover:underline" href={`/${portal}/tareas/${t.id}`}>{t.numero}</Link> {t.titulo} <span className="text-xs text-slate-500">{t.direccion}</span></li>)}</ul></Card>}
        {certs.length > 0 && <Card titulo="Certificados"><ul className="space-y-2 text-sm">{certs.map((c) => <li key={c.id}><Link className="font-medium text-marca-700 hover:underline" href={`/${portal}/certificados/${c.id}`}>{c.numero}</Link> {c.titulo}</li>)}</ul></Card>}
        {imps.length > 0 && <Card titulo="Imputaciones"><ul className="space-y-2 text-sm">{imps.map((x) => <li key={x.imp.id}><Link className="font-medium text-marca-700 hover:underline" href={`/i/indicadores?imputacion=${x.imp.id}`}>{TIPOS_IMPUTACION[x.imp.tipo]} {x.imp.numero}</Link> {x.imp.descripcion} <span className="text-xs text-slate-500">({x.tareas} tareas)</span></li>)}</ul></Card>}
        {contrs.length > 0 && <Card titulo="Contratistas"><ul className="space-y-2 text-sm">{contrs.map((c) => <li key={c.id}><Link className="font-medium text-marca-700 hover:underline" href={`/i/contratistas/${c.id}`}>{c.razonSocial}</Link> <span className="text-xs text-slate-500">CUIT {c.cuit}</span></li>)}</ul></Card>}
      </div>
      {exacta && <meta httpEquiv="refresh" content={`0;url=/${portal}/${tareas.length ? 'tareas/' + tareas[0].id : 'certificados/' + certs[0].id}`} />}
    </>
  )
}

export async function Notificaciones({ u }: { u: Usuario }) {
  const ns = await notificacionesDe(u, 100)
  return (
    <>
      <Encabezado titulo="Notificaciones" acciones={ns.some((n) => !n.leida) && <form action={marcarNotificacionesLeidas}><button className="rounded-lg px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50">Marcar todas como leídas</button></form>} />
      <Card sinPadding>
        {!ns.length ? <Vacio>Sin notificaciones</Vacio> : (
          <ul className="divide-y divide-slate-100">
            {ns.map((n) => (
              <li key={n.id} className={n.leida ? 'bg-white' : 'bg-marca-50/40'}>
                <Link href={n.link ?? '#'} className="block px-4 py-3 hover:bg-slate-50">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`text-sm ${n.leida ? 'text-slate-700' : 'font-semibold text-slate-900'}`}>{n.titulo}</span>
                    <span className="whitespace-nowrap text-xs text-slate-400" title={formatoFechaHora(n.createdAt)}>{hace(n.createdAt)}</span>
                  </div>
                  {n.cuerpo && <div className="text-xs text-slate-500">{n.cuerpo}</div>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
