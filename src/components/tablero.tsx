import Link from 'next/link'
import type { Usuario } from '@/server/usuarios'
import { indicadores, type FiltrosInd } from '@/server/indicadores'
import { maestros } from '@/server/consultas'
import { flujoVigente } from '@/server/flujos'
import { Boton, Card, Encabezado, Input, Kpi, LinkBoton, Pesos, Pestanas, Select, Tabla, Td, Th, Vacio, clasesBoton } from './ui'
import { Icono } from './iconos'
import { formatoPesos } from '@/domain/dinero'
import { nombrePeriodo } from '@/lib/fechas'
import { TIPOS_TRABAJO } from '@/lib/etiquetas'

const PASOS_APROBACION = ['VAL_TECNICA', 'PEDIDO_RETIRO', 'APROB_GERENTE', 'VAL_MATERIALES', 'APROB_FINAL', 'REVISION_RECHAZO', 'REBOTE_MATERIALES', 'OBSERVADO']

/** Barra horizontal simple (sin librerías): valor relativo al máximo */
function Barra({ valor, max, color = 'bg-marca-500' }: { valor: number; max: number; color?: string }) {
  return <div className="h-2 w-full rounded-full bg-slate-100"><div className={`h-2 rounded-full ${color}`} style={{ width: `${max > 0 ? Math.max(2, (valor / max) * 100) : 0}%` }} /></div>
}

