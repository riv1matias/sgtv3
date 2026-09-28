import Link from 'next/link'
import { and, asc, eq, sql } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { requerirUsuario } from '@/server/sesion'
import { Card, Encabezado, Vacio } from '@/components/ui'
import { EstadoBadge } from '@/components/estado'

export const metadata = { title: 'Cuadrillas' }

export default async function Cuadrillas() {
  const u = await requerirUsuario('contratista')
  const db = getDb()
  const tecnicos = await db.select({ u: s.usuarios }).from(s.usuarios).innerJoin(s.usuarioRoles, eq(s.usuarioRoles.usuarioId, s.usuarios.id))
    .where(and(eq(s.usuarios.contratistaId, u.contratistaId ?? -1), eq(s.usuarioRoles.rol, 'contratista_tecnico'))).orderBy(asc(s.usuarios.apellido))
  const tareas = await db.select().from(s.tareas).where(and(eq(s.tareas.contratistaId, u.contratistaId ?? -1), sql`${s.tareas.estado} in ('ACEPTADA','EN_EJECUCION','EN_ESPERA','EJECUTADA')`))
  const sinAsignar = tareas.filter((t) => !(t.datosExtra as Record<string, unknown>).tecnicoId)
  return (
    <>
      <Encabezado titulo="Cuadrillas" subtitulo="Tus técnicos y las tareas que tiene cada uno. Los técnicos cargan fotos y avances desde el celular (app de campo)." />
      <div className="grid gap-5 lg:grid-cols-2">
        {tecnicos.map(({ u: t }) => {
          const propias = tareas.filter((x) => (x.datosExtra as Record<string, unknown>).tecnicoId === t.id)
          return (
            <Card key={t.id} titulo={`${t.nombre} ${t.apellido} · ${t.cargo ?? 'Técnico'}`}>
              {propias.length ? <ul className="space-y-2 text-sm">{propias.map((x) => <li key={x.id} className="flex items-center justify-between gap-2"><Link className="text-marca-700 hover:underline" href={`/c/tareas/${x.id}`}>{x.numero} · {x.titulo}</Link><EstadoBadge flujoId={x.flujoId} estado={x.estado} /></li>)}</ul> : <Vacio>Sin tareas asignadas</Vacio>}
            </Card>
          )
        })}
        <Card titulo={`Tareas en curso sin cuadrilla asignada (${sinAsignar.length})`}>
          {sinAsignar.length ? <ul className="space-y-2 text-sm">{sinAsignar.map((x) => <li key={x.id} className="flex items-center justify-between gap-2"><Link className="text-marca-700 hover:underline" href={`/c/tareas/${x.id}`}>{x.numero} · {x.titulo}</Link><EstadoBadge flujoId={x.flujoId} estado={x.estado} /></li>)}</ul> : <Vacio>Todo asignado</Vacio>}
        </Card>
      </div>
      {!tecnicos.length && <p className="mt-4 text-sm text-slate-500">No hay técnicos dados de alta. Los usuarios de tu empresa se crean como usuarios externos en IDIRA.</p>}
    </>
  )
}
