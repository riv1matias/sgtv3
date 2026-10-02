'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'
import { accionFacturaTercero, accionFlujoCertificado, accionGuardarBorrador } from '@/app/acciones/certificados'
import { Badge, Campo, Card, Input, Select, Textarea, clasesBoton } from '@/components/ui'
import { formatoPesos } from '@/domain/dinero'
import { ESTADOS_RECUPERADO } from '@/lib/etiquetas'

export interface CodigoOpcion {
  id: number; codigoS4: string; descripcion: string; unidad: string; categoria?: string | null; alcance?: string | null
  montoAbierto: boolean; requiereFactura: boolean; soloUrgencia?: boolean; requiereSegundaAprobacion?: boolean; precio: string | null
}
export interface MaterialOpcion { id: number; codigoSap: string; descripcion: string; unidad: string; recuperable?: boolean }

export interface ItemEditor {
  key: string
  tipo: 'mo' | 'material' | 'recuperado'
  codigo?: CodigoOpcion
  material?: MaterialOpcion
  cantidad: string
  importe: string
  justificacion: string
  estadoRecuperado: string
  observacion: string
  facturaNumero: string
  facturaCuit: string
  facturaFecha: string
  facturaImporte: string
  facturaDocumentoId: string
  facturaNombre?: string
  observaciones?: string[]
}

interface Props {
  certificadoId: string
  estado: string
  lista: 'mantenimiento' | 'obras'
  alicuotaIva: string
  urgencia: boolean
  cabecera: { periodo: string; fechaEjecDesde: string; fechaEjecHasta: string; centro: string; almacen: string; comentario: string; esFinal: boolean }
  mostrarEsFinal: boolean
  items: ItemEditor[]
  accionEmitir: 'emitir' | 'responder_rebote'
  lockVersion: number
}

let seq = 0
const nuevaKey = () => `n${++seq}-${Date.now()}`

function numero(v: string) {
  const n = Number(String(v).replace(/\./g, '').replace(',', '.'))
  return isFinite(n) ? n : 0
}
function num(v: string) {
  // Acepta "1.200,5" o "1200.5"
  const s = String(v).trim()
  if (/,/.test(s)) return numero(s)
  const n = Number(s)
  return isFinite(n) ? n : 0
}

