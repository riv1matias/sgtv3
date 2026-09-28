import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Usuario } from '@/server/usuarios'
import { accionesCertificado, certificadoCompleto, puedeVerCertificado } from '@/server/servicios/certificados'
import { accionDocumentoSap, accionResolverAlerta, accionTomar } from '@/app/acciones/certificados'
import { AccionesFlujo } from './acciones-flujo'
import { EtapasCertificado, SiguientePaso } from './progreso'
import { EstadoBadge } from './estado'
import { GaleriaDocumentos } from './documentos'
import { LineaTiempo } from './linea-tiempo'
import { nombresUsuarios } from './detalle-tarea'
import { BotonEnviar, Formulario } from './formulario'
import { Aviso, Badge, Card, Campo, Dato, Encabezado, Input, Pesos, Select, Tabla, Td, Th, clasesBoton } from './ui'
import { Icono } from './iconos'
import { conIva } from '@/domain/precios'
import { dec, formatoCantidad } from '@/domain/dinero'
import { formatoFecha, formatoFechaHora, hoy, nombrePeriodo } from '@/lib/fechas'
import { TIPOS_TRABAJO, nombreRol } from '@/lib/etiquetas'
import { parametros } from '@/server/comun'
import { getDb, schema as s } from '@/db'
import { eq } from 'drizzle-orm'

type Datos = Awaited<ReturnType<typeof certificadoCompleto>>
type Fila = Datos['items'][number]

const clave = (f: Fila) => `${f.item.tipo}:${f.item.codigoMoId ?? f.item.materialId}`

function diferencias(actual: Fila[], anterior: Fila[]) {
  const prev = new Map(anterior.map((f) => [clave(f), f]))
  const act = new Set(actual.map(clave))
  const cambio = new Map<number, 'nuevo' | 'modificado'>()
  for (const f of actual) {
    const p = prev.get(clave(f))
    if (!p) cambio.set(f.item.id, 'nuevo')
    else if (dec(p.item.cantidad) !== dec(f.item.cantidad) || dec(p.item.importe) !== dec(f.item.importe)) cambio.set(f.item.id, 'modificado')
  }
  const quitados = anterior.filter((f) => !act.has(clave(f)))
  return { cambio, prev, quitados }
}

