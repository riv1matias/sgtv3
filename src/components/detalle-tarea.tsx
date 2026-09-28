import Link from 'next/link'
import { notFound } from 'next/navigation'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import type { Usuario } from '@/server/usuarios'
import { detalleTarea, certificadosDeTarea, maestros } from '@/server/consultas'
import { accionesTarea, admiteCertificado, puedeVerTarea } from '@/server/servicios/tareas'
import { accionBitacora, accionCambiarImputacion, accionCambiarTipo, accionMensaje, accionResponderCambioTipo, accionSubasignar } from '@/app/acciones/tareas'
import { accionCrearCertificado } from '@/app/acciones/certificados'
import { AccionesFlujo } from './acciones-flujo'
import { EstadoBadge } from './estado'
import { TablaCertificados } from './filas'
import { GaleriaDocumentos } from './documentos'
import { LineaTiempo } from './linea-tiempo'
import { BotonEnviar, Formulario } from './formulario'
import { EtapasTarea, SiguientePaso } from './progreso'
import { Aviso, Badge, Campo, Card, Dato, Encabezado, Input, Pesos, Pestanas, Select, Textarea, Vacio } from './ui'
import { formatoFecha, formatoFechaHora, hace } from '@/lib/fechas'
import { TIPOS_IMPUTACION, TIPOS_TRABAJO } from '@/lib/etiquetas'
import { estadoDef } from '@/domain/flujo/motor'

