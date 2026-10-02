import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { requerirUsuario } from '@/server/sesion'
import { accionesCertificado, certificadoCompleto, ESTADOS_EDITABLES, previsualizarValidaciones } from '@/server/servicios/certificados'
import { precioALaFecha } from '@/server/servicios/precios'
import { parametros } from '@/server/comun'
import { accionAdjuntar, accionImportarBitacora, accionQuitarDocumento } from '@/app/acciones/certificados'
import { EtapasCertificado } from '@/components/progreso'
import { Icono } from '@/components/iconos'
import { VistaCertificado } from '@/components/vista-certificado'
import { AccionesFlujo } from '@/components/acciones-flujo'
import { EstadoBadge } from '@/components/estado'
import { GaleriaDocumentos } from '@/components/documentos'
import { BotonEnviar, Formulario } from '@/components/formulario'
import { Aviso, AyudaContextual, Card, Encabezado, Input, Select } from '@/components/ui'
import { listaPara } from '@/domain/precios'
import { hoy, periodoActual } from '@/lib/fechas'
import { TIPOS_DOCUMENTO } from '@/lib/etiquetas'
import { EditorCertificado, type ItemEditor } from './editor'

export default async function Pagina({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ emitido?: string }> }) {
  const u = await requerirUsuario('contratista')
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const d = await certificadoCompleto(id)
  if (d.cert.contratistaId !== u.contratistaId) notFound()
  if (!ESTADOS_EDITABLES.includes(d.cert.estado) || !u.roles.includes('contratista_responsable')) {
    return (
      <>
        {sp.emitido && <div className="mb-4"><Aviso tono="ok">Certificado emitido. Ahora está en validación; vas a ver acá en qué paso está y quién lo tiene.</Aviso></div>}
        <VistaCertificado id={id} u={u} />
      </>
    )
  }
  const { cert: c, tarea: t } = d
  const lista = listaPara(t.tipoTrabajo)
  const [precios, par, val, { def, acciones }] = await Promise.all([precioALaFecha(getDb(), lista, hoy()), parametros(), previsualizarValidaciones(c.id), accionesCertificado(c, t, u)])
  // Observaciones de la última devolución (por ítem, se mapean por código/material)
  const ultimasObs = await getDb().select({ o: s.observacionesItem, a: s.aprobaciones, it: s.certificadoItems }).from(s.observacionesItem)
    .innerJoin(s.aprobaciones, eq(s.aprobaciones.id, s.observacionesItem.aprobacionId))
    .innerJoin(s.certificadoItems, eq(s.certificadoItems.id, s.observacionesItem.itemId))
    .where(and(eq(s.aprobaciones.certificadoId, c.id), eq(s.aprobaciones.version, c.versionActual - 1)))
  const [ultimaDevolucion] = await getDb().select().from(s.aprobaciones).where(and(eq(s.aprobaciones.certificadoId, c.id), inArray(s.aprobaciones.accion, ['observar', 'rebotar', 'rechazar']))).orderBy(desc(s.aprobaciones.id)).limit(1)
  const obsDe = (tipo: string, codigoMoId: number | null, materialId: number | null) =>
    ultimasObs.filter((x) => x.it.tipo === tipo && x.it.codigoMoId === codigoMoId && x.it.materialId === materialId).map((x) => x.o.comentario)
  const items: ItemEditor[] = d.items.map((f) => ({
    key: `i${f.item.id}`, tipo: f.item.tipo as ItemEditor['tipo'],
    codigo: f.codigo ? { id: f.codigo.id, codigoS4: f.codigo.codigoS4, descripcion: f.codigo.descripcion, unidad: f.codigo.unidad, alcance: f.codigo.alcance, montoAbierto: f.codigo.montoAbierto, requiereFactura: f.codigo.requiereFactura, precio: precios.precio(f.codigo.id) } : undefined,
    material: f.material ? { id: f.material.id, codigoSap: f.material.codigoSap, descripcion: f.material.descripcion, unidad: f.material.unidad } : undefined,
    cantidad: f.item.cantidad ? String(Number(f.item.cantidad)) : '', importe: f.item.importe ? String(Number(f.item.importe)) : '',
    justificacion: f.item.justificacion ?? '', estadoRecuperado: f.item.estadoRecuperado ?? 'utilizable', observacion: f.item.observacion ?? '',
    facturaNumero: f.item.facturaNumero ?? '', facturaCuit: f.item.facturaCuit ?? '', facturaFecha: f.item.facturaFecha ?? '',
    facturaImporte: f.item.facturaImporte ? String(Number(f.item.facturaImporte)) : '', facturaDocumentoId: f.item.facturaDocumentoId ?? '',
    observaciones: obsDe(f.item.tipo, f.item.codigoMoId, f.item.materialId),
  }))
  const bitacora = await getDb().select({ doc: s.documentos }).from(s.tareaBitacora).innerJoin(s.documentos, eq(s.documentos.id, s.tareaBitacora.documentoId)).where(eq(s.tareaBitacora.tareaId, t.id))
  const yaAdjuntos = new Set(d.documentos.map((x) => x.id))
  const fotosBitacora = bitacora.map((b) => b.doc).filter((x) => !yaAdjuntos.has(x.id))
  const otras = acciones.filter((a) => !['emitir', 'responder_rebote'].includes(a.transicion.accion))

  return (
    <>
      <Encabezado
        volver={{ href: `/c/tareas/${t.id}`, texto: `${t.numero} · ${t.titulo}` }}
        titulo={<span className="flex items-center gap-2">{c.numero} <EstadoBadge flujoId={c.flujoId} estado={c.estado} /></span>}
        subtitulo={<>Certificado {c.orden} de {t.certificadosPrevistos} · versión {c.versionActual} en edición · {t.urgencia ? 'Tarea de urgencia · ' : ''}lista de precios de {lista}</>}
        acciones={otras.length > 0 && <AccionesFlujo entidad="certificado" id={c.id} lockVersion={c.lockVersion} def={def} acciones={otras} />}
      />
      <EtapasCertificado estado={c.estado} />
      <AyudaContextual titulo="¿Cómo cargo el certificado?" href="/c/ayuda#guia-certificar">
        <ol className="list-decimal space-y-1 pl-4 [&>li]:ml-0 [&>li]:list-decimal">
          <li><b>Carátula</b>: período y fechas de ejecución. Si hay materiales, también centro y almacén.</li>
          <li><b>Mano de obra</b>: buscá el código por S4, alias o descripción y cargá la cantidad. El precio sale de la LPU vigente. Los montos abiertos piden importe y justificación.</li>
          <li><b>Materiales</b> usados y <b>recuperados</b> (con su estado).</li>
          <li><b>Documentos</b>: fotos del antes y después como mínimo. Podés traer las fotos de la bitácora.</li>
          <li><b>Guardá</b> el borrador cuando quieras y <b>emití</b> cuando esté completo: el sistema te avisa si falta algo.</li>
        </ol>
      </AyudaContextual>
      {ultimaDevolucion && c.estado !== 'BORRADOR' && (
        <div className="mb-4"><Aviso tono="error" titulo={c.estado === 'REBOTE_MATERIALES' ? 'Administración rebotó los materiales' : 'El certificado fue observado'}>
          {ultimaDevolucion.motivo ? `${ultimaDevolucion.motivo}: ` : ''}{ultimaDevolucion.comentario}
        </Aviso></div>
      )}
      <div className="grid gap-5 xl:grid-cols-4">
        <div className="xl:col-span-3">
          <EditorCertificado
            certificadoId={c.id} estado={c.estado} lista={lista} alicuotaIva={par.iva_alicuota} urgencia={t.urgencia} lockVersion={c.lockVersion}
            accionEmitir={c.estado === 'REBOTE_MATERIALES' ? 'responder_rebote' : 'emitir'} mostrarEsFinal={t.certificadosPrevistos > 1}
            cabecera={{ periodo: c.periodo ?? periodoActual(), fechaEjecDesde: c.fechaEjecDesde ?? '', fechaEjecHasta: c.fechaEjecHasta ?? '', centro: c.centro ?? '', almacen: c.almacen ?? '', comentario: c.comentario ?? '', esFinal: c.esFinal }}
            items={items}
          />
        </div>
        <div className="space-y-5 xl:sticky xl:top-20 xl:self-start">
          <section className={`rounded-2xl border p-4 text-sm ${val.bloqueantes.length ? 'border-amber-200 bg-amber-50/70' : 'border-green-200 bg-green-50/70'}`} aria-label="Estado para emitir">
            <div className={`flex items-center gap-2 font-semibold ${val.bloqueantes.length ? 'text-amber-900' : 'text-green-800'}`}>
              <Icono nombre={val.bloqueantes.length ? 'alerta' : 'check'} />
              {val.bloqueantes.length ? 'Para poder emitir falta:' : 'Listo para emitir'}
            </div>
            {val.bloqueantes.length > 0 && <ul className="mt-2 space-y-1 text-amber-900">{val.bloqueantes.map((b) => <li key={b.mensaje} className="flex gap-2"><span aria-hidden>•</span>{b.mensaje}</li>)}</ul>}
            {!val.bloqueantes.length && <p className="mt-1 text-green-800">Revisá los importes abajo y tocá <b>Emitir certificado</b>.</p>}
            {val.alertas.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-medium text-slate-600">{val.alertas.length} advertencia{val.alertas.length > 1 ? 's' : ''} (no bloquean)</summary>
                <ul className="mt-1 space-y-1 text-xs text-slate-600">{val.alertas.map((b) => <li key={b.mensaje}>• {b.mensaje}</li>)}</ul>
              </details>
            )}
            <p className="mt-2 text-[11px] text-slate-500">Se actualiza al guardar.</p>
          </section>
          <Card titulo={`5. Documentación (${d.documentos.length})`}>
            <p className="mb-3 text-xs text-slate-500">Obligatoria: fotos del antes y después como mínimo, y remitos, planos o planillas si corresponde.</p>
            <Formulario accion={accionAdjuntar} className="space-y-2" reiniciar>
              <input type="hidden" name="certificadoId" value={c.id} />
              <Input type="file" name="archivos" multiple required className="file:mr-3 file:rounded-md file:border-0 file:bg-marca-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-marca-700" />
              <details className="text-xs">
                <summary className="cursor-pointer text-slate-500 hover:text-marca-700">Tipo de documento: se detecta solo (cambiar)</summary>
                <Select name="tipo" defaultValue="auto" className="mt-1">
                  <option value="auto">Detectar tipo</option>
                  {['foto', 'conforme_obra', 'remito', 'plano', 'factura', 'otro'].map((k) => <option key={k} value={k}>{TIPOS_DOCUMENTO[k]}</option>)}
                </Select>
              </details>
              <BotonEnviar chico estilo="secundario">Adjuntar</BotonEnviar>
            </Formulario>
            <div className="mt-4">
              <GaleriaDocumentos angosta docs={d.documentos} quitar={(doc) => (
                <Formulario accion={accionQuitarDocumento}>
                  <input type="hidden" name="certificadoId" value={c.id} />
                  <input type="hidden" name="documentoId" value={doc.id} />
                  <BotonEnviar chico estilo="fantasma">✕</BotonEnviar>
                </Formulario>
              )} />
            </div>
          </Card>
          {fotosBitacora.length > 0 && (
            <Card titulo="Fotos de la cuadrilla">
              <p className="-mt-1 mb-2 text-xs text-slate-500">Marcá las que quieras sumar al certificado.</p>
              <Formulario accion={accionImportarBitacora} className="space-y-2">
                <input type="hidden" name="certificadoId" value={c.id} />
                <div className="grid grid-cols-3 gap-2">
                  {fotosBitacora.map((f) => (
                    <label key={f.id} className="relative block cursor-pointer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/archivos/${f.id}`} alt={f.nombre} className="h-20 w-full rounded-lg bg-slate-100 object-cover ring-marca-500 peer-checked:ring-2" />
                      <input type="checkbox" name="documentoId" value={f.id} className="absolute left-1.5 top-1.5 h-4 w-4 accent-marca-600" />
                    </label>
                  ))}
                </div>
                <BotonEnviar chico estilo="secundario">Agregar seleccionadas</BotonEnviar>
              </Formulario>
            </Card>
          )}
          <p className="text-xs text-slate-500">¿Dudas sobre un código? Consultá el alcance en la <Link href="/c/lpu" className="text-marca-700 underline">LPU vigente</Link>.</p>
        </div>
      </div>
    </>
  )
}
