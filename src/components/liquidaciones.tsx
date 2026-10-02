import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Usuario } from '@/server/usuarios'
import { ajustesPendientes, liquidacionesDe, maestros } from '@/server/consultas'
import { liquidacionCompleta, listarPeriodos } from '@/server/servicios/liquidaciones'
import { accionAjuste, accionFacturaLiquidacion, accionPeriodo } from '@/app/acciones/gestion'
import { BotonEnviar, Formulario } from './formulario'
import { Icono } from './iconos'
import { AyudaContextual, Aviso, Badge, Desplegable, Campo, Card, Encabezado, Input, Pesos, Select, Tabla, Td, Th, Vacio } from './ui'
import { formatoFecha, formatoFechaHora, nombrePeriodo, periodoActual } from '@/lib/fechas'
import { formatoPesos } from '@/domain/dinero'

const ESTADO_LIQ: Record<string, [string, string]> = { pendiente_factura: ['Pendiente de factura', 'amber'], cerrada: ['Cerrada', 'green'] }

export async function ListaLiquidaciones({ u, cerrado }: { u: Usuario; cerrado?: string }) {
  const interno = u.tipo === 'interno'
  const [liqs, periodos, ajustes, m] = await Promise.all([
    liquidacionesDe(u), interno ? listarPeriodos() : Promise.resolve([]), ajustesPendientes(interno ? undefined : u.contratistaId ?? -1), interno ? maestros(u) : Promise.resolve(null),
  ])
  const gestiona = interno && u.roles.some((r) => ['administracion', 'cerco', 'adm_obra'].includes(r))
  const portal = interno ? 'i' : 'c'
  return (
    <>
      <Encabezado titulo="Liquidaciones" subtitulo={interno ? 'Cierre de períodos, congelamiento de precios y facturas' : 'Lo que se liquidó a tu empresa y las facturas pendientes'} />
      <AyudaContextual titulo={interno ? '¿Cómo funciona el cierre?' : '¿Cómo cobro?'} href={interno ? '/i/ayuda#guia-liquidar' : '/c/ayuda#guia-facturar'}>
        {interno
          ? <p>Al <b>cerrar un período</b> se genera una liquidación por contratista con sus certificados <b>aprobados para pago</b> y los <b>ajustes</b> pendientes. El precio se congela según la política vigente (al emitir o a la fecha de corte). Después, cada contratista sube su factura.</p>
          : <p>Cuando Personal cierra el período, tus certificados aprobados se agrupan en una <b>liquidación</b>. Abrila, revisá el detalle y <b>subí la factura</b> por el total. Si el importe no coincide, se genera un aviso para Administración.</p>}
      </AyudaContextual>
      {cerrado != null && <div className="mb-4"><Aviso tono="ok">Período cerrado: se generaron {cerrado} liquidación(es) con los precios congelados. Los contratistas fueron notificados para facturar.</Aviso></div>}
      {interno && (
        <div className="mb-5">
          <Card titulo="Períodos de pago" sinPadding acciones={gestiona && (
            <Desplegable texto={<><Icono nombre="mas" className="h-3.5 w-3.5" /> Nuevo período</>}>
              <Formulario accion={accionPeriodo} className="space-y-3" reiniciar>
                <Campo label="Período"><Input type="month" name="nombre" defaultValue={periodoActual()} required /></Campo>
                <Campo label="Fecha de corte" ayuda="Define el precio si la política es “al cierre”"><Input type="date" name="fechaCorte" required /></Campo>
                <BotonEnviar chico>Crear período</BotonEnviar>
              </Formulario>
            </Desplegable>
          )}>
            {periodos.length ? (
              <Tabla>
                <thead><tr><Th>Período</Th><Th>Fecha de corte</Th><Th>Estado</Th><Th /></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {periodos.map((p) => (
                    <tr key={p.id}>
                      <Td className="font-medium">{nombrePeriodo(p.nombre)}</Td>
                      <Td>{formatoFecha(p.fechaCorte)}</Td>
                      <Td>{p.estado === 'abierto' ? <Badge color="blue">Abierto</Badge> : <Badge color="green">Cerrado {formatoFechaHora(p.cerradoAt)}</Badge>}</Td>
                      <Td className="text-right">
                        {p.estado === 'abierto' && gestiona && (
                          <Formulario accion={accionPeriodo}>
                            <input type="hidden" name="op" value="cerrar" />
                            <input type="hidden" name="periodoId" value={p.id} />
                            <BotonEnviar chico estilo="secundario" confirmar={`Se congelan los precios de todos los certificados aprobados con la LPU vigente al ${formatoFecha(p.fechaCorte)} y se generan las liquidaciones. ¿Continuar?`}>Cerrar período</BotonEnviar>
                          </Formulario>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Tabla>
            ) : <Vacio>Sin períodos</Vacio>}
          </Card>
        </div>
      )}
      <Card titulo="Liquidaciones" sinPadding className="mb-5">
        {liqs.length ? (
          <Tabla>
            <thead><tr><Th>Liquidación</Th><Th>Período</Th>{interno && <Th>Contratista</Th>}<Th className="text-right">Subtotal</Th><Th className="text-right">Ajustes</Th><Th className="text-right">Total c/IVA</Th><Th>Estado</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {liqs.map((l) => (
                <tr key={l.l.id}>
                  <Td><Link className="font-medium text-marca-700 hover:underline" href={`/${portal}/liquidaciones/${l.l.id}`}>{l.l.numero}</Link></Td>
                  <Td>{nombrePeriodo(l.p.nombre)}</Td>
                  {interno && <Td>{l.c.razonSocial}</Td>}
                  <Td className="num"><Pesos v={l.l.subtotal} /></Td>
                  <Td className="num"><Pesos v={l.l.ajustes} /></Td>
                  <Td className="num font-medium"><Pesos v={l.l.total} /></Td>
                  <Td><Badge color={ESTADO_LIQ[l.l.estado]?.[1]}>{ESTADO_LIQ[l.l.estado]?.[0] ?? l.l.estado}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        ) : <Vacio>Todavía no hay liquidaciones</Vacio>}
      </Card>
      <div>
        <Card titulo="Ajustes pendientes" sinPadding acciones={gestiona && m && (
          <Desplegable texto={<><Icono nombre="mas" className="h-3.5 w-3.5" /> Registrar ajuste</>} ancho="w-96">
            <Formulario accion={accionAjuste} className="space-y-3" reiniciar>
              <Campo label="Contratista"><Select name="contratistaId" required>{m.contratistas.map((c) => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}</Select></Campo>
              <div className="grid grid-cols-2 gap-2">
                <Campo label="Tipo"><Select name="tipo"><option value="debito">Débito (descuento)</option><option value="credito">Crédito</option></Select></Campo>
                <Campo label="Importe neto"><Input name="importe" inputMode="decimal" required /></Campo>
              </div>
              <Campo label="Motivo"><Input name="motivo" required placeholder="Ej.: trabajo mal ejecutado verificado después del pago" /></Campo>
              <Campo label="Respaldo (opcional)"><Input type="file" name="archivo" /></Campo>
              <BotonEnviar chico>Registrar</BotonEnviar>
            </Formulario>
          </Desplegable>
        )}>
          <p className="border-b border-slate-100 px-5 py-2 text-xs text-slate-500">Se aplican automáticamente en la próxima liquidación de cada empresa.</p>
          {ajustes.length ? (
            <Tabla>
              <thead><tr><Th>Fecha</Th>{interno && <Th>Contratista</Th>}<Th>Tipo</Th><Th>Motivo</Th><Th className="text-right">Importe</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {ajustes.map((a) => (
                  <tr key={a.a.id}>
                    <Td>{formatoFecha(a.a.createdAt)}</Td>{interno && <Td>{a.c.razonSocial}</Td>}
                    <Td><Badge color={a.a.tipo === 'debito' ? 'red' : 'green'}>{a.a.tipo === 'debito' ? 'Débito' : 'Crédito'}</Badge></Td>
                    <Td className="text-slate-700">{a.a.motivo}</Td>
                    <Td className="num">{a.a.tipo === 'debito' ? '−' : ''}<Pesos v={a.a.importe} /></Td>
                  </tr>
                ))}
              </tbody>
            </Tabla>
          ) : <Vacio>Sin ajustes pendientes</Vacio>}
        </Card>
      </div>
    </>
  )
}

export async function DetalleLiquidacion({ id, u }: { id: number; u: Usuario }) {
  const d = await liquidacionCompleta(id).catch(() => null)
  if (!d || (u.tipo === 'contratista' && d.l.contratistaId !== u.contratistaId)) notFound()
  const portal = u.tipo === 'interno' ? 'i' : 'c'
  const dif = d.certs.reduce((a, x) => a + Number(x.c.subtotalFinal ?? 0) - Number(x.c.subtotalEmision ?? 0), 0)
  return (
    <>
      <Encabezado volver={{ href: `/${portal}/liquidaciones`, texto: 'Liquidaciones' }} titulo={`${d.l.numero} · ${d.c.razonSocial}`}
        subtitulo={<span className="flex items-center gap-2">Período {nombrePeriodo(d.p.nombre)} · corte {formatoFecha(d.p.fechaCorte)} <Badge color={ESTADO_LIQ[d.l.estado]?.[1]}>{ESTADO_LIQ[d.l.estado]?.[0]}</Badge></span>} />
      {d.alertas.map((a) => <div key={a.id} className="mb-3"><Aviso tono="alerta">{a.mensaje}</Aviso></div>)}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card titulo={`Certificados incluidos (${d.certs.length})`} className="lg:col-span-2" sinPadding>
          <Tabla>
            <thead><tr><Th>Certificado</Th><Th>Tarea</Th><Th className="text-right">A la emisión</Th><Th className="text-right">Final (congelado)</Th><Th className="text-right">Diferencia</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {d.certs.map((x) => (
                <tr key={x.c.id}>
                  <Td><Link className="text-marca-700 hover:underline" href={`/${portal}/certificados/${x.c.id}`}>{x.c.numero}</Link></Td>
                  <Td><div>{x.numeroTarea}</div><div className="text-xs text-slate-500">{x.titulo}</div></Td>
                  <Td className="num"><Pesos v={x.c.subtotalEmision} /></Td>
                  <Td className="num font-medium"><Pesos v={x.c.subtotalFinal} /></Td>
                  <Td className="num text-marca-700"><Pesos v={Number(x.c.subtotalFinal ?? 0) - Number(x.c.subtotalEmision ?? 0)} /></Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
          {d.ajustes.length > 0 && (
            <div className="border-t border-slate-100 p-4">
              <div className="mb-2 text-xs font-semibold text-slate-500">Ajustes aplicados</div>
              <ul className="space-y-1 text-sm">{d.ajustes.map((a) => <li key={a.id} className="flex justify-between gap-2"><span>{a.tipo === 'debito' ? 'Débito' : 'Crédito'}: {a.motivo}</span><span className="num">{a.tipo === 'debito' ? '−' : ''}{formatoPesos(a.importe)}</span></li>)}</ul>
            </div>
          )}
        </Card>
        <div className="space-y-5">
          <Card titulo="Totales">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Certificados (neto)</dt><dd><Pesos v={d.l.subtotal} /></dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Ajustes</dt><dd><Pesos v={d.l.ajustes} /></dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">IVA</dt><dd><Pesos v={d.l.iva} /></dd></div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-semibold"><dt>Total a facturar</dt><dd><Pesos v={d.l.total} /></dd></div>
              <div className="flex justify-between text-xs text-marca-700"><dt>Diferencia por actualización de LPU</dt><dd><Pesos v={dif} /></dd></div>
            </dl>
          </Card>
          <Card titulo="Factura">
            {d.l.facturaDocumentoId ? (
              <div className="text-sm">
                <div>Factura <b>{d.l.facturaNumero}</b> por <Pesos v={d.l.facturaImporte} /></div>
                <a className="text-marca-700 underline" href={`/api/archivos/${d.l.facturaDocumentoId}`} target="_blank">Ver factura</a>
                <div className="mt-1 text-xs text-slate-500">Cerrada el {formatoFechaHora(d.l.cerradaAt)}</div>
              </div>
            ) : u.tipo === 'contratista' && u.roles.includes('contratista_responsable') ? (
              <Formulario accion={accionFacturaLiquidacion} className="space-y-3">
                <input type="hidden" name="liquidacionId" value={d.l.id} />
                <Campo label="N° de factura"><Input name="numero" required placeholder="A-0001-00001234" /></Campo>
                <Campo label="Importe total de la factura" ayuda="Si no coincide se registra una advertencia"><Input name="importe" inputMode="decimal" defaultValue={d.l.total} /></Campo>
                <Campo label="Archivo"><Input type="file" name="archivo" required accept="application/pdf,image/*" /></Campo>
                <BotonEnviar>Adjuntar factura y cerrar</BotonEnviar>
              </Formulario>
            ) : <p className="text-sm text-slate-500">Esperando la factura del contratista.</p>}
          </Card>
        </div>
      </div>
    </>
  )
}
