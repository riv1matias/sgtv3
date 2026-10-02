import Link from 'next/link'
import clsx from 'clsx'
import { formatoPesos } from '@/domain/dinero'
import { Icono, type NombreIcono } from './iconos'

export const COLORES: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  gray: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  cyan: 'bg-cyan-50 text-cyan-800 ring-cyan-600/20',
  teal: 'bg-teal-50 text-teal-800 ring-teal-600/20',
  green: 'bg-green-50 text-green-700 ring-green-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
}

export function Badge({ color = 'slate', children, className }: { color?: string; children: React.ReactNode; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset', COLORES[color] ?? COLORES.slate, className)}>
      {children}
    </span>
  )
}

export function Card({ children, className, titulo, acciones, sinPadding }: { children: React.ReactNode; className?: string; titulo?: React.ReactNode; acciones?: React.ReactNode; sinPadding?: boolean }) {
  return (
    <section className={clsx('print-card rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgb(15_23_42/0.04),0_4px_16px_-8px_rgb(15_23_42/0.08)]', className)}>
      {(titulo || acciones) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-[14.5px] font-semibold text-slate-800">{titulo}</h2>
          {acciones && <div className="flex items-center gap-2">{acciones}</div>}
        </header>
      )}
      <div className={sinPadding ? '' : 'p-5'}>{children}</div>
    </section>
  )
}

export function Encabezado({ titulo, subtitulo, acciones, volver }: { titulo: React.ReactNode; subtitulo?: React.ReactNode; acciones?: React.ReactNode; volver?: { href: string; texto: string } }) {
  return (
    <div className="mb-6">
      {volver && <Link href={volver.href} className="no-print mb-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-marca-700"><Icono nombre="volver" className="h-3.5 w-3.5" /> {volver.texto}</Link>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{titulo}</h1>
          {subtitulo && <div className="mt-1 text-sm text-slate-500">{subtitulo}</div>}
        </div>
        {acciones && <div className="no-print flex flex-wrap items-center gap-2">{acciones}</div>}
      </div>
    </div>
  )
}

const estilosBoton = {
  primario: 'bg-marca-600 text-white hover:bg-marca-700 shadow-sm shadow-marca-600/20',
  secundario: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50',
  peligro: 'bg-white text-red-700 ring-1 ring-inset ring-red-300 hover:bg-red-50',
  fantasma: 'text-slate-600 hover:bg-slate-100',
}
export type EstiloBoton = keyof typeof estilosBoton

export function clasesBoton(estilo: EstiloBoton = 'secundario', chico = false) {
  return clsx('inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50', chico ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm', estilosBoton[estilo])
}

export function Boton({ estilo = 'secundario', chico, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { estilo?: EstiloBoton; chico?: boolean }) {
  return <button {...props} className={clsx(clasesBoton(estilo, chico), className)} />
}

export function LinkBoton({ estilo = 'secundario', chico, className, ...props }: React.ComponentProps<typeof Link> & { estilo?: EstiloBoton; chico?: boolean }) {
  return <Link {...props} className={clsx(clasesBoton(estilo, chico), className)} />
}

const claseCampo = 'block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-marca-500'

export function Campo({ label, ayuda, children, className }: { label: React.ReactNode; ayuda?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={clsx('block', className)}>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-slate-400">{ayuda}</span>}
    </label>
  )
}

export function Input(props: React.ComponentProps<'input'>) {
  return <input {...props} className={clsx(claseCampo, props.className)} />
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx(claseCampo, 'pr-8', props.className)} />
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={clsx(claseCampo, props.className)} />
}

export function Pesos({ v, className, chico }: { v: string | number | null | undefined; className?: string; chico?: boolean }) {
  return <span className={clsx('num', chico && 'text-xs', className)}>{formatoPesos(v)}</span>
}

export function Vacio({ children, icono = 'bandeja' }: { children: React.ReactNode; icono?: NombreIcono | string }) {
  const svg = icono in ICONOS_VACIO
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-center text-sm text-slate-500">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {svg ? <Icono nombre={icono as NombreIcono} className="h-6 w-6" /> : <span className="text-xl">{icono}</span>}
      </span>
      <div className="max-w-md">{children}</div>
    </div>
  )
}
const ICONOS_VACIO: Record<string, true> = { bandeja: true, tareas: true, certificado: true, buscar: true, campana: true, dinero: true, materiales: true, check: true }

export function Dato({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children ?? '—'}</dd>
    </div>
  )
}