function Buscador<T>({ placeholder, url, render, onElegir, deshabilitado }: { placeholder: string; url: (q: string) => string; render: (x: T) => React.ReactNode; onElegir: (x: T) => void; deshabilitado?: boolean }) {
  const [q, setQ] = useState('')
  const [res, setRes] = useState<T[]>([])
  const [abierto, setAbierto] = useState(false)
  const [sel, setSel] = useState(0)
  useEffect(() => {
    if (!q.trim()) { setRes([]); return }
    const ctl = new AbortController()
    const t = setTimeout(() => {
      fetch(url(q), { signal: ctl.signal }).then((r) => r.json()).then((x: T[]) => { setRes(x); setSel(0); setAbierto(true) }).catch(() => {})
    }, 180)
    return () => { clearTimeout(t); ctl.abort() }
  }, [q, url])
  const elegir = (x: T) => { onElegir(x); setQ(''); setRes([]); setAbierto(false) }
  return (
    <div className="relative">
      <Input
        value={q} disabled={deshabilitado} placeholder={placeholder}
        onChange={(e) => setQ(e.target.value)} onFocus={() => res.length && setAbierto(true)} onBlur={() => setTimeout(() => setAbierto(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, res.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
          if (e.key === 'Enter') { e.preventDefault(); if (res[sel]) elegir(res[sel]) }
          if (e.key === 'Escape') setAbierto(false)
        }}
      />
      {abierto && q && (
        <ul className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
          {res.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">Sin resultados aplicables</li>}
          {res.map((x, i) => (
            <li key={i}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); elegir(x) }} className={clsx('w-full px-3 py-2 text-left text-sm', i === sel ? 'bg-marca-50' : 'hover:bg-slate-50')}>{render(x)}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function EditorCertificado(p: Props) {
  const router = useRouter()
  const [cab, setCab] = useState(p.cabecera)
  const [items, setItems] = useState<ItemEditor[]>(p.items)
  const [sucio, setSucio] = useState(false)
  const [verRecuperados, setVerRecuperados] = useState(false)
  const [msg, setMsg] = useState<{ tono: 'ok' | 'error'; texto: string } | null>(null)
  const [pendiente, start] = useTransition()
  const [comentarioEmision, setComentarioEmision] = useState('')
  const ultimo = useRef<HTMLInputElement | null>(null)
  const rebote = p.estado === 'REBOTE_MATERIALES'

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (sucio) { e.preventDefault() } }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [sucio])

  const cambiar = (key: string, cambios: Partial<ItemEditor>) => { setItems((xs) => xs.map((x) => (x.key === key ? { ...x, ...cambios } : x))); setSucio(true) }
  const quitar = (key: string) => { setItems((xs) => xs.filter((x) => x.key !== key)); setSucio(true) }
  const vacio = (tipo: ItemEditor['tipo']): ItemEditor => ({ key: nuevaKey(), tipo, cantidad: '', importe: '', justificacion: '', estadoRecuperado: 'utilizable', observacion: '', facturaNumero: '', facturaCuit: '', facturaFecha: '', facturaImporte: '', facturaDocumentoId: '' })
  const agregarCodigo = (c: CodigoOpcion) => {
    setItems((xs) => [...xs, { ...vacio('mo'), codigo: c, cantidad: c.montoAbierto ? '1' : '' }]); setSucio(true)
    setTimeout(() => ultimo.current?.focus(), 30)
  }
  const agregarMaterial = (tipo: 'material' | 'recuperado') => (m: MaterialOpcion) => {
    setItems((xs) => [...xs, { ...vacio(tipo), material: m }]); setSucio(true)
    setTimeout(() => ultimo.current?.focus(), 30)
  }

  const totales = useMemo(() => {
    let sub = 0
    for (const it of items) {
      if (it.tipo !== 'mo' || !it.codigo) continue
      sub += it.codigo.montoAbierto ? num(it.importe) : Math.round(num(it.cantidad) * Number(it.codigo.precio ?? 0) * 100) / 100
    }
    const iva = Math.round(sub * Number(p.alicuotaIva)) / 100
    return { sub, iva, total: sub + iva }
  }, [items, p.alicuotaIva])

  const borrador = () => ({
    ...cab,
    items: items.filter((i) => i.codigo || i.material).map((i) => ({
      tipo: i.tipo, codigoMoId: i.codigo?.id ?? null, materialId: i.material?.id ?? null,
      cantidad: i.cantidad ? String(num(i.cantidad)) : null, importe: i.importe ? String(num(i.importe)) : null,
      justificacion: i.justificacion, estadoRecuperado: i.estadoRecuperado, observacion: i.observacion,
      facturaNumero: i.facturaNumero || null, facturaCuit: i.facturaCuit || null, facturaFecha: i.facturaFecha || null,
      facturaImporte: i.facturaImporte ? String(num(i.facturaImporte)) : null, facturaDocumentoId: i.facturaDocumentoId || null,
    })),
  })

  const guardar = (luego?: () => Promise<void>) => start(async () => {
    setMsg(null)
    const r = await accionGuardarBorrador(p.certificadoId, borrador())
    if (r.error) { setMsg({ tono: 'error', texto: r.error }); return }
    setSucio(false)
    if (luego) await luego()
    else { setMsg({ tono: 'ok', texto: 'Borrador guardado' }); router.refresh() }
  })

  const emitir = () => guardar(async () => {
    const fd = new FormData()
    fd.set('certificadoId', p.certificadoId)
    fd.set('accion', p.accionEmitir)
    if (comentarioEmision) fd.set('comentario', comentarioEmision)
    const r = await accionFlujoCertificado(null, fd)
    if (r.error) { setMsg({ tono: 'error', texto: r.error }); router.refresh(); return }
    router.push(`/c/certificados/${p.certificadoId}?emitido=1`)
    router.refresh()
  })

  const subirFactura = async (key: string, f: File) => {
    const fd = new FormData()
    fd.set('certificadoId', p.certificadoId)
    fd.set('archivo', f)
    const r = await accionFacturaTercero(fd)
    if (r.error) { setMsg({ tono: 'error', texto: r.error }); return }
    const d = r.datos as { documentoId: string; nombre: string }
    cambiar(key, { facturaDocumentoId: d.documentoId, facturaNombre: d.nombre })
  }

  const mo = items.filter((i) => i.tipo === 'mo')
  const renderCodigo = (c: CodigoOpcion) => (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span><span className="font-mono text-xs text-slate-500">{c.codigoS4}</span> {c.descripcion}</span>
        <span className="num text-xs text-slate-500">{c.montoAbierto ? 'Monto abierto' : `${formatoPesos(c.precio)} / ${c.unidad}`}</span>
      </div>
      {c.alcance && <div className="mt-0.5 text-xs text-slate-500">Alcance: {c.alcance}</div>}
      <div className="mt-0.5 flex gap-1">{c.requiereSegundaAprobacion && <Badge color="indigo">Requiere gerente</Badge>}{c.requiereFactura && <Badge color="amber">Requiere factura</Badge>}{c.soloUrgencia && <Badge color="red">Solo urgencias</Badge>}</div>
    </div>
  )

  const hayMateriales = items.some((i) => i.tipo !== 'mo')
  return (
    <div className="space-y-5">
      <Card titulo="1. Carátula">
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo label="Período de certificación"><Input type="month" value={cab.periodo} onChange={(e) => { setCab({ ...cab, periodo: e.target.value }); setSucio(true) }} /></Campo>
          <Campo label="Ejecución desde"><Input type="date" value={cab.fechaEjecDesde} onChange={(e) => { setCab({ ...cab, fechaEjecDesde: e.target.value }); setSucio(true) }} /></Campo>
          <Campo label="Ejecución hasta"><Input type="date" value={cab.fechaEjecHasta} onChange={(e) => { setCab({ ...cab, fechaEjecHasta: e.target.value }); setSucio(true) }} /></Campo>
          {hayMateriales && (
            <>
              <Campo label="Centro de consumo" ayuda="De dónde salieron los materiales"><Input value={cab.centro} onChange={(e) => { setCab({ ...cab, centro: e.target.value }); setSucio(true) }} /></Campo>
              <Campo label="Almacén de consumo"><Input value={cab.almacen} onChange={(e) => { setCab({ ...cab, almacen: e.target.value }); setSucio(true) }} /></Campo>
            </>
          )}
          {p.mostrarEsFinal && (
            <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={cab.esFinal} onChange={(e) => { setCab({ ...cab, esFinal: e.target.checked }); setSucio(true) }} /> Es el certificado final de la tarea</label>
          )}
          <Campo label="Comentario sobre el trabajo (opcional)" className="sm:col-span-3"><Textarea rows={2} placeholder="Algo que el solicitante deba saber al validar" value={cab.comentario} onChange={(e) => { setCab({ ...cab, comentario: e.target.value }); setSucio(true) }} /></Campo>
        </div>
      </Card>

      <Card titulo={<>2. Mano de obra <span className="font-normal text-slate-400">({mo.length})</span></>}>
        {rebote && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">En un rebote solo se corrigen materiales: la mano de obra no se puede modificar.</p>}
        {!rebote && (
          <div className="mb-3">
            <Buscador<CodigoOpcion>
              placeholder="Buscá por código S4, código viejo, descripción o categoría (↑↓ y Enter para agregar)"
              url={(q) => `/api/codigos?q=${encodeURIComponent(q)}&lista=${p.lista}`}
              render={renderCodigo} onElegir={agregarCodigo}
            />
          </div>
        )}
        {mo.length === 0 ? <p className="py-4 text-center text-sm text-slate-500">Agregá al menos un ítem de mano de obra.</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wide text-slate-500"><th className="py-2 pr-2">Código</th><th className="pr-2">Descripción</th><th className="pr-2 text-right">Cantidad</th><th className="pr-2 text-right">Precio</th><th className="pr-2 text-right">Subtotal</th><th /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {mo.map((it, idx) => {
                  const c = it.codigo!
                  const sub = c.montoAbierto ? num(it.importe) : num(it.cantidad) * Number(c.precio ?? 0)
                  return (
                    <tr key={it.key} className="align-top">
                      <td className="py-2 pr-2 font-mono text-xs">{c.codigoS4}</td>
                      <td className="py-2 pr-2">
                        <div>{c.descripcion} <span className="text-xs text-slate-400">({c.unidad})</span></div>
                        {it.observaciones?.map((o, i) => <div key={i} className="mt-1 rounded bg-red-50 px-2 py-1 text-xs text-red-800">Observación: {o}</div>)}
                        {c.montoAbierto && (
                          <Input value={it.justificacion} disabled={rebote} onChange={(e) => cambiar(it.key, { justificacion: e.target.value })} placeholder="Justificación obligatoria" className="mt-1 py-1 text-xs" />
                        )}
                        {c.requiereFactura && (
                          <div className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2 sm:grid-cols-4">
                            <Input value={it.facturaNumero} disabled={rebote} onChange={(e) => cambiar(it.key, { facturaNumero: e.target.value })} placeholder="N° factura" className="py-1 text-xs" />
                            <Input value={it.facturaCuit} disabled={rebote} onChange={(e) => cambiar(it.key, { facturaCuit: e.target.value })} placeholder="CUIT proveedor" className="py-1 text-xs" />
                            <Input type="date" value={it.facturaFecha} disabled={rebote} onChange={(e) => cambiar(it.key, { facturaFecha: e.target.value })} className="py-1 text-xs" />
                            <Input value={it.facturaImporte} disabled={rebote} onChange={(e) => cambiar(it.key, { facturaImporte: e.target.value })} placeholder="Importe factura" className="py-1 text-xs" />
                            <label className="col-span-2 text-xs text-slate-600 sm:col-span-4">
                              {it.facturaDocumentoId ? <span className="text-green-700">✓ Factura adjunta {it.facturaNombre ?? ''}</span> : 'Adjuntar factura: '}
                              {!rebote && <input type="file" accept="application/pdf,image/*" className="ml-2 text-xs" onChange={(e) => e.target.files?.[0] && subirFactura(it.key, e.target.files[0])} />}
                            </label>
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-right">
                        {c.montoAbierto ? (
                          <Input ref={idx === mo.length - 1 ? ultimo : undefined} value={it.importe} disabled={rebote} onChange={(e) => cambiar(it.key, { importe: e.target.value })} placeholder="Importe $" className="w-32 py-1 text-right" inputMode="decimal" />
                        ) : (
                          <Input ref={idx === mo.length - 1 ? ultimo : undefined} value={it.cantidad} disabled={rebote} onChange={(e) => cambiar(it.key, { cantidad: e.target.value })} className="w-28 py-1 text-right" inputMode="decimal" />
                        )}
                      </td>
                      <td className="num py-2 pr-2 text-xs text-slate-500">{c.montoAbierto ? '—' : formatoPesos(c.precio)}</td>
                      <td className="num py-2 pr-2 font-medium">{formatoPesos(sub)}</td>
                      <td className="py-2">{!rebote && <button type="button" onClick={() => quitar(it.key)} className="text-xs text-red-600 hover:underline">Quitar</button>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {(['material', 'recuperado'] as const).map((tipo) => {
          const filas = items.filter((i) => i.tipo === tipo)
          if (tipo === 'recuperado' && !filas.length && !verRecuperados) {
            return (
              <button key={tipo} type="button" onClick={() => setVerRecuperados(true)}
                className="flex min-h-[7rem] flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-4 text-center text-sm text-slate-500 transition-colors hover:border-marca-300 hover:text-marca-700">
                <span className="font-medium">+ 4. Agregar materiales recuperados</span>
                <span className="text-xs">Solo si retiraste material de la red que vuelve al almacén</span>
              </button>
            )
          }
          return (
            <Card key={tipo} titulo={<>{tipo === 'material' ? '3. Materiales utilizados' : '4. Materiales recuperados'} <span className="font-normal text-slate-400">({filas.length}, opcional)</span></>}>
              <Buscador<MaterialOpcion>
                placeholder="Código SAP o descripción" url={(q) => `/api/materiales?q=${encodeURIComponent(q)}`}
                render={(m) => <span><span className="font-mono text-xs text-slate-500">{m.codigoSap}</span> {m.descripcion} <span className="text-xs text-slate-400">({m.unidad})</span></span>}
                onElegir={agregarMaterial(tipo)}
              />
              <ul className="mt-3 divide-y divide-slate-100">
                {filas.map((it) => (
                  <li key={it.key} className="flex items-start gap-2 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <div><span className="font-mono text-xs text-slate-500">{it.material!.codigoSap}</span> {it.material!.descripcion}</div>
                      {it.observaciones?.map((o, i) => <div key={i} className="mt-1 rounded bg-red-50 px-2 py-1 text-xs text-red-800">Observación: {o}</div>)}
                      {tipo === 'recuperado' && (
                        <Select value={it.estadoRecuperado} onChange={(e) => cambiar(it.key, { estadoRecuperado: e.target.value })} className="mt-1 w-40 py-1 text-xs">
                          {ESTADOS_RECUPERADO.map((e) => <option key={e}>{e}</option>)}
                        </Select>
                      )}
                    </div>
                    <Input ref={ultimo} value={it.cantidad} onChange={(e) => cambiar(it.key, { cantidad: e.target.value })} className="w-24 py-1 text-right" inputMode="decimal" />
                    <span className="w-8 pt-1.5 text-xs text-slate-500">{it.material!.unidad}</span>
                    <button type="button" onClick={() => quitar(it.key)} className="pt-1.5 text-xs text-red-600 hover:underline">Quitar</button>
                  </li>
                ))}
              </ul>
            </Card>
          )
        })}
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] backdrop-blur lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-sm">
            <span className="text-slate-500">Subtotal</span> <b className="num">{formatoPesos(totales.sub)}</b>
            <span className="ml-3 text-slate-500">IVA</span> <span className="num">{formatoPesos(totales.iva)}</span>
            <span className="ml-3 text-slate-500">Total</span> <b className="num">{formatoPesos(totales.total)}</b>
            <span className="ml-2 text-xs text-slate-400">(estimado con la LPU vigente)</span>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {sucio && <span className="text-xs text-amber-700">Cambios sin guardar</span>}
            {msg && <span className={clsx('max-w-md whitespace-pre-line text-xs', msg.tono === 'ok' ? 'text-green-700' : 'text-red-700')}>{msg.texto}</span>}
            <button type="button" disabled={pendiente} onClick={() => guardar()} className={clasesBoton('secundario')}>{pendiente ? 'Guardando…' : 'Guardar borrador'}</button>
            <details className="relative">
              <summary className={clasesBoton('primario')}>{p.accionEmitir === 'emitir' ? 'Emitir certificado' : 'Reenviar materiales'} ▾</summary>
              <div className="absolute bottom-12 right-0 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                <Textarea value={comentarioEmision} onChange={(e) => setComentarioEmision(e.target.value)} placeholder={p.accionEmitir === 'emitir' ? 'Comentario (opcional): qué corregiste' : 'Qué corregiste o cómo justificás el origen (obligatorio)'} />
                <button type="button" disabled={pendiente} onClick={emitir} className={clsx(clasesBoton('primario'), 'mt-2 w-full')}>{pendiente ? 'Procesando…' : 'Guardar y emitir'}</button>
                <p className="mt-2 text-xs text-slate-500">Al emitir, esta versión queda congelada y pasa a validación.</p>
              </div>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}
