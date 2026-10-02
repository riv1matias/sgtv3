import { notFound } from 'next/navigation'
import { and, eq, notInArray, sql } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { requerirUsuario, tieneRol } from '@/server/sesion'
import type { ResumenLpu } from '@/server/servicios/lpu'
import { accionDescartarLpu, accionPublicarLpu } from '@/app/acciones/gestion'
import { BotonEnviar, Formulario } from '@/components/formulario'
import { Aviso, Badge, Card, Encabezado, Input, Kpi, Pesos, Tabla, Td, Th } from '@/components/ui'
import { formatoFecha, formatoFechaHora } from '@/lib/fechas'

export default async function DetalleLpu({ params }: { params: Promise<{ id: string }> }) {
  const u = await requerirUsuario('interno')
  const id = Number((await params).id)
  const db = getDb()
  const [l] = await db.select().from(s.lpuVersiones).where(eq(s.lpuVersiones.id, id))
  if (!l) notFound()
  const r = l.resumen as ResumenLpu | null
  const puede = tieneRol(u, 'compras', 'admin_sistema')
  const [{ n: abiertos }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.certificados)
    .where(and(notInArray(s.certificados.estado, ['EN_LIQUIDACION', 'CERRADO', 'ANULADO', 'ANULADO_REVERTIDO', 'PENDIENTE_REVERSA_SAP']), sql`${s.certificados.primeraEmisionAt} is not null`))
  const d = r?.diferencia
  const fmtPct = (x: number | null | undefined) => (x == null ? '—' : `${x > 0 ? '+' : ''}${x.toFixed(2)}%`)
  return (
    <>
      <Encabezado volver={{ href: '/i/catalogos?tab=lpu', texto: 'LPU' }} titulo={l.nombre}
        subtitulo={<span className="flex items-center gap-2">Vigencia desde {formatoFecha(l.vigenciaDesde)} · cargada {formatoFechaHora(l.createdAt)} <Badge color={l.estado === 'publicada' ? 'green' : l.estado === 'borrador' ? 'amber' : 'gray'}>{l.estado}</Badge></span>}
        acciones={l.archivoId && <a className="rounded-lg px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50" href={`/api/archivos/${l.archivoId}?descargar`}>Archivo original</a>} />
      {!r ? <Aviso>Esta LPU se cargó sin vista previa (carga inicial).</Aviso> : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Kpi label="Códigos en el archivo" valor={r.filas.length} detalle={`Hoja "${r.hoja}"`} />
            <Kpi label="Altas" valor={d!.altas.length} tono={d!.altas.length ? 'alerta' : 'neutro'} />
            <Kpi label="Bajas" valor={d!.bajas.length} tono={d!.bajas.length ? 'alerta' : 'neutro'} />
            <Kpi label="Variación promedio Mant." valor={fmtPct(d!.variacionPromedio.mantenimiento)} detalle={r.porcentaje ? `Informado: ${Number(r.porcentaje).toFixed(2)}%` : undefined} />
            <Kpi label="Variación promedio Obras" valor={fmtPct(d!.variacionPromedio.obras)} />
          </div>
          {r.errores.length > 0 && <div className="mb-5"><Aviso tono="alerta" titulo={`${r.errores.length} observación(es) al leer el archivo`}>{r.errores.slice(0, 30).join('\n')}</Aviso></div>}
          {l.estado === 'borrador' && puede && (
            <Card titulo="Publicar" className="mb-5 border-marca-200">
              <p className="mb-3 text-sm text-slate-600">Al publicar se actualiza el catálogo, se cargan los precios y se <b>revalorizan {abiertos} certificado(s)</b> emitidos y no cerrados según la política de precios. Se notifica a los contratistas.</p>
              <Formulario accion={accionPublicarLpu} className="space-y-3">
                <input type="hidden" name="lpuId" value={l.id} />
                {d!.bajas.length > 0 && (
                  <div className="rounded-lg border border-slate-200 p-3">
                    <div className="mb-2 text-sm font-medium">Reconversión de códigos dados de baja (opcional)</div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {d!.bajas.map((b) => (
                        <label key={b.codigoS4} className="text-xs text-slate-600">{b.codigoS4} {b.descripcion} → reemplazado por
                          <Input name={`reconv_${b.codigoS4}`} placeholder="Código S4 nuevo" className="mt-1 py-1 text-xs" />
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <BotonEnviar confirmar="Se publicará la LPU y se revalorizarán los certificados abiertos. ¿Confirmás?">Publicar LPU</BotonEnviar>
                </div>
              </Formulario>
              <Formulario accion={accionDescartarLpu} className="mt-3"><input type="hidden" name="lpuId" value={l.id} /><BotonEnviar chico estilo="fantasma">Descartar borrador</BotonEnviar></Formulario>
            </Card>
          )}
          <div className="grid gap-5 xl:grid-cols-2">
            <Card titulo={`Variaciones de precio (${d!.variaciones.length})`} sinPadding>
              <div className="max-h-[32rem] overflow-y-auto">
                <Tabla>
                  <thead><tr><Th>Código</Th><Th>Lista</Th><Th className="text-right">Antes</Th><Th className="text-right">Ahora</Th><Th className="text-right">Var.</Th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {d!.variaciones.slice(0, 500).map((v) => (
                      <tr key={v.codigoS4 + v.lista}>
                        <Td><div className="font-mono text-xs">{v.codigoS4}</div><div className="max-w-xs truncate text-xs text-slate-500">{v.descripcion}</div></Td>
                        <Td className="text-xs">{v.lista}</Td>
                        <Td className="num"><Pesos v={v.antes} chico /></Td><Td className="num"><Pesos v={v.despues} chico /></Td>
                        <Td className={`num text-xs ${v.variacionPct != null && v.variacionPct < 0 ? 'text-red-700' : ''}`}>{fmtPct(v.variacionPct)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Tabla>
              </div>
            </Card>
            <div className="space-y-5">
              <Card titulo={`Altas (${d!.altas.length})`}>
                <ul className="max-h-60 space-y-1 overflow-y-auto text-xs">{d!.altas.map((a) => <li key={a.codigoS4}><span className="font-mono">{a.codigoS4}</span> {a.descripcion} ({a.unidad})</li>)}</ul>
              </Card>
              <Card titulo={`Bajas (${d!.bajas.length})`}>
                <ul className="max-h-60 space-y-1 overflow-y-auto text-xs">{d!.bajas.map((a) => <li key={a.codigoS4}><span className="font-mono">{a.codigoS4}</span> {a.descripcion}</li>)}</ul>
              </Card>
              {(d!.cambiosDescripcion.length > 0 || d!.cambiosUnidad.length > 0) && (
                <Card titulo="Cambios de descripción o unidad">
                  <ul className="max-h-60 space-y-1 overflow-y-auto text-xs">
                    {d!.cambiosUnidad.map((c) => <li key={'u' + c.codigoS4}><b className="font-mono">{c.codigoS4}</b> unidad {c.antes} → {c.despues}</li>)}
                    {d!.cambiosDescripcion.map((c) => <li key={'d' + c.codigoS4}><b className="font-mono">{c.codigoS4}</b> “{c.antes}” → “{c.despues}”</li>)}
                  </ul>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
