import Link from 'next/link'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { requerirUsuario } from '@/server/sesion'
import { esNacional } from '@/server/usuarios'
import { Badge, Card, Encabezado, Pesos, Tabla, Td, Th } from '@/components/ui'

export const metadata = { title: 'Contratistas' }

export default async function Contratistas() {
  const u = await requerirUsuario('interno')
  const subs = esNacional(u) ? null : (u.subregionIds.length ? u.subregionIds : [-1])
  const filas = (await getDb().execute<{ id: number; razon_social: string; cuit: string; suspendido: boolean; subregiones: string; tareas_activas: number; certs_curso: number; monto_curso: string; observados: number }>(sql`
    select k.id, k.razon_social, k.cuit, k.suspendido,
      (select string_agg(s.nombre, ', ' order by s.nombre) from contratista_subregiones cs join subregiones s on s.id = cs.subregion_id where cs.contratista_id = k.id) subregiones,
      (select count(*)::int from tareas t where t.contratista_id = k.id and t.estado not in ('CERTIFICADA','DESESTIMADA','CANCELADA')) tareas_activas,
      (select count(*)::int from certificados c where c.contratista_id = k.id and c.estado not in ('CERRADO','ANULADO','ANULADO_REVERTIDO','BORRADOR')) certs_curso,
      (select coalesce(sum(c.subtotal_actual), 0) from certificados c where c.contratista_id = k.id and c.estado not in ('CERRADO','ANULADO','ANULADO_REVERTIDO','BORRADOR','EN_LIQUIDACION')) monto_curso,
      (select count(*)::int from certificados c where c.contratista_id = k.id and c.estado in ('OBSERVADO','REBOTE_MATERIALES')) observados
    from contratistas k
    where k.activo ${subs ? sql`and exists (select 1 from contratista_subregiones cs where cs.contratista_id = k.id and cs.subregion_id = any(${subs}::int[]))` : sql``}
    order by k.razon_social`)).rows
  return (
    <>
      <Encabezado titulo="Contratistas" subtitulo="Habilitados en tus subregiones" />
      <Card sinPadding>
        <Tabla>
          <thead><tr><Th>Contratista</Th><Th>Subregiones</Th><Th className="text-right">Tareas activas</Th><Th className="text-right">Certificados en curso</Th><Th className="text-right">Monto en curso</Th><Th className="text-right">Para corregir</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filas.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50">
                <Td><Link className="font-medium text-marca-700 hover:underline" href={`/i/contratistas/${f.id}`}>{f.razon_social}</Link><div className="text-xs text-slate-500">CUIT {f.cuit} {f.suspendido && <Badge color="red">Suspendido</Badge>}</div></Td>
                <Td className="text-xs text-slate-600">{f.subregiones}</Td>
                <Td className="num">{f.tareas_activas}</Td><Td className="num">{f.certs_curso}</Td><Td className="num"><Pesos v={f.monto_curso} /></Td>
                <Td className="num">{f.observados > 0 ? <Badge color="red">{f.observados}</Badge> : 0}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Card>
    </>
  )
}