export async function VistaCertificado({ id, u }: { id: string; u: Usuario }) {
  const d = await certificadoCompleto(id)
  if (!puedeVerCertificado(u, d.cert, d.tarea)) notFound()
  const interno = u.tipo === 'interno'
  const portal = interno ? 'i' : 'c'
  const { cert: c, tarea: t } = d
  const [{ def, acciones, puedeTomar, puedeSoltar }, par] = await Promise.all([accionesCertificado(c, t, u), parametros()])
  const nombres = await nombresUsuarios([t.solicitanteId, ...(c.tomadoPor ? [c.tomadoPor] : [])])
  const [imp] = t.imputacionId ? await getDb().select().from(s.imputaciones).where(eq(s.imputaciones.id, t.imputacionId)) : []
  const dif = diferencias(d.items, d.itemsAnterior)
  const mo = d.items.filter((f) => f.item.tipo === 'mo')
  const mats = d.items.filter((f) => f.item.tipo === 'material')
  const recs = d.items.filter((f) => f.item.tipo === 'recuperado')
  const subtotal = c.subtotalFinal ?? c.subtotalActual ?? '0'
  const tot = conIva(subtotal, par.iva_alicuota)
  const obsPorItem = new Map<number, Array<{ comentario: string; paso: string }>>()
  for (const o of d.observaciones) if (o.aprob.version === d.versionVista || !interno) {
    obsPorItem.set(o.o.itemId, [...(obsPorItem.get(o.o.itemId) ?? []), { comentario: o.o.comentario, paso: o.aprob.paso }])
  }
  const alertasAbiertas = d.alertas.filter((a) => a.estado === 'abierta')
  const etiquetaPaso = (p: string) => def.estados.find((e) => e.clave === p)?.etiqueta ?? p
  const itemsObservables = d.items.map((f) => ({ id: f.item.id, etiqueta: `${f.item.tipo === 'mo' ? f.codigo?.codigoS4 + ' ' + f.codigo?.descripcion : f.material?.codigoSap + ' ' + f.material?.descripcion}` }))
  const esAdminMateriales = interno && c.estado === 'VAL_MATERIALES' && u.roles.includes('administracion') && u.subregionIds.includes(t.subregionId)
  const marca = (f: Fila) => {
    const x = dif.cambio.get(f.item.id)
    if (!d.versionAnterior || !x) return null
    const p = dif.prev.get(clave(f))
    return x === 'nuevo' ? <Badge color="green">Nuevo</Badge> : <Badge color="amber">Antes: {p?.item.importe ? `$ ${p.item.importe}` : formatoCantidad(p?.item.cantidad)}</Badge>
  }
  const observ = (f: Fila) => (obsPorItem.get(f.item.id) ?? []).map((o, i) => <div key={i} className="mt-1 rounded bg-red-50 px-2 py-1 text-xs text-red-800">Observado en {etiquetaPaso(o.paso)}: {o.comentario}</div>)

  return (
    <>
      <Encabezado
        volver={{ href: `/${portal}/certificados`, texto: 'Certificados' }}
        titulo={<span className="flex flex-wrap items-center gap-2">{c.numero} <EstadoBadge flujoId={c.flujoId} estado={c.estado} /></span>}
        subtitulo={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link href={`/${portal}/tareas/${t.id}`} className="text-marca-700 hover:underline">{t.numero} · {t.titulo}</Link>
            <span>{d.contratista.razonSocial}</span>
            <span>Certificado {c.orden} de {t.certificadosPrevistos}{c.esFinal ? ' (final)' : ''}</span>
            <span>Versión {d.versionVista}{d.versiones.length > 1 ? ` de ${d.versiones.length}` : ''}</span>
            {t.urgencia && <Badge color="red">Urgencia</Badge>}
            {c.requiereSegundaAprobacion && <Badge color="indigo">Requiere 2da aprobación</Badge>}
          </span>
        }
        acciones={
          <>
            <a href={`/imprimir/certificado/${c.id}`} target="_blank" className={clasesBoton()}><Icono nombre="imprimir" /> Imprimir / PDF</a>
            {interno && mats.length + recs.length > 0 && <a href={`/api/exportar/materiales/${c.id}`} className={clasesBoton()}><Icono nombre="descargar" /> Reporte de materiales (SAP)</a>}
          </>
        }
      />

      <EtapasCertificado estado={c.estado} />
      <SiguientePaso estado={c.estado} portal={portal} />
      {(acciones.length > 0 || puedeTomar || puedeSoltar || c.tomadoPor) && (
        <div className="no-print mb-5 space-y-3 rounded-2xl border border-marca-200 bg-marca-50/60 p-4">
          {c.tomadoPor && <div className="text-sm text-slate-600">Lo está trabajando <b>{nombres[c.tomadoPor]}</b>.</div>}
          <div className="flex flex-wrap items-start gap-2">
            {puedeTomar && (
              <Formulario accion={accionTomar}><input type="hidden" name="certificadoId" value={c.id} /><BotonEnviar estilo="secundario">Tomar para trabajarlo</BotonEnviar></Formulario>
            )}
            {puedeSoltar && (
              <Formulario accion={accionTomar}><input type="hidden" name="certificadoId" value={c.id} /><input type="hidden" name="op" value="soltar" /><BotonEnviar estilo="fantasma">Liberar</BotonEnviar></Formulario>
            )}
            <AccionesFlujo entidad="certificado" id={c.id} lockVersion={c.lockVersion} def={def} acciones={acciones} items={itemsObservables} nombres={nombres} />
          </div>
          {alertasAbiertas.length > 0 && acciones.some((a) => a.transicion.tipo === 'aprobacion') && <p className="text-xs text-amber-800">Para aprobar primero resolvé las alertas (dejá constancia de lo verificado).</p>}
        </div>
      )}

      {interno && d.alertas.length > 0 && (
        <Card titulo={`Alertas (${alertasAbiertas.length} abiertas)`} className="mb-5 border-amber-200">
          <ul className="divide-y divide-slate-100">
            {d.alertas.map((a) => (
              <li key={a.id} className="py-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge color={a.estado === 'abierta' ? 'amber' : 'green'}>{a.estado === 'abierta' ? '⚠ Abierta' : '✓ Resuelta'}</Badge>
                  <span>{a.mensaje}</span>
                  {a.version && a.version !== d.versionVista && <span className="text-xs text-slate-400">(versión {a.version})</span>}
                </div>
                {a.resolucion && <div className="mt-1 text-xs text-slate-500">Resolución: {a.resolucion} · {formatoFechaHora(a.resueltaAt)}</div>}
                {a.estado === 'abierta' && (
                  <Formulario accion={accionResolverAlerta} className="mt-2 flex gap-2">
                    <input type="hidden" name="alertaId" value={a.id} />
                    <Input name="resolucion" placeholder="Qué verificaste y cómo se resuelve" required className="py-1 text-xs" />
                    <BotonEnviar chico estilo="secundario">Resolver</BotonEnviar>
                  </Formulario>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!interno && ['OBSERVADO', 'REBOTE_MATERIALES'].includes(c.estado) && (
        <div className="mb-5"><Aviso tono="error" titulo={c.estado === 'OBSERVADO' ? 'El certificado fue observado' : 'Administración rebotó los materiales'}>
          Revisá las observaciones en el historial y en cada ítem, corregí y volvé a emitir. <Link className="font-medium underline" href={`/c/certificados/${c.id}/editar`}>Ir al editor →</Link>
        </Aviso></div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <Card titulo="Carátula">
            <dl className="grid gap-4 sm:grid-cols-3">
              <Dato label="Tipo de trabajo">{TIPOS_TRABAJO[t.tipoTrabajo]}{t.subtipo ? ` · ${t.subtipo}` : ''}</Dato>
              <Dato label="Imputación">{imp ? `${imp.numero}` : '—'}</Dato>
              <Dato label="Período">{nombrePeriodo(c.periodo)}</Dato>
              <Dato label="Ejecución">{formatoFecha(c.fechaEjecDesde)} al {formatoFecha(c.fechaEjecHasta)}</Dato>
              <Dato label="Centro / almacén">{c.centro ?? '—'} / {c.almacen ?? '—'}</Dato>
              <Dato label="Solicitante">{nombres[t.solicitanteId]}</Dato>
              <Dato label="Dirección" className="sm:col-span-2">{t.direccion}</Dato>
              <Dato label="Emitido">{formatoFechaHora(c.emitidoAt)}</Dato>
            </dl>
            {c.comentario && <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">{c.comentario}</div>}
          </Card>

          <Card titulo={`Mano de obra (${mo.length})`} sinPadding>
            <Tabla>
              <thead><tr><Th>Código</Th><Th>Descripción</Th><Th>UM</Th><Th className="text-right">Cantidad</Th><Th className="text-right">Precio unit.</Th><Th className="text-right">Subtotal</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {mo.map((f) => (
                  <tr key={f.item.id} className={dif.cambio.has(f.item.id) && d.versionAnterior ? 'bg-amber-50/40' : ''}>
                    <Td className="whitespace-nowrap font-mono text-xs">{f.codigo?.codigoS4}</Td>
                    <Td>
                      <div>{f.codigo?.descripcion} {f.codigo?.requiereSegundaAprobacion && interno && <Badge color="indigo">2da</Badge>} {marca(f)}</div>
                      {f.item.justificacion && <div className="text-xs text-slate-500">Justificación: {f.item.justificacion}</div>}
                      {f.item.facturaNumero && <div className="text-xs text-slate-500">Factura {f.item.facturaNumero} · CUIT {f.item.facturaCuit} · {formatoFecha(f.item.facturaFecha)} · <Pesos v={f.item.facturaImporte} chico /> {f.item.facturaDocumentoId && <a className="text-marca-700 underline" href={`/api/archivos/${f.item.facturaDocumentoId}`} target="_blank">ver</a>}</div>}
                      {observ(f)}
                    </Td>
                    <Td>{f.codigo?.unidad}</Td>
                    <Td className="num">{f.codigo?.montoAbierto ? '—' : formatoCantidad(f.item.cantidad)}</Td>
                    <Td className="num">{f.codigo?.montoAbierto ? 'Monto abierto' : <Pesos v={f.item.precioUnitario} />}</Td>
                    <Td className="num font-medium"><Pesos v={f.item.subtotal} /></Td>
                  </tr>
                ))}
                {dif.quitados.filter((f) => f.item.tipo === 'mo').map((f) => (
                  <tr key={'q' + f.item.id} className="bg-red-50/50 text-slate-400 line-through"><Td>{f.codigo?.codigoS4}</Td><Td colSpan={5}>{f.codigo?.descripcion} (quitado respecto de la versión anterior)</Td></tr>
                ))}
              </tbody>
            </Tabla>
          </Card>

          {(mats.length > 0 || recs.length > 0) && (
            <div className="grid gap-5 lg:grid-cols-2">
              {([['Materiales utilizados', mats], ['Materiales recuperados', recs]] as Array<[string, Fila[]]>).filter(([, f]) => f.length > 0).map(([titulo, filas]) => (
                <Card key={titulo as string} titulo={`${titulo} (${(filas as Fila[]).length})`} sinPadding>
                  <Tabla>
                    <thead><tr><Th>Código SAP</Th><Th>Descripción</Th><Th className="text-right">Cant.</Th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {(filas as Fila[]).map((f) => (
                        <tr key={f.item.id}>
                          <Td className="font-mono text-xs">{f.material?.codigoSap}</Td>
                          <Td><div>{f.material?.descripcion} {marca(f)}</div>{f.item.estadoRecuperado && <div className="text-xs text-slate-500">Estado: {f.item.estadoRecuperado}</div>}{observ(f)}</Td>
                          <Td className="num">{formatoCantidad(f.item.cantidad)} {f.material?.unidad}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Tabla>
                </Card>
              ))}
            </div>
          )}

          <Card titulo={`Documentación (${d.documentos.length})`}>
            <GaleriaDocumentos docs={d.documentos} nuevos={d.documentosNuevos} />
          </Card>

          {(esAdminMateriales || d.consumos.length > 0) && interno && (
            <Card titulo="Documentos SAP (consumo e ingreso de recuperados)">
              {d.consumos.length > 0 && (
                <ul className="mb-4 space-y-1 text-sm">
                  {d.consumos.map((x) => (
                    <li key={x.id} className="flex flex-wrap items-center gap-2">
                      <Badge color={x.tipo === 'reversa' ? 'red' : 'violet'}>{x.tipo.replaceAll('_', ' ')}</Badge>
                      <span className="font-mono">{x.numeroDocumento}</span> · {formatoFecha(x.fecha)} · versión {x.version}
                      {x.documentoId && <a className="text-marca-700 underline" href={`/api/archivos/${x.documentoId}`}>archivo</a>}
                      {!x.detalle && <span className="text-xs text-slate-400">(sin detalle comparable)</span>}
                    </li>
                  ))}
                </ul>
              )}
              {esAdminMateriales && (
                <Formulario accion={accionDocumentoSap} className="grid gap-3 sm:grid-cols-4" reiniciar>
                  <input type="hidden" name="certificadoId" value={c.id} />
                  <Campo label="Tipo">
                    <Select name="tipo">
                      {mats.length > 0 && <option value="consumo">Consumo de materiales</option>}
                      {recs.length > 0 && <option value="ingreso_recuperados">Ingreso de recuperados</option>}
                      <option value="correccion">Corrección</option>
                    </Select>
                  </Campo>
                  <Campo label="N° documento SAP"><Input name="numeroDocumento" required /></Campo>
                  <Campo label="Fecha"><Input type="date" name="fecha" defaultValue={hoy()} required /></Campo>
                  <Campo label="Archivo (Excel/CSV con código y cantidad)"><Input type="file" name="archivo" accept=".xlsx,.csv,.pdf" /></Campo>
                  <div className="sm:col-span-4"><BotonEnviar estilo="secundario">Registrar y comparar</BotonEnviar></div>
                </Formulario>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card titulo="Importes">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal neto</dt><dd><Pesos v={tot.subtotal} /></dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">IVA {par.iva_alicuota}%</dt><dd><Pesos v={tot.iva} /></dd></div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-semibold"><dt>Total</dt><dd><Pesos v={tot.total} /></dd></div>
            </dl>
            <dl className="mt-4 space-y-1 border-t border-slate-100 pt-3 text-xs">
              <div className="flex justify-between"><dt className="text-slate-500">A la primera emisión</dt><dd><Pesos v={c.subtotalEmision} /></dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Actual</dt><dd><Pesos v={c.subtotalActual} /></dd></div>
              {c.subtotalFinal && <div className="flex justify-between font-medium"><dt>Final pagado (congelado)</dt><dd><Pesos v={c.subtotalFinal} /></dd></div>}
              {c.subtotalEmision && (c.subtotalFinal ?? c.subtotalActual) !== c.subtotalEmision && (
                <div className="flex justify-between text-marca-700"><dt>Diferencia por actualización de LPU</dt><dd><Pesos v={String(Number(c.subtotalFinal ?? c.subtotalActual) - Number(c.subtotalEmision))} /></dd></div>
              )}
            </dl>
            {d.revalorizaciones.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-500">
                {d.revalorizaciones.map((r) => <li key={r.id}>{formatoFecha(r.createdAt)}: <Pesos v={r.subtotalAnterior} chico /> → <Pesos v={r.subtotalNuevo} chico /> · {r.motivo}</li>)}
              </ul>
            )}
          </Card>

          <Card titulo="Aprobaciones">
            {d.aprobaciones.length ? (
              <ul className="space-y-3 text-sm">
                {d.aprobaciones.map((a) => (
                  <li key={a.a.id} className={a.a.vigente ? '' : 'opacity-60'}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge color={a.a.accion === 'aprobar' ? 'green' : 'red'}>{def.transiciones.find((x) => x.accion === a.a.accion)?.etiqueta ?? a.a.accion}</Badge>
                      <span className="text-xs text-slate-500">{etiquetaPaso(a.a.paso)} · v{a.a.version}</span>
                      {!a.a.vigente && a.a.accion === 'aprobar' && <span className="text-[11px] text-slate-400">(invalidada)</span>}
                    </div>
                    <div className="mt-0.5">{a.nombre} {a.apellido} <span className="text-xs text-slate-500">({nombreRol(a.a.rol)}{a.a.enNombreDe ? ', en nombre de otra persona' : ''})</span></div>
                    <div className="text-xs text-slate-400">{formatoFechaHora(a.a.createdAt)}</div>
                    {a.a.motivo && <div className="text-xs text-slate-600">Motivo: {a.a.motivo}</div>}
                    {a.a.comentario && <div className="mt-1 rounded bg-slate-50 px-2 py-1 text-xs text-slate-700">{a.a.comentario}</div>}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-500">Todavía no hay aprobaciones.</p>}
          </Card>

          <Card titulo="Historial">
            <LineaTiempo entidad="certificado" id={c.id} flujoId={c.flujoId} ocultarInternos={!interno} />
          </Card>
        </div>
      </div>
    </>
  )
}

