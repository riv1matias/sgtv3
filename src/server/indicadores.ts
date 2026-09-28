import { sql, type SQL } from 'drizzle-orm'
import { getDb } from '@/db'
import { esNacional, type Usuario } from './usuarios'

export interface FiltrosInd { desde?: string; hasta?: string; tipo?: string; contratista?: string; subregion?: string; imputacion?: string }

/** Condición SQL sobre la tabla tareas (alias t) según alcance y filtros */
function condicion(u: Usuario, f: FiltrosInd): SQL {
  const partes: SQL[] = [sql`true`]
  if (u.tipo === 'contratista') partes.push(sql`t.contratista_id = ${u.contratistaId ?? -1}`)
  else if (!esNacional(u)) {
    const personas = [u.id, ...u.supervisados, ...u.delegantes]
    partes.push(sql`(t.subregion_id = any(${u.subregionIds.length ? u.subregionIds : [-1]}::int[]) or t.solicitante_id = any(${personas}::uuid[]))`)
  }
  if (f.tipo) partes.push(sql`t.tipo_trabajo = ${f.tipo}`)
  if (f.contratista) partes.push(sql`t.contratista_id = ${Number(f.contratista)}`)
  if (f.subregion) partes.push(sql`t.subregion_id = ${Number(f.subregion)}`)
  if (f.imputacion) partes.push(sql`t.imputacion_id = ${Number(f.imputacion)}`)
  return sql.join(partes, sql` and `)
}

function rango(f: FiltrosInd, col: SQL) {
  const p: SQL[] = [sql`true`]
  if (f.desde) p.push(sql`${col} >= ${f.desde}::date`)
  if (f.hasta) p.push(sql`${col} < (${f.hasta}::date + 1)`)
  return sql.join(p, sql` and `)
}