export function Kpi({ label, valor, detalle, tono = 'neutro', href, icono }: { label: string; valor: React.ReactNode; detalle?: React.ReactNode; tono?: 'neutro' | 'alerta' | 'ok' | 'peligro'; href?: string; icono?: NombreIcono }) {
  const colorIcono = tono === 'alerta' ? 'bg-amber-50 text-amber-600' : tono === 'peligro' ? 'bg-red-50 text-red-600' : tono === 'ok' ? 'bg-green-50 text-green-600' : 'bg-marca-50 text-marca-600'
  const contenido = (
    <div className={clsx('h-full rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition', href && 'hover:-translate-y-0.5 hover:border-marca-300 hover:shadow-md', tono === 'alerta' ? 'border-amber-200' : tono === 'peligro' ? 'border-red-200' : tono === 'ok' ? 'border-green-200' : 'border-slate-200/80')}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        {icono && <span className={clsx('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', colorIcono)}><Icono nombre={icono} /></span>}
      </div>
      <div className={clsx('mt-1 text-2xl font-semibold tracking-tight', tono === 'peligro' ? 'text-red-700' : tono === 'alerta' ? 'text-amber-700' : 'text-slate-900')}>{valor}</div>
      {detalle && <div className="mt-1 text-xs text-slate-500">{detalle}</div>}
    </div>
  )
  return href ? <Link href={href}>{contenido}</Link> : contenido
}

export function Pestanas({ items, activa }: { items: Array<{ clave: string; texto: React.ReactNode; href: string }>; activa: string }) {
  return (
    <nav className="no-print mb-4 flex gap-1 overflow-x-auto border-b border-slate-200">
      {items.map((i) => (
        <Link key={i.clave} href={i.href} className={clsx('-mb-px whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors', i.clave === activa ? 'border-marca-600 text-marca-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
          {i.texto}
        </Link>
      ))}
    </nav>
  )
}

export function Tabla({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx('overflow-x-auto', className)}>
      <table className="min-w-full divide-y divide-slate-200 text-sm">{children}</table>
    </div>
  )
}
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={clsx('whitespace-nowrap bg-slate-50/80 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500 first:pl-5 last:pr-5', className)}>{children}</th>
}
export function Td({ children, className, colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={clsx('px-3 py-2.5 align-top first:pl-5 last:pr-5', className)}>{children}</td>
}

export function Aviso({ tono = 'info', children, titulo }: { tono?: 'info' | 'alerta' | 'error' | 'ok'; children: React.ReactNode; titulo?: string }) {
  const c = { info: 'border-marca-200 bg-marca-50 text-marca-900', alerta: 'border-amber-200 bg-amber-50 text-amber-900', error: 'border-red-200 bg-red-50 text-red-900', ok: 'border-green-200 bg-green-50 text-green-900' }[tono]
  const icono: NombreIcono = tono === 'ok' ? 'check' : tono === 'info' ? 'info' : 'alerta'
  return (
    <div role={tono === 'error' ? 'alert' : undefined} className={clsx('flex gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm', c)}>
      <Icono nombre={icono} className="mt-0.5 opacity-80" />
      <div className="min-w-0">
        {titulo && <div className="font-semibold">{titulo}</div>}
        <div className="whitespace-pre-line">{children}</div>
      </div>
    </div>
  )
}

/** Semáforo de SLA a partir de horas transcurridas y objetivo */
export function Semaforo({ horas, objetivo }: { horas: number; objetivo?: number | null }) {
  if (!objetivo) return <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-300" title="Sin SLA" />
  const r = horas / objetivo
  const [c, t] = r >= 1 ? ['bg-red-500', 'Vencido'] : r >= 0.75 ? ['bg-amber-400', 'Por vencer'] : ['bg-green-500', 'En plazo']
  return <span className={clsx('inline-block h-2.5 w-2.5 rounded-full', c)} title={`${t} (${Math.round(horas)} h de ${objetivo} h)`} />
}

export function Paginacion({ pagina, total, porPagina, base }: { pagina: number; total: number; porPagina: number; base: (p: number) => string }) {
  const paginas = Math.max(1, Math.ceil(total / porPagina))
  if (paginas <= 1) return null
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
      <span>{total} resultados · página {pagina} de {paginas}</span>
      <div className="flex gap-2">
        {pagina > 1 && <LinkBoton chico href={base(pagina - 1)}>Anterior</LinkBoton>}
        {pagina < paginas && <LinkBoton chico href={base(pagina + 1)}>Siguiente</LinkBoton>}
      </div>
    </div>
  )
}