export async function DetalleTarea({ id, u, tab = 'resumen', creada }: { id: string; u: Usuario; tab?: string; creada?: boolean }) {
  const d = await detalleTarea(id)
  if (!d || !puedeVerTarea(u, d.t)) notFound()
  const portal = u.tipo === 'interno' ? 'i' : 'c'
  const interno = portal === 'i'
  const { t } = d
  const [{ def, acciones }, certs, m] = await Promise.all([accionesTarea(t, u), certificadosDeTarea(t.id), interno ? maestros(u) : Promise.resolve(null)])
  const extra = t.datosExtra as Record<string, unknown>
  const cambioTipo = extra.cambioTipoPendiente as { tipo: string; motivo: string; por: string } | undefined
  const habilitados = m ? m.contratistas.filter((c) => m.habilitaciones.some((h) => h.contratistaId === c.id && h.subregionId === t.subregionId) && !c.suspendido && c.id !== t.contratistaId) : []
  const e = estadoDef(def, t.estado)
  const pelota = e.actor === 'contratista' ? d.contratista?.razonSocial : e.actor === 'solicitante' ? d.solicitanteNombre : null
  const activos = certs.filter((c) => !['ANULADO', 'ANULADO_REVERTIDO'].includes(c.estado))
  const puedeCertificar = !interno && u.roles.includes('contratista_responsable') && admiteCertificado(t) && activos.length < t.certificadosPrevistos && !activos.some((c) => c.estado === 'BORRADOR')
  const base = `/${portal}/tareas/${t.id}`
  const tecnicos = !interno ? await getDb().select().from(s.usuarios).innerJoin(s.usuarioRoles, eq(s.usuarioRoles.usuarioId, s.usuarios.id))
    .where(and(eq(s.usuarios.contratistaId, u.contratistaId ?? -1), eq(s.usuarioRoles.rol, 'contratista_tecnico'))).orderBy(asc(s.usuarios.apellido)) : []
  const fotosSinUsar = d.bitacora.filter((b) => b.doc)

  return (
    <>
      <Encabezado
        volver={{ href: `/${portal}/tareas`, texto: 'Tareas' }}
        titulo={<span className="flex flex-wrap items-center gap-2">{t.numero} <span className="font-normal text-slate-500">·</span> <span className="font-normal">{t.titulo}</span></span>}
        subtitulo={
          <span className="flex flex-wrap items-center gap-2">
            <EstadoBadge flujoId={t.flujoId} estado={t.estado} />
            <Badge>{TIPOS_TRABAJO[t.tipoTrabajo]}{t.subtipo ? ` · ${t.subtipo}` : ''}</Badge>
            {t.urgencia && <Badge color="red">⚡ Urgencia</Badge>}
            {t.causalEspera && <Badge color="slate">En espera: {t.causalEspera}</Badge>}
            {t.causalCierre && <Badge color="gray">Causal: {t.causalCierre}</Badge>}
            {pelota && <span className="text-xs">La pelota la tiene <b>{pelota}</b></span>}
          </span>
        }
        acciones={puedeCertificar && (
          <Formulario accion={accionCrearCertificado}>
            <input type="hidden" name="tareaId" value={t.id} />
            <BotonEnviar estilo="primario">+ Certificar {t.certificadosPrevistos > 1 ? `(avance ${activos.length + 1} de ${t.certificadosPrevistos})` : ''}</BotonEnviar>
          </Formulario>
        )}
      />
      <EtapasTarea estado={t.estado} />
      <SiguientePaso estado={t.estado} portal={portal} extra={puedeCertificar && t.estado !== 'EJECUTADA' ? <div>Ya podés certificar esta tarea con el botón <b>Certificar</b>.</div> : undefined} />
      {creada && <div className="mb-4"><Aviso tono="ok">Tarea creada y asignada. El contratista tiene {48} h para aceptarla.</Aviso></div>}
      {acciones.length > 0 && (
        <div className="no-print mb-5">
          <AccionesFlujo entidad="tarea" id={t.id} lockVersion={t.lockVersion} def={def} acciones={acciones} contratistas={habilitados} nombres={{ [t.solicitanteId]: d.solicitanteNombre }} />
        </div>
      )}
      {cambioTipo && (
        <div className="mb-5">
          <Aviso tono="alerta" titulo="Cambio de tipo de trabajo pendiente de conformidad">
            {cambioTipo.por} pidió cambiar de {TIPOS_TRABAJO[t.tipoTrabajo]} a {TIPOS_TRABAJO[cambioTipo.tipo]}: {cambioTipo.motivo}. Cambia la lista de precios de los certificados no cerrados.
            {!interno && (
              <Formulario accion={accionResponderCambioTipo} className="mt-2 flex gap-2">
                <input type="hidden" name="tareaId" value={t.id} />
                <BotonEnviar name="respuesta" value="si" chico>Dar conformidad</BotonEnviar>
                <BotonEnviar name="respuesta" value="no" estilo="peligro" chico>No acepto</BotonEnviar>
              </Formulario>
            )}
          </Aviso>
        </div>
      )}
      {interno && d.alertas.filter((a) => a.estado === 'abierta').map((a) => <div key={a.id} className="mb-3"><Aviso tono="alerta">{a.mensaje}</Aviso></div>)}

      <Pestanas activa={tab} items={[
        { clave: 'resumen', texto: 'Resumen', href: base },
        { clave: 'certificados', texto: `Certificados (${activos.length}/${t.certificadosPrevistos})`, href: `${base}?tab=certificados` },
        { clave: 'bitacora', texto: `Bitácora (${d.bitacora.length})`, href: `${base}?tab=bitacora` },
        { clave: 'mensajes', texto: `Mensajes (${d.mensajes.length})`, href: `${base}?tab=mensajes` },
        { clave: 'documentos', texto: `Documentos (${d.documentos.length})`, href: `${base}?tab=documentos` },
        { clave: 'historial', texto: 'Historial', href: `${base}?tab=historial` },
      ]} />

      {tab === 'resumen' && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card titulo="Datos del pedido" className="lg:col-span-2">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Dato label="Solicitante">{d.solicitanteNombre}</Dato>
              <Dato label="Supervisor">{d.supervisorNombre}</Dato>
              <Dato label="Contratista">{d.contratista?.razonSocial}</Dato>
              <Dato label="Región / subregión">{d.region.nombre} · {d.subregion.nombre}</Dato>
              <Dato label="Dirección">
                {t.direccion ?? '—'}
                {t.lat != null && <a className="ml-2 text-xs text-marca-700 hover:underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${t.lat}&mlon=${t.lng}#map=17/${t.lat}/${t.lng}`}>ver mapa ↗</a>}
              </Dato>
              <Dato label="Imputación">{d.imputacion ? `${TIPOS_IMPUTACION[d.imputacion.tipo]} ${d.imputacion.numero}` : <span className="text-red-600">Sin imputación</span>}<div className="text-xs text-slate-500">{d.imputacion?.descripcion}</div></Dato>
              <Dato label="Certificados previstos">{t.certificadosPrevistos}</Dato>
              <Dato label="Fecha tentativa">{formatoFecha(t.fechaTentativa)}</Dato>
              <Dato label="Pedida">{formatoFechaHora(t.createdAt)} ({hace(t.createdAt)})</Dato>
              {interno && t.presupuesto && <Dato label="Presupuesto (interno)"><Pesos v={t.presupuesto} /></Dato>}
              {Object.entries(extra).filter(([k]) => !['reasignacionPendiente', 'cambioTipoPendiente', 'tecnicoId'].includes(k)).map(([k, v]) => <Dato key={k} label={k}>{String(v)}</Dato>)}
              {d.tecnico && <Dato label="Cuadrilla asignada">{d.tecnico.nombre} {d.tecnico.apellido}</Dato>}
            </dl>
            {t.descripcion && <div className="mt-4 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{t.descripcion}</div>}
            {t.urgencia && <div className="mt-3"><Aviso tono="error" titulo="Justificación de la urgencia">{t.urgenciaJustificacion}</Aviso></div>}
          </Card>
          <div className="space-y-5">
            {d.hermanas.length > 1 && (
              <Card titulo={`Tarea múltiple (${t.modoSubtarea === 'secuencial' ? 'secuencial' : 'simultánea'})`}>
                <ul className="space-y-2 text-sm">
                  {d.hermanas.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-2">
                      <Link className={h.id === t.id ? 'font-semibold' : 'text-marca-700 hover:underline'} href={`/${portal}/tareas/${h.id}`}>{h.orden}. {h.numero}</Link>
                      <span className="text-xs text-slate-500">{h.contratista}</span>
                      <EstadoBadge flujoId={t.flujoId} estado={h.estado} />
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {interno && (t.solicitanteId === u.id || u.supervisados.includes(t.solicitanteId) || u.roles.includes('administracion')) && m && !['CERTIFICADA', 'DESESTIMADA', 'CANCELADA'].includes(t.estado) && (
              <Card titulo="Cambiar imputación">
                <Formulario accion={accionCambiarImputacion} className="space-y-2">
                  <input type="hidden" name="tareaId" value={t.id} />
                  <Select name="imputacionId" defaultValue={t.imputacionId ?? ''}>
                    {m.imputaciones.map((i) => <option key={i.id} value={i.id}>{TIPOS_IMPUTACION[i.tipo]} {i.numero} — {i.descripcion}</option>)}
                  </Select>
                  <Input name="motivo" placeholder="Motivo del cambio" required />
                  <BotonEnviar chico estilo="secundario">Guardar</BotonEnviar>
                </Formulario>
              </Card>
            )}
            {interno && (t.solicitanteId === u.id || u.supervisados.includes(t.solicitanteId)) && !cambioTipo && !['CERTIFICADA', 'DESESTIMADA', 'CANCELADA'].includes(t.estado) && (
              <Card titulo="Cambiar tipo de trabajo">
                <Formulario accion={accionCambiarTipo} className="space-y-2">
                  <input type="hidden" name="tareaId" value={t.id} />
                  <Select name="tipoTrabajo" defaultValue={t.tipoTrabajo}>{Object.entries(TIPOS_TRABAJO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
                  <Input name="motivo" placeholder="Motivo" required />
                  <p className="text-xs text-slate-500">Si ya hay certificados, el contratista debe dar conformidad (cambia la lista de precios).</p>
                  <BotonEnviar chico estilo="secundario">Cambiar</BotonEnviar>
                </Formulario>
              </Card>
            )}
            {!interno && u.roles.includes('contratista_responsable') && tecnicos.length > 0 && !['CERTIFICADA', 'DESESTIMADA', 'CANCELADA', 'ASIGNADA'].includes(t.estado) && (
              <Card titulo="Asignar a una cuadrilla">
                <Formulario accion={accionSubasignar} className="flex gap-2">
                  <input type="hidden" name="tareaId" value={t.id} />
                  <Select name="tecnicoId" defaultValue={(extra.tecnicoId as string) ?? ''}>
                    <option value="">Sin asignar</option>
                    {tecnicos.map((x) => <option key={x.usuarios.id} value={x.usuarios.id}>{x.usuarios.nombre} {x.usuarios.apellido}</option>)}
                  </Select>
                  <BotonEnviar chico estilo="secundario">Asignar</BotonEnviar>
                </Formulario>
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === 'certificados' && (
        <Card sinPadding>
          <TablaCertificados filas={interno ? certs.filter((c) => !(c.estado === 'BORRADOR' && c.versionActual === 1)) : certs} portal={portal} vacio="Todavía no hay certificados" />
        </Card>
      )}

      {tab === 'bitacora' && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card titulo="Bitácora de campo" className="lg:col-span-2">
            {d.bitacora.length ? (
              <ul className="space-y-4">
                {d.bitacora.map((b) => (
                  <li key={b.b.id} className="flex gap-3">
                    {b.doc?.mime?.startsWith('image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <a href={`/api/archivos/${b.doc.id}`} target="_blank" rel="noreferrer"><img src={`/api/archivos/${b.doc.id}`} alt="" className="h-16 w-16 rounded-lg bg-slate-100 object-cover" /></a>
                    ) : b.doc ? <a href={`/api/archivos/${b.doc.id}`} className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-100 text-xs">{b.doc.nombre.slice(0, 10)}</a> : null}
                    <div>
                      <div className="text-sm"><b className="font-medium">{b.nombre} {b.apellido}</b> <span className="text-xs text-slate-400">{formatoFechaHora(b.b.createdAt)}</span></div>
                      {b.b.texto && <div className="text-sm text-slate-700">{b.b.texto}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : <Vacio>La cuadrilla todavía no cargó nada</Vacio>}
          </Card>
          {!interno && (
            <Card titulo="Cargar en la bitácora">
              <Formulario accion={accionBitacora} className="space-y-3" reiniciar>
                <input type="hidden" name="tareaId" value={t.id} />
                <Textarea name="texto" placeholder="Qué se hizo, qué se encontró…" />
                <Input type="file" name="archivos" multiple accept="image/*,application/pdf" />
                <BotonEnviar>Cargar</BotonEnviar>
              </Formulario>
              {fotosSinUsar.length > 0 && <p className="mt-3 text-xs text-slate-500">Las fotos de la bitácora se pueden agregar al certificado desde el editor.</p>}
            </Card>
          )}
        </div>
      )}

      {tab === 'mensajes' && (
        <Card titulo="Mensajes entre el solicitante y el contratista">
          <ul className="mb-4 space-y-3">
            {d.mensajes.map((x) => (
              <li key={x.m.id} className={x.tipo === 'contratista' ? 'mr-12' : 'ml-12'}>
                <div className={`rounded-xl px-3 py-2 text-sm ${x.tipo === 'contratista' ? 'bg-slate-100' : 'bg-marca-50'}`}>{x.m.texto}</div>
                <div className="mt-0.5 text-[11px] text-slate-400">{x.nombre} {x.apellido} · {formatoFechaHora(x.m.createdAt)}</div>
              </li>
            ))}
            {!d.mensajes.length && <Vacio>Sin mensajes. Usá este canal en lugar del mail: queda registrado.</Vacio>}
          </ul>
          <Formulario accion={accionMensaje} className="flex gap-2" reiniciar>
            <input type="hidden" name="tareaId" value={t.id} />
            <Input name="texto" placeholder="Escribí un mensaje…" required />
            <BotonEnviar>Enviar</BotonEnviar>
          </Formulario>
        </Card>
      )}

      {tab === 'documentos' && (
        <Card titulo="Documentación de la tarea"><GaleriaDocumentos docs={d.documentos} /></Card>
      )}

      {tab === 'historial' && (
        <Card titulo="Historial (auditoría)"><LineaTiempo entidad="tarea" id={t.id} flujoId={t.flujoId} ocultarInternos={!interno} /></Card>
      )}
    </>
  )
}

export async function nombresUsuarios(ids: string[]) {
  if (!ids.length) return {}
  const f = await getDb().select().from(s.usuarios).where(inArray(s.usuarios.id, ids))
  return Object.fromEntries(f.map((x) => [x.id, `${x.nombre} ${x.apellido}`]))
}

