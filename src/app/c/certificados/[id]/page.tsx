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
      <AyudaContextual titulo="¿Cómo cargo el certificado?" href="/c/ayuda#guia-certificar" abierta={c.versionActual <= 1 && c.estado === 'BORRADOR'}>
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
      {(val.bloqueantes.length > 0 || val.alertas.length > 0) && (
        <div className="mb-4 grid gap-3 lg:grid-cols-2">
          {val.bloqueantes.length > 0 && <Aviso tono="alerta" titulo="Para poder emitir falta:">{val.bloqueantes.map((b) => `• ${b.mensaje}`).join('\n')}</Aviso>}
          {val.alertas.length > 0 && <Aviso tono="info" titulo="Advertencias (no bloquean, las revisa el validador):">{val.alertas.map((b) => `• ${b.mensaje}`).join('\n')}</Aviso>}
        </div>
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
        <div className="space-y-5">
          <Card titulo={`Documentación (${d.documentos.length})`}>
            <p className="mb-3 text-xs text-slate-500">Obligatoria. Fotos, conforme a obra, remitos, planos (.dwg), planillas… El solicitante valida si alcanza.</p>
            <Formulario accion={accionAdjuntar} className="space-y-2" reiniciar>
              <input type="hidden" name="certificadoId" value={c.id} />
              <Input type="file" name="archivos" multiple required />
              <Select name="tipo" defaultValue="auto">
                <option value="auto">Detectar tipo</option>
                {['foto', 'conforme_obra', 'remito', 'plano', 'factura', 'otro'].map((k) => <option key={k} value={k}>{TIPOS_DOCUMENTO[k]}</option>)}
              </Select>
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
            <Card titulo="Desde la bitácora de la cuadrilla">
              <Formulario accion={accionImportarBitacora} className="space-y-2">
                <input type="hidden" name="certificadoId" value={c.id} />
                <div className="grid grid-cols-3 gap-2">
                  {fotosBitacora.map((f) => (
                    <label key={f.id} className="relative block cursor-pointer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/archivos/${f.id}`} alt={f.nombre} className="h-16 w-full rounded bg-slate-100 object-cover" />
                      <input type="checkbox" name="documentoId" value={f.id} className="absolute left-1 top-1" />
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
