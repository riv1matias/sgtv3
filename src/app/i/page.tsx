import Link from 'next/link'
import { requerirUsuario, tieneRol } from '@/server/sesion'
import { alertasDeEquipo, bandejaCertificados, bandejaTareas } from '@/server/consultas'
import { procesarVencimientos } from '@/server/servicios/tareas'
import { slaDe } from '@/components/estado'
import { TablaCertificados, TablaTareas } from '@/components/filas'
import { Card, Encabezado, Kpi, LinkBoton, Pesos } from '@/components/ui'
import { aTexto, dec, formatoPesos, suma } from '@/domain/dinero'
import { horasDesde } from '@/lib/fechas'

export const metadata = { title: 'Mi bandeja' }

export default async function Bandeja() {
  const u = await requerirUsuario('interno')
  await procesarVencimientos()
  const [certs, tareas, alertas] = await Promise.all([
    bandejaCertificados(u),
    bandejaTareas(u, ['DEVUELTA', 'PEDIDO_CIERRE', 'ASIGNADA', 'EN_EJECUCION', 'EN_ESPERA', 'ACEPTADA', 'EJECUTADA', 'CERTIFICADA', 'PENDIENTE_ETAPA']),
    alertasDeEquipo(u),
  ])
  // Tareas: solo las que requieren una acción propia (no las que el solicitante puede cancelar o desestimar en cualquier momento)
  const tareasAccion = tareas.filter((t) => ['DEVUELTA', 'PEDIDO_CIERRE'].includes(t.estado))
  const slas = await Promise.all(certs.map((c) => slaDe(c.flujoId, c.estado)))
  const vencidos = certs.filter((c, i) => slas[i] && horasDesde(c.desde) >= slas[i]!).length
  const monto = suma(certs.map((c) => dec(c.subtotal)))
  const grupos = [
    { titulo: 'Validación técnica', estados: ['VAL_TECNICA', 'PEDIDO_RETIRO'] },
    { titulo: 'Rechazos para revisar', estados: ['REVISION_RECHAZO'] },
    { titulo: 'Aprobación gerencial', estados: ['APROB_GERENTE'] },
    { titulo: 'Materiales y SAP', estados: ['VAL_MATERIALES', 'PENDIENTE_REVERSA_SAP'] },
    { titulo: 'Aprobación final', estados: ['APROB_FINAL'] },
  ]
  return (
    <>
      <Encabezado titulo={`Hola, ${u.nombre}`} subtitulo="Lo que espera una acción tuya, ordenado por antigüedad"
        acciones={tieneRol(u, 'solicitante') && <LinkBoton href="/i/tareas/nueva" estilo="primario">+ Nueva tarea</LinkBoton>} />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Certificados esperando mi acción" valor={certs.length} />
        <Kpi label="Fuera de plazo" valor={vencidos} tono={vencidos ? 'peligro' : 'ok'} detalle="Según el SLA de cada paso" />
        <Kpi label="Monto esperando mi acción" valor={<span className="text-xl">{formatoPesos(monto)}</span>} detalle="Subtotal neto" />
        <Kpi label="Tareas que requieren mi acción" valor={tareasAccion.length} tono={tareasAccion.length ? 'alerta' : 'neutro'} />
      </div>
      {alertas.length > 0 && (
        <Card titulo="Posibles tareas duplicadas en tu equipo" className="mb-5 border-amber-200">
          <ul className="space-y-1 text-sm">
            {alertas.map((a) => <li key={a.a.id}><Link className="text-marca-700 hover:underline" href={`/i/tareas/${a.a.entidadId}`}>{a.numero}</Link> — {a.a.mensaje}</li>)}
          </ul>
        </Card>
      )}
      {grupos.map((g) => {
        const filas = certs.filter((c) => g.estados.includes(c.estado))
        if (!filas.length) return null
        return (
          <Card key={g.titulo} titulo={<>{g.titulo} <span className="ml-1 text-slate-400">({filas.length})</span></>} className="mb-5" sinPadding
            acciones={<span className="text-xs text-slate-500">Total <Pesos v={aTexto(suma(filas.map((f) => dec(f.subtotal))))} /></span>}>
            <TablaCertificados filas={filas} portal="i" conAcciones />
          </Card>
        )
      })}
      {tareasAccion.length > 0 && (
        <Card titulo="Tareas que requieren tu decisión" className="mb-5" sinPadding>
          <TablaTareas filas={tareasAccion} portal="i" conAcciones />
        </Card>
      )}
      {!certs.length && !tareasAccion.length && (
        <Card><div className="py-8 text-center text-sm text-slate-500">No tenés pendientes. 🎉 <Link href="/i/tareas" className="text-marca-700 hover:underline">Ver tareas</Link></div></Card>
      )}
    </>
  )
}
