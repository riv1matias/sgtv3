import Link from 'next/link'
import { and, eq, sql } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { requerirUsuario } from '@/server/sesion'
import { EstadoBadge } from '@/components/estado'

export default async function Hoy() {
  const u = await requerirUsuario('contratista')
  const tareas = await getDb().select().from(s.tareas).where(and(eq(s.tareas.contratistaId, u.contratistaId ?? -1), sql`${s.tareas.estado} in ('ACEPTADA','EN_EJECUCION','EN_ESPERA','EJECUTADA')`))
  const mias = tareas.filter((t) => (t.datosExtra as Record<string, unknown>).tecnicoId === u.id)
  const lista = mias.length ? mias : tareas
  return (
    <>
      <h1 className="mb-3 text-lg font-semibold">{mias.length ? 'Mis tareas' : 'Tareas de la empresa'}</h1>
      <ul className="space-y-2">
        {lista.map((t) => (
          <li key={t.id}>
            <Link href={`/campo/${t.id}`} className="block rounded-xl bg-white p-4 shadow-sm active:bg-slate-100">
              <div className="flex items-center justify-between gap-2"><span className="text-xs text-slate-500">{t.numero}</span><EstadoBadge flujoId={t.flujoId} estado={t.estado} /></div>
              <div className="mt-1 font-medium">{t.urgencia && '⚡ '}{t.titulo}</div>
              <div className="text-sm text-slate-500">{t.direccion}</div>
            </Link>
          </li>
        ))}
        {!lista.length && <li className="py-10 text-center text-sm text-slate-500">No tenés tareas asignadas</li>}
      </ul>
    </>
  )
}