export async function indicadores(u: Usuario, f: FiltrosInd) {
  const db = getDb()
  const w = condicion(u, f)
  const r = rango(f, sql`c.primera_emision_at`)
  const q = async <T,>(s: SQL) => (await db.execute(s)).rows as T[]

  const [porEstado, porMes, calidad, motivos, tiempos, tareas, causales, ranking, peps, abiertos] = await Promise.all([
    q<{ estado: string; n: number; monto: string }>(sql`
      select c.estado, count(*)::int n, coalesce(sum(coalesce(c.subtotal_final, c.subtotal_actual)), 0) monto
      from certificados c join tareas t on t.id = c.tarea_id
      where ${w} and ${r} and c.primera_emision_at is not null group by c.estado`),
    q<{ mes: string; emitido: string; final: string; n: number }>(sql`
      select to_char(c.primera_emision_at at time zone 'America/Argentina/Buenos_Aires', 'YYYY-MM') mes, count(*)::int n,
        coalesce(sum(c.subtotal_emision), 0) emitido, coalesce(sum(c.subtotal_final), 0) final
      from certificados c join tareas t on t.id = c.tarea_id
      where ${w} and ${r} and c.primera_emision_at is not null group by 1 order by 1`),
    q<{ aprobados: number; primera_vez: number; diferencia_lpu: string; emitido_final: string }>(sql`
      select count(*)::int aprobados,
        count(*) filter (where not exists (select 1 from aprobaciones a where a.certificado_id = c.id and a.accion in ('observar','rechazar','rebotar')))::int primera_vez,
        coalesce(sum(coalesce(c.subtotal_final, c.subtotal_actual) - c.subtotal_emision), 0) diferencia_lpu,
        coalesce(sum(c.subtotal_emision), 0) emitido_final
      from certificados c join tareas t on t.id = c.tarea_id
      where ${w} and ${r} and c.estado in ('APROBADO','EN_LIQUIDACION','CERRADO')`),
    q<{ accion: string; paso: string; motivo: string; n: number }>(sql`
      select a.accion, a.paso, coalesce(a.motivo, 'Sin motivo') motivo, count(*)::int n
      from aprobaciones a join certificados c on c.id = a.certificado_id join tareas t on t.id = c.tarea_id
      where ${w} and ${rango(f, sql`a.created_at`)} and a.accion in ('observar','rechazar','rebotar')
      group by 1, 2, 3 order by n desc limit 20`),
    // Horas en cada estado del certificado, calculadas desde la auditoría (fuente única de verdad)
    q<{ estado: string; horas: number; n: number }>(sql`
      with cambios as (
        select e.entidad_id, e.estado_hasta estado, e.ocurrido_en,
          lead(e.ocurrido_en) over (partition by e.entidad_id order by e.id) hasta
        from eventos e where e.entidad = 'certificado' and e.estado_hasta is not null and (e.estado_desde is distinct from e.estado_hasta)
      )
      select x.estado, avg(extract(epoch from (coalesce(x.hasta, now()) - x.ocurrido_en)) / 3600)::float horas, count(*)::int n
      from cambios x join certificados c on c.id::text = x.entidad_id join tareas t on t.id = c.tarea_id
      where ${w} and ${rango(f, sql`x.ocurrido_en`)} and x.estado not in ('CERRADO','ANULADO','ANULADO_REVERTIDO')
      group by x.estado`),
    q<{ estado: string; n: number; urgencias: number }>(sql`
      select t.estado, count(*)::int n, count(*) filter (where t.urgencia)::int urgencias from tareas t
      where ${w} and ${rango(f, sql`t.created_at`)} group by t.estado`),
    q<{ tipo: string; causal: string; n: number; horas: number }>(sql`
      select 'cierre' tipo, t.causal_cierre causal, count(*)::int n, 0::float horas from tareas t where ${w} and t.causal_cierre is not null and ${rango(f, sql`t.created_at`)} group by t.causal_cierre
      union all
      select 'espera', coalesce((e.cambios->>'motivo'), 'Sin motivo'), count(*)::int,
        sum(extract(epoch from (coalesce((select min(e2.ocurrido_en) from eventos e2 where e2.entidad = 'tarea' and e2.entidad_id = e.entidad_id and e2.id > e.id and e2.estado_desde = 'EN_ESPERA'), now()) - e.ocurrido_en)) / 3600)::float
      from eventos e join tareas t on t.id::text = e.entidad_id
      where e.entidad = 'tarea' and e.estado_hasta = 'EN_ESPERA' and ${w} and ${rango(f, sql`e.ocurrido_en`)} group by 2`),
    u.tipo === 'interno' ? q<{ id: number; razon: string; certs: number; monto: string; aprobados: number; primera: number; observaciones: number; ciclo_dias: number | null }>(sql`
      select k.id, k.razon_social razon, count(c.id)::int certs, coalesce(sum(coalesce(c.subtotal_final, c.subtotal_actual)), 0) monto,
        count(c.id) filter (where c.estado in ('APROBADO','EN_LIQUIDACION','CERRADO'))::int aprobados,
        count(c.id) filter (where c.estado in ('APROBADO','EN_LIQUIDACION','CERRADO') and not exists (select 1 from aprobaciones a where a.certificado_id = c.id and a.accion in ('observar','rechazar','rebotar')))::int primera,
        (select count(*)::int from aprobaciones a join certificados c2 on c2.id = a.certificado_id join tareas t2 on t2.id = c2.tarea_id where c2.contratista_id = k.id and a.accion in ('observar','rechazar','rebotar')) observaciones,
        avg(extract(epoch from ((select min(e.ocurrido_en) from eventos e where e.entidad = 'certificado' and e.entidad_id = c.id::text and e.estado_hasta = 'APROBADO') - c.primera_emision_at)) / 86400)::float ciclo_dias
      from certificados c join tareas t on t.id = c.tarea_id join contratistas k on k.id = c.contratista_id
      where ${w} and ${r} and c.primera_emision_at is not null group by k.id, k.razon_social order by monto desc`) : Promise.resolve([]),
    u.tipo === 'interno' ? q<{ numero: string; descripcion: string; presupuesto: string; comprometido: string; consumido: string }>(sql`
      select i.numero, i.descripcion, i.presupuesto,
        coalesce(sum(c.subtotal_actual) filter (where c.estado not in ('EN_LIQUIDACION','CERRADO','ANULADO','ANULADO_REVERTIDO') and c.primera_emision_at is not null), 0) comprometido,
        coalesce(sum(c.subtotal_final) filter (where c.estado in ('EN_LIQUIDACION','CERRADO')), 0) consumido
      from imputaciones i left join tareas t on t.imputacion_id = i.id left join certificados c on c.tarea_id = t.id
      where i.tipo = 'pep' and i.presupuesto is not null ${f.imputacion ? sql`and i.id = ${Number(f.imputacion)}` : sql``}
      group by i.id order by i.numero`) : Promise.resolve([]),
    q<{ rango: string; n: number; monto: string }>(sql`
      select case when d < 15 then '0–15 días' when d < 30 then '15–30 días' when d < 60 then '30–60 días' else 'más de 60 días' end rango,
        count(*)::int n, coalesce(sum(monto), 0) monto
      from (select extract(day from now() - c.primera_emision_at) d, c.subtotal_actual monto from certificados c join tareas t on t.id = c.tarea_id
            where ${w} and c.primera_emision_at is not null and c.estado not in ('APROBADO','EN_LIQUIDACION','CERRADO','ANULADO','ANULADO_REVERTIDO','BORRADOR')) x
      group by 1 order by min(d)`),
  ])
  return { porEstado, porMes, calidad: calidad[0], motivos, tiempos, tareas, causales, ranking, peps, abiertos }
}
