import { notFound, redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { usuarioActual } from '@/server/sesion'
import { certificadoCompleto, puedeVerCertificado } from '@/server/servicios/certificados'
import { flujoPorId } from '@/server/flujos'
import { parametros } from '@/server/comun'
import { nombresUsuarios } from '@/components/detalle-tarea'
import { conIva } from '@/domain/precios'
import { formatoCantidad, formatoPesos } from '@/domain/dinero'
import { formatoFecha, formatoFechaHora, nombrePeriodo } from '@/lib/fechas'
import { TIPOS_IMPUTACION, TIPOS_TRABAJO, nombreRol } from '@/lib/etiquetas'
import { createHash } from 'node:crypto'
import { jsonCanonico } from '@/domain/auditoria'
import { BotonImprimir } from './boton'

export const metadata = { title: 'Certificado' }

export default async function Imprimir({ params }: { params: Promise<{ id: string }> }) {
  const u = await usuarioActual()
  if (!u) redirect('/login')
  const d = await certificadoCompleto((await params).id)
  if (!puedeVerCertificado(u, d.cert, d.tarea)) notFound()
  const { cert: c, tarea: t } = d
  const [def, par, nombres] = await Promise.all([flujoPorId(c.flujoId), parametros(), nombresUsuarios([t.solicitanteId, ...(t.supervisorId ? [t.supervisorId] : [])])])
  const [imp] = t.imputacionId ? await getDb().select().from(s.imputaciones).where(eq(s.imputaciones.id, t.imputacionId)) : []
  const [sub] = await getDb().select({ s: s.subregiones, r: s.regiones }).from(s.subregiones).innerJoin(s.regiones, eq(s.regiones.id, s.subregiones.regionId)).where(eq(s.subregiones.id, t.subregionId))
  const tot = conIva(c.subtotalFinal ?? c.subtotalActual ?? '0', par.iva_alicuota)
  const estado = def.estados.find((e) => e.clave === c.estado)?.etiqueta ?? c.estado
  // Huella del contenido de la versión: permite verificar que el documento impreso no fue alterado
  const huella = createHash('sha256').update(jsonCanonico({ cert: c.numero, version: d.versionVista, items: d.items.map((i) => [i.item.tipo, i.codigo?.codigoS4 ?? i.material?.codigoSap, i.item.cantidad, i.item.importe, i.item.subtotal]), docs: d.documentos.map((x) => x.sha256) })).digest('hex')
  const mo = d.items.filter((f) => f.item.tipo === 'mo')
  const mats = d.items.filter((f) => f.item.tipo === 'material')
  const recs = d.items.filter((f) => f.item.tipo === 'recuperado')
  const th = 'border border-slate-300 bg-slate-100 px-2 py-1 text-left text-[11px] font-semibold'
  const td = 'border border-slate-300 px-2 py-1 text-[11px]'
  return (
    <div className="mx-auto max-w-4xl bg-white p-8 text-slate-900">
      <BotonImprimir />
      <header className="mb-4 flex items-start justify-between border-b-2 border-slate-800 pb-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">Certificado de obra / servicio</div>
          <h1 className="text-2xl font-bold">{c.numero}</h1>
          <div className="text-sm">Versión {d.versionVista} · Certificado {c.orden} de {t.certificadosPrevistos}{c.esFinal ? ' (final)' : ''} · Estado: {estado}</div>
        </div>
        <div className="text-right text-sm">
          <div className="font-semibold">{d.contratista.razonSocial}</div>
          <div>CUIT {d.contratista.cuit}</div>
          <div>Emitido {formatoFechaHora(c.emitidoAt)}</div>
        </div>
      </header>
      <table className="mb-4 w-full border-collapse">
        <tbody>
          <tr><td className={th}>Tarea</td><td className={td}>{t.numero} · {t.titulo}</td><td className={th}>Tipo de trabajo</td><td className={td}>{TIPOS_TRABAJO[t.tipoTrabajo]}{t.subtipo ? ` · ${t.subtipo}` : ''}{t.urgencia ? ' · URGENCIA' : ''}</td></tr>
          <tr><td className={th}>Imputación</td><td className={td}>{imp ? `${TIPOS_IMPUTACION[imp.tipo]} ${imp.numero}` : '—'}</td><td className={th}>Región / subregión</td><td className={td}>{sub.r.nombre} · {sub.s.nombre}</td></tr>
          <tr><td className={th}>Dirección</td><td className={td}>{t.direccion}</td><td className={th}>Período</td><td className={td}>{nombrePeriodo(c.periodo)}</td></tr>
          <tr><td className={th}>Solicitante</td><td className={td}>{nombres[t.solicitanteId]}</td><td className={th}>Supervisor</td><td className={td}>{t.supervisorId ? nombres[t.supervisorId] : '—'}</td></tr>
          <tr><td className={th}>Ejecución</td><td className={td}>{formatoFecha(c.fechaEjecDesde)} al {formatoFecha(c.fechaEjecHasta)}</td><td className={th}>Centro / almacén</td><td className={td}>{c.centro} / {c.almacen}</td></tr>
        </tbody>
      </table>
      <h2 className="mb-1 text-sm font-bold">Mano de obra</h2>
      <table className="mb-4 w-full border-collapse">
        <thead><tr><th className={th}>Código</th><th className={th}>Descripción</th><th className={th}>UM</th><th className={`${th} text-right`}>Cantidad</th><th className={`${th} text-right`}>Precio unit.</th><th className={`${th} text-right`}>Subtotal</th></tr></thead>
        <tbody>
          {mo.map((f) => (
            <tr key={f.item.id}>
              <td className={td}>{f.codigo?.codigoS4}</td>
              <td className={td}>{f.codigo?.descripcion}{f.item.justificacion ? ` — ${f.item.justificacion}` : ''}{f.item.facturaNumero ? ` (Fact. ${f.item.facturaNumero})` : ''}</td>
              <td className={td}>{f.codigo?.unidad}</td>
              <td className={`${td} text-right`}>{f.codigo?.montoAbierto ? '—' : formatoCantidad(f.item.cantidad)}</td>
              <td className={`${td} text-right`}>{f.codigo?.montoAbierto ? 'Monto abierto' : formatoPesos(f.item.precioUnitario)}</td>
              <td className={`${td} text-right`}>{formatoPesos(f.item.subtotal)}</td>
            </tr>
          ))}
          <tr><td className={td} colSpan={5}><b>Subtotal neto</b></td><td className={`${td} text-right font-semibold`}>{formatoPesos(tot.subtotal)}</td></tr>
          <tr><td className={td} colSpan={5}>IVA {par.iva_alicuota}%</td><td className={`${td} text-right`}>{formatoPesos(tot.iva)}</td></tr>
          <tr><td className={td} colSpan={5}><b>Total</b></td><td className={`${td} text-right font-bold`}>{formatoPesos(tot.total)}</td></tr>
        </tbody>
      </table>
      {[['Materiales utilizados', mats], ['Materiales recuperados', recs]].map(([titulo, filas]) => (filas as typeof mats).length > 0 && (
        <div key={titulo as string}>
          <h2 className="mb-1 text-sm font-bold">{titulo as string}</h2>
          <table className="mb-4 w-full border-collapse">
            <thead><tr><th className={th}>Código SAP</th><th className={th}>Descripción</th><th className={`${th} text-right`}>Cantidad</th><th className={th}>UM</th></tr></thead>
            <tbody>{(filas as typeof mats).map((f) => <tr key={f.item.id}><td className={td}>{f.material?.codigoSap}</td><td className={td}>{f.material?.descripcion}{f.item.estadoRecuperado ? ` (${f.item.estadoRecuperado})` : ''}</td><td className={`${td} text-right`}>{formatoCantidad(f.item.cantidad)}</td><td className={td}>{f.material?.unidad}</td></tr>)}</tbody>
          </table>
        </div>
      ))}
      <h2 className="mb-1 text-sm font-bold">Aprobaciones</h2>
      <table className="mb-4 w-full border-collapse">
        <thead><tr><th className={th}>Paso</th><th className={th}>Acción</th><th className={th}>Nombre y apellido</th><th className={th}>Rol</th><th className={th}>Fecha y hora</th></tr></thead>
        <tbody>
          {d.aprobaciones.filter((a) => a.a.vigente).map((a) => (
            <tr key={a.a.id}><td className={td}>{def.estados.find((e) => e.clave === a.a.paso)?.etiqueta}</td><td className={td}>{a.a.accion}</td><td className={td}>{a.nombre} {a.apellido}</td><td className={td}>{nombreRol(a.a.rol)}</td><td className={td}>{formatoFechaHora(a.a.createdAt)}</td></tr>
          ))}
          {!d.aprobaciones.some((a) => a.a.vigente) && <tr><td className={td} colSpan={5}>Sin aprobaciones vigentes</td></tr>}
        </tbody>
      </table>
      <div className="mb-4 text-[11px]">Documentación adjunta: {d.documentos.map((x) => x.nombre).join(', ') || '—'}</div>
      <footer className="border-t border-slate-300 pt-2 text-[10px] text-slate-500">
        Documento generado por el sistema el {formatoFechaHora(new Date())}. Las aprobaciones reemplazan la firma manuscrita y constan en la auditoría inmutable.
        <br />Huella de integridad (SHA-256): <span className="font-mono">{huella}</span>
      </footer>
    </div>
  )
}
