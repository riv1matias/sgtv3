'use client'

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Icono } from './iconos'

interface Item { p: string; r: string; tema: string }

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Preguntas frecuentes con buscador y filtro por tema. Sin JavaScript se ven todas. */
export function PreguntasFrecuentes({ preguntas }: { preguntas: Item[] }) {
  const [q, setQ] = useState('')
  const [tema, setTema] = useState<string | null>(null)
  const temas = useMemo(() => [...new Set(preguntas.map((x) => x.tema))], [preguntas])
  const filtradas = useMemo(() => {
    const t = normalizar(q.trim())
    return preguntas.filter((x) => (!tema || x.tema === tema) && (!t || normalizar(`${x.p} ${x.r}`).includes(t)))
  }, [q, tema, preguntas])
  return (
    <div>
      <div className="relative">
        <Icono nombre="buscar" className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Escribí tu duda: factura, aprobar, código, 48 h…" aria-label="Buscar en preguntas frecuentes"
          className="w-full rounded-2xl border-0 bg-white py-3.5 pl-12 pr-4 text-[15px] shadow-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-marca-500" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {[null, ...temas].map((t) => (
          <button key={t ?? 'todos'} type="button" onClick={() => setTema(t)}
            className={clsx('rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors', tema === t ? 'bg-marca-600 text-white ring-marca-600' : 'bg-white text-slate-600 ring-slate-200 hover:ring-marca-300')}>
            {t ?? 'Todas'}
          </button>
        ))}
      </div>
      <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
        {filtradas.map((x) => (
          <details key={x.p} className="group">
            <summary className="flex cursor-pointer items-start gap-3 px-5 py-4 hover:bg-slate-50">
              <span className="flex-1 text-sm font-medium text-slate-900">{x.p}</span>
              <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 sm:inline">{x.tema}</span>
              <Icono nombre="chevron" className="mt-0.5 text-slate-400 transition-transform group-open:rotate-180" />
            </summary>
            <p className="px-5 pb-4 text-sm leading-relaxed text-slate-600">{x.r}</p>
          </details>
        ))}
        {!filtradas.length && (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            No encontramos preguntas con “{q}”. Probá con otras palabras o consultá a la Mesa de Ayuda.
          </div>
        )}
      </div>
    </div>
  )
}