/**
 * Ayuda contextual plegable: explica qué se hace en la pantalla sin ocupar lugar.
 * Funciona sin JavaScript (details/summary).
 */
export function AyudaContextual({ titulo = '¿Cómo funciona esta pantalla?', children, abierta, href, className }: { titulo?: string; children: React.ReactNode; abierta?: boolean; href?: string; className?: string }) {
  return (
    <details open={abierta} className={clsx('no-print group mb-5 rounded-2xl border border-marca-100 bg-gradient-to-r from-marca-50 to-white', className)}>
      <summary className="flex cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-marca-800">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-marca-600 shadow-sm ring-1 ring-marca-100"><Icono nombre="foco" /></span>
        {titulo}
        <Icono nombre="chevron" className="ml-auto text-marca-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-2 px-4 pb-4 pl-[3.25rem] text-sm leading-relaxed text-slate-700 [&_b]:text-slate-900 [&_li]:ml-4 [&_li]:list-disc">
        {children}
        {href && <Link href={href} className="inline-flex items-center gap-1 font-medium text-marca-700 hover:underline">Ver la guía completa <Icono nombre="flecha" className="h-3.5 w-3.5" /></Link>}
      </div>
    </details>
  )
}

/** Barra de progreso por etapas (solo visual; los estados reales los define el motor de flujo) */
export function Etapas({ etapas, actual, tono = 'normal' }: { etapas: Array<{ texto: string; opcional?: boolean }>; actual: number; tono?: 'normal' | 'alerta' | 'fin' | 'anulado' }) {
  return (
    <ol className="no-print mb-6 flex overflow-x-auto rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-[0_1px_2px_rgb(15_23_42/0.04)]" aria-label="Etapas">
      {etapas.map((e, i) => {
        const hecho = i < actual || (tono === 'fin' && i === actual)
        const activo = i === actual && tono !== 'fin'
        return (
          <li key={e.texto} aria-current={activo ? 'step' : undefined}
            className={clsx('flex min-w-[7.5rem] flex-1 items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium',
              activo && (tono === 'alerta' ? 'bg-amber-50 text-amber-800' : tono === 'anulado' ? 'bg-slate-100 text-slate-600' : 'bg-marca-50 text-marca-800'),
              !activo && (hecho ? 'text-slate-700' : 'text-slate-400'))}>
            <span className={clsx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
              hecho ? 'bg-marca-500 text-white' : activo ? (tono === 'alerta' ? 'bg-amber-500 text-white' : tono === 'anulado' ? 'bg-slate-400 text-white' : 'bg-marca-600 text-white ring-4 ring-marca-100') : 'bg-slate-100 text-slate-400')}>
              {hecho ? <Icono nombre="check" className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className="leading-tight">{e.texto}{e.opcional && <span className="block text-[10px] font-normal text-slate-400">si corresponde</span>}</span>
          </li>
        )
      })}
    </ol>
  )
}

/** Botón que despliega un formulario secundario en un panel flotante (sin JavaScript) */
export function Desplegable({ texto, children, estilo = 'secundario', ancho = 'w-80' }: { texto: React.ReactNode; children: React.ReactNode; estilo?: EstiloBoton; ancho?: string }) {
  return (
    <details className="group/desp relative">
      <summary className={clasesBoton(estilo, true)}>{texto}<Icono nombre="chevron" className="h-3.5 w-3.5 transition-transform group-open/desp:rotate-180" /></summary>
      <div className={clsx('absolute right-0 z-30 mt-2 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xl', ancho)}>{children}</div>
    </details>
  )
}
