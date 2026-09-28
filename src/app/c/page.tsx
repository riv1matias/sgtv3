import Link from 'next/link'
import { and, eq, inArray, sql } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { requerirUsuario } from '@/server/sesion'
import { bandejaTareas, liquidacionesDe, listarCertificados } from '@/server/consultas'
import { TablaCertificados, TablaTareas } from '@/components/filas'
import { Card, Encabezado, Kpi, Pesos } from '@/components/ui'
import { formatoPesos } from '@/domain/dinero'

export const metadata = { title: 'Mi bandeja' }

export default async function BandejaContratista() {
  const u = await requerirUsuario('contratista')
  const cid = u.contratistaId ?? -1
  const [porAceptar, enCurso, corregir, borradores, liqs, [montos]] = await Promise.all([
    bandejaTareas(u, ['ASIGNADA', 'PEDIDO_REASIGNACION']),
    bandejaTareas(u, ['ACEPTADA', 'EN_EJECUCION', 'EN_ESPERA', 'EJECUTADA']),
    listarCertificados(u, { estado: 'OBSERVADO' }).then(async (a) => ({ filas: [...a.filas, ...(await listarCertificados(u, { estado: 'REBOTE_MATERIALES' })).filas] })),
    listarCertificados(u, { estado: 'BORRADOR' }),
    liquidacionesDe(u),
    getDb().select({
      enAprobacion: sql<string>`coalesce(sum(${s.certificados.subtotalActual}) filter (where ${s.certificados.estado} in ('VAL_TECNICA','PEDIDO_RETIRO','APROB_GERENTE','VAL_MATERIALES','APROB_FINAL','REVISION_RECHAZO','REBOTE_MATERIALES')), 0)`,
      aprobado: sql<string>`coalesce(sum(${s.certificados.subtotalActual}) filter (where ${s.certificados.estado} = 'APROBADO'), 0)`,
      liquidado: sql<string>`coalesce(sum(${s.certificados.subtotalFinal}) filter (where ${s.certificados.estado} = 'EN_LIQUIDACION'), 0)`,
    }).from(s.certificados).where(eq(s.certificados.contratistaId, cid)),
  ])
  const pendFactura = liqs.filter((l) => l.l.estado === 'pendiente_factura')
  const cambiosTipo = await getDb().select().from(s.tareas).where(and(eq(s.tareas.contratistaId, cid), sql`${s.tareas.datosExtra} ? 'cambioTipoPendiente'`))
  const sinCertificar = enCurso.filter((t) => t.acciones.length && ['EJECUTADA'].includes(t.estado))
  void inArray
  return (
    <>
      <Encabezado titulo={u.contratistaNombre ?? 'Mi empresa'} subtitulo={`Hola, ${u.nombre}. Esto es lo que espera una acción de tu empresa.`} />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="En aprobación" valor={<span className="text-xl">{formatoPesos(montos.enAprobacion)}</span>} detalle="Neto, emitido y en revisión" href="/c/certificados?estado=en_curso" />
        <Kpi label="Aprobado, esperando cierre" valor={<span className="text-xl">{formatoPesos(montos.aprobado)}</span>} detalle="Se liquida al corte del período" tono="ok" />
        <Kpi label="Liquidado, falta factura" valor={<span className="text-xl">{formatoPesos(montos.liquidado)}</span>} tono={pendFactura.length ? 'alerta' : 'neutro'} href="/c/liquidaciones" />
        <Kpi label="Certificados para corregir" valor={corregir.filas.length} tono={corregir.filas.length ? 'peligro' : 'ok'} />
      </div>
      {cambiosTipo.length > 0 && (
        <Card titulo="Cambios de tipo de trabajo que requieren tu conformidad" className="mb-5 border-amber-200">
          <ul className="text-sm">{cambiosTipo.map((t) => <li key={t.id}><Link href={`/c/tareas/${t.id}`} className="text-marca-700 hover:underline">{t.numero}</Link> {t.titulo}</li>)}</ul>
        </Card>
      )}
      {pendFactura.length > 0 && (
        <Card titulo="Liquidaciones listas para facturar" className="mb-5 border-amber-200">
          <ul className="space-y-1 text-sm">{pendFactura.map((l) => <li key={l.l.id}><Link href={`/c/liquidaciones/${l.l.id}`} className="font-medium text-marca-700 hover:underline">{l.l.numero}</Link> · período {l.p.nombre} · total <Pesos v={l.l.total} /></li>)}</ul>
        </Card>
      )}
      {corregir.filas.length > 0 && <Card titulo="Certificados observados o rebotados" className="mb-5" sinPadding><TablaCertificados filas={corregir.filas} portal="c" /></Card>}
      {porAceptar.length > 0 && <Card titulo={`Tareas por aceptar (${porAceptar.length})`} className="mb-5" sinPadding><TablaTareas filas={porAceptar} portal="c" conAcciones /></Card>}
      {borradores.filas.length > 0 && <Card titulo="Borradores sin emitir" className="mb-5" sinPadding><TablaCertificados filas={borradores.filas} portal="c" /></Card>}
      {sinCertificar.length > 0 && <Card titulo="Tareas ejecutadas pendientes de certificar" className="mb-5" sinPadding><TablaTareas filas={sinCertificar} portal="c" /></Card>}
      <Card titulo={`Tareas en curso (${enCurso.length})`} sinPadding><TablaTareas filas={enCurso} portal="c" conAcciones vacio="No hay tareas en curso" /></Card>
    </>
  )
}