export async function Tablero({ u, f: fUrl, embebido }: { u: Usuario; f: FiltrosInd & { vista?: string }; embebido?: boolean }) {
  const { vista: vistaUrl, ...f } = fUrl
  const interno = u.tipo === 'interno'
  const [d, flujoC, flujoT, m] = await Promise.all([indicadores(u, f), flujoVigente('certificado'), flujoVigente('tarea'), interno ? maestros(u) : Promise.resolve(null)])
  const etC = (e: string) => flujoC.def.estados.find((x) => x.clave === e)?.etiqueta ?? e
  const etT = (e: string) => flujoT.def.estados.find((x) => x.clave === e)?.etiqueta ?? e
  const suma = (estados: string[]) => d.porEstado.filter((x) => estados.includes(x.estado)).reduce((a, x) => a + Number(x.monto), 0)
  const enAprob = suma(PASOS_APROBACION)
  const aprobado = suma(['APROBADO'])
  const liquidado = suma(['EN_LIQUIDACION', 'CERRADO'])
  const pctPrimera = d.calidad?.aprobados ? Math.round((d.calidad.primera_vez / d.calidad.aprobados) * 100) : null
  const pasos = d.porEstado.filter((x) => PASOS_APROBACION.includes(x.estado))
  const maxPaso = Math.max(...pasos.map((x) => Number(x.monto)), 0)
  const maxMes = Math.max(...d.porMes.map((x) => Math.max(Number(x.emitido), Number(x.final))), 0)
  const maxHoras = Math.max(...d.tiempos.map((x) => x.horas), 0)
  const tiempos = [...d.tiempos].sort((a, b) => flujoC.def.estados.findIndex((e) => e.clave === a.estado) - flujoC.def.estados.findIndex((e) => e.clave === b.estado))
  const ladoContratista = ['BORRADOR', 'OBSERVADO', 'REBOTE_MATERIALES', 'EN_LIQUIDACION']
  const vistas = [
    { clave: 'resumen', texto: 'Resumen' },
    { clave: 'tiempos', texto: 'Tiempos y calidad' },
    ...(interno && d.ranking.length ? [{ clave: 'contratistas', texto: 'Comparar contratistas' }] : []),
    ...(interno && d.peps.length ? [{ clave: 'presupuesto', texto: 'Presupuesto PEP' }] : []),
  ]
  const vista = embebido ? 'resumen' : vistas.some((v) => v.clave === vistaUrl) ? vistaUrl! : 'resumen'
  const filtrosActivos = Object.entries(f).filter(([, v]) => v).length
  const conVista = (v: string) => `?${new URLSearchParams({ ...(Object.fromEntries(Object.entries(f).filter(([, x]) => x)) as Record<string, string>), vista: v })}`

  return (
    <>
      {!embebido && (
        <Encabezado titulo={interno ? 'Indicadores' : 'Mis indicadores'} subtitulo={interno ? 'Montos, tiempos y calidad en tu alcance' : 'Lo que certificaste, dónde está y cuánto tarda cada paso'}
          acciones={<a href={`/api/exportar/certificados?${new URLSearchParams(f as Record<string, string>).toString()}`} className={clasesBoton()}><Icono nombre="descargar" /> Exportar detalle</a>} />
      )}
      {!embebido && (
        <details open={filtrosActivos > 0} className="no-print group mb-4 rounded-2xl border border-slate-200/80 bg-white">
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600">
            <Icono nombre="ajustes" className="text-slate-400" /> Filtrar período, tipo{m ? ', contratista o imputación' : ''}
            {filtrosActivos > 0 && <span className="rounded-full bg-marca-100 px-2 text-xs text-marca-800">{filtrosActivos} activo{filtrosActivos > 1 ? 's' : ''}</span>}
            <Icono nombre="chevron" className="ml-auto text-slate-400 transition-transform group-open:rotate-180" />
          </summary>
          <form className="grid gap-2 border-t border-slate-100 p-3 sm:grid-cols-3 lg:grid-cols-7">
            <input type="hidden" name="vista" value={vista} />
            <label className="text-xs text-slate-500">Desde<Input type="date" name="desde" defaultValue={f.desde} className="mt-0.5" /></label>
            <label className="text-xs text-slate-500">Hasta<Input type="date" name="hasta" defaultValue={f.hasta} className="mt-0.5" /></label>
            <label className="text-xs text-slate-500">Tipo<Select name="tipo" defaultValue={f.tipo ?? ''} className="mt-0.5"><option value="">Todos</option>{Object.entries(TIPOS_TRABAJO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></label>
            {m && <label className="text-xs text-slate-500">Contratista<Select name="contratista" defaultValue={f.contratista ?? ''} className="mt-0.5"><option value="">Todos</option>{m.contratistas.map((c) => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}</Select></label>}
            {m && <label className="text-xs text-slate-500">Subregión<Select name="subregion" defaultValue={f.subregion ?? ''} className="mt-0.5"><option value="">Todas</option>{m.misSubregiones.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}</Select></label>}
            {m && <label className="text-xs text-slate-500">Imputación<Select name="imputacion" defaultValue={f.imputacion ?? ''} className="mt-0.5"><option value="">Todas</option>{m.imputaciones.map((x) => <option key={x.id} value={x.id}>{x.numero}</option>)}</Select></label>}
            <div className="flex items-end gap-2"><Boton estilo="primario" className="w-full">Aplicar</Boton>{filtrosActivos > 0 && <LinkBoton href={`?vista=${vista}`} estilo="fantasma">Limpiar</LinkBoton>}</div>
          </form>
        </details>
      )}
      {!embebido && vistas.length > 1 && <Pestanas activa={vista} items={vistas.map((v) => ({ clave: v.clave, texto: v.texto, href: conVista(v.clave) }))} />}

      {vista === 'resumen' && (<>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="En aprobación" valor={<span className="text-xl">{formatoPesos(enAprob)}</span>} detalle={`${pasos.reduce((a, x) => a + x.n, 0)} certificados`} />
        <Kpi label="Aprobado, a liquidar" valor={<span className="text-xl">{formatoPesos(aprobado)}</span>} tono="ok" />
        <Kpi label="Liquidado / cerrado" valor={<span className="text-xl">{formatoPesos(liquidado)}</span>} />
        <Kpi label="Aprobados sin observaciones" valor={pctPrimera != null ? `${pctPrimera}%` : '—'} detalle={`${d.calidad?.primera_vez ?? 0} de ${d.calidad?.aprobados ?? 0}`} tono={pctPrimera != null && pctPrimera < 70 ? 'alerta' : 'neutro'} />
        <Kpi label="Diferencia por actualización LPU" valor={<span className="text-xl">{formatoPesos(d.calidad?.diferencia_lpu ?? 0)}</span>} detalle="Final vs. primera emisión" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card titulo="¿Dónde está el dinero en aprobación?">
          {pasos.length ? (
            <ul className="space-y-3">
              {pasos.sort((a, b) => Number(b.monto) - Number(a.monto)).map((x) => (
                <li key={x.estado}>
                  <div className="mb-1 flex justify-between text-sm"><span>{etC(x.estado)} <span className="text-xs text-slate-400">({x.n})</span>{ladoContratista.includes(x.estado) && <span className="ml-1 text-xs text-amber-700">· del lado del contratista</span>}</span><Pesos v={x.monto} /></div>
                  <Barra valor={Number(x.monto)} max={maxPaso} color={ladoContratista.includes(x.estado) ? 'bg-amber-400' : 'bg-marca-500'} />
                </li>
              ))}
            </ul>
          ) : <Vacio>No hay certificados en aprobación</Vacio>}
        </Card>

        <Card titulo="Certificado por mes (primera emisión)">
          {d.porMes.length ? (
            <ul className="space-y-3">
              {d.porMes.map((x) => (
                <li key={x.mes}>
                  <div className="mb-1 flex justify-between text-sm"><span>{nombrePeriodo(x.mes)} <span className="text-xs text-slate-400">({x.n})</span></span><span><Pesos v={x.emitido} />{Number(x.final) > 0 && <span className="ml-2 text-xs text-green-700">pagado <Pesos v={x.final} /></span>}</span></div>
                  <Barra valor={Number(x.emitido)} max={maxMes} />
                </li>
              ))}
            </ul>
          ) : <Vacio>Sin certificados en el período</Vacio>}
        </Card>

        <Card titulo="Antigüedad de lo pendiente">
          {d.abiertos.length ? (
            <Tabla><thead><tr><Th>Antigüedad</Th><Th className="text-right">Certificados</Th><Th className="text-right">Monto</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">{d.abiertos.map((x) => <tr key={x.rango}><Td>{x.rango}</Td><Td className="num">{x.n}</Td><Td className="num"><Pesos v={x.monto} /></Td></tr>)}</tbody></Tabla>
          ) : <Vacio>No hay pendientes</Vacio>}
        </Card>
      </div>
      {embebido && interno && <p className="mt-4 text-sm"><Link href={`/i/indicadores?contratista=${f.contratista}`} className="font-medium text-marca-700 hover:underline">Ver tiempos, calidad y más indicadores de este contratista →</Link></p>}
      </>)}

      {vista === 'tiempos' && (
      <div className="grid gap-5 xl:grid-cols-2">
        <Card titulo="Tiempo promedio en cada paso">
          {tiempos.length ? (
            <ul className="space-y-3">
              {tiempos.map((x) => (
                <li key={x.estado}>
                  <div className="mb-1 flex justify-between text-sm"><span>{etC(x.estado)}{ladoContratista.includes(x.estado) && <span className="ml-1 text-xs text-amber-700">· contratista</span>}</span><span className="num">{x.horas < 48 ? `${x.horas.toFixed(1)} h` : `${(x.horas / 24).toFixed(1)} días`}</span></div>
                  <Barra valor={x.horas} max={maxHoras} color={ladoContratista.includes(x.estado) ? 'bg-amber-400' : 'bg-cyan-500'} />
                </li>
              ))}
            </ul>
          ) : <Vacio>Sin datos de tiempos</Vacio>}
          <p className="mt-3 text-xs text-slate-500">Calculado desde la auditoría. Ámbar: tiempo del lado del contratista; el resto es tiempo de personal propio.</p>
        </Card>

        <Card titulo="Observaciones y rechazos por motivo">
          {d.motivos.length ? (
            <Tabla><thead><tr><Th>Motivo</Th><Th>Paso</Th><Th className="text-right">Cantidad</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">{d.motivos.map((x, i) => <tr key={i}><Td>{x.motivo}</Td><Td className="text-xs text-slate-500">{etC(x.paso)}</Td><Td className="num">{x.n}</Td></tr>)}</tbody></Tabla>
          ) : <Vacio>Sin observaciones en el período</Vacio>}
        </Card>

        <Card titulo="Tareas">
          <div className="grid gap-4 sm:grid-cols-2">
            <ul className="space-y-1 text-sm">{d.tareas.sort((a, b) => b.n - a.n).map((x) => <li key={x.estado} className="flex justify-between"><span>{etT(x.estado)}</span><span className="num">{x.n}{x.urgencias ? <span className="ml-1 text-xs text-red-600">({x.urgencias} urg.)</span> : null}</span></li>)}</ul>
            <div>
              <div className="mb-1 text-xs font-semibold text-slate-500">Esperas (tiempo muerto) y cierres sin certificar</div>
              <ul className="space-y-1 text-sm">{d.causales.map((x, i) => <li key={i} className="flex justify-between gap-2"><span>{x.tipo === 'espera' ? 'Espera' : 'Cierre'}: {x.causal}</span><span className="num">{x.n}{x.tipo === 'espera' ? ` · ${x.horas.toFixed(0)} h` : ''}</span></li>)}</ul>
              {!d.causales.length && <p className="text-sm text-slate-500">Sin esperas ni desestimaciones</p>}
            </div>
          </div>
        </Card>
      </div>

      )}

      {vista === 'contratistas' && (
        <Card titulo="Comparación de contratistas" sinPadding>
          <Tabla>
            <thead><tr><Th>Contratista</Th><Th className="text-right">Certificados</Th><Th className="text-right">Monto</Th><Th className="text-right">Aprobados</Th><Th className="text-right">Sin observaciones</Th><Th className="text-right">Observaciones</Th><Th className="text-right">Ciclo emisión → aprobado</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {d.ranking.map((x) => (
                <tr key={x.id}>
                  <Td><Link className="text-marca-700 hover:underline" href={`/i/contratistas/${x.id}`}>{x.razon}</Link></Td>
                  <Td className="num">{x.certs}</Td><Td className="num"><Pesos v={x.monto} /></Td><Td className="num">{x.aprobados}</Td>
                  <Td className="num">{x.aprobados ? `${Math.round((x.primera / x.aprobados) * 100)}%` : '—'}</Td><Td className="num">{x.observaciones}</Td>
                  <Td className="num">{x.ciclo_dias != null ? `${x.ciclo_dias.toFixed(1)} días` : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </Tabla>
        </Card>
      )}

      {vista === 'presupuesto' && (
        <Card titulo="Presupuesto de PEP (interno)" sinPadding>
          <Tabla>
            <thead><tr><Th>PEP</Th><Th className="text-right">Presupuesto</Th><Th className="text-right">Comprometido</Th><Th className="text-right">Consumido</Th><Th className="text-right">Disponible</Th><Th className="w-48">Uso</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {d.peps.map((x) => {
                const usado = Number(x.comprometido) + Number(x.consumido)
                const disp = Number(x.presupuesto) - usado
                return (
                  <tr key={x.numero}>
                    <Td><div className="font-mono text-xs">{x.numero}</div><div className="text-xs text-slate-500">{x.descripcion}</div></Td>
                    <Td className="num"><Pesos v={x.presupuesto} /></Td><Td className="num"><Pesos v={x.comprometido} /></Td><Td className="num"><Pesos v={x.consumido} /></Td>
                    <Td className={`num ${disp < 0 ? 'text-red-700' : ''}`}><Pesos v={disp} /></Td>
                    <Td><Barra valor={usado} max={Number(x.presupuesto)} color={disp < 0 ? 'bg-red-500' : 'bg-green-500'} /></Td>
                  </tr>
                )
              })}
            </tbody>
          </Tabla>
        </Card>
      )}
    </>
  )
}
