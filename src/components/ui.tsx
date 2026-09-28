import Link from 'next/link'
import clsx from 'clsx'
import { formatoPesos } from '@/domain/dinero'

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
    <section className={clsx('print-card rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      {(titulo || acciones) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{titulo}</h2>
          {acciones && <div className="flex items-center gap-2">{acciones}</div>}
        </header>
      )}
      <div className={sinPadding ? '' : 'p-4'}>{children}</div>
    </section>
  )
}

export function Encabezado({ titulo, subtitulo, acciones, volver }: { titulo: React.ReactNode; subtitulo?: React.ReactNode; acciones?: React.ReactNode; volver?: { href: string; texto: string } }) {
  return (
    <div className="mb-5">
      {volver && <Link href={volver.href} className="no-print mb-1 inline-block text-xs text-slate-500 hover:text-marca-600">← {volver.texto}</Link>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{titulo}</h1>
          {subtitulo && <div className="mt-1 text-sm text-slate-500">{subtitulo}</div>}
        </div>
        {acciones && <div className="no-print flex flex-wrap items-center gap-2">{acciones}</div>}
      </div>
    </div>
  )
}

const estilosBoton = {
  primario: 'bg-marca-600 text-white hover:bg-marca-700 shadow-sm',
  secundario: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50',
  peligro: 'bg-white text-red-700 ring-1 ring-inset ring-red-300 hover:bg-red-50',
  fantasma: 'text-slate-600 hover:bg-slate-100',
}
export type EstiloBoton = keyof typeof estilosBoton

export function clasesBoton(estilo: EstiloBoton = 'secundario', chico = false) {
  return clsx('inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50', chico ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm', estilosBoton[estilo])
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

export function Vacio({ children, icono = '○' }: { children: React.ReactNode; icono?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-sm text-slate-500">
      <span className="text-2xl text-slate-300">{icono}</span>
      {children}
    </div>
  )
}

export function Dato({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{children ?? '—'}</dd>
    </div>
  )
}

export function Kpi({ label, valor, detalle, tono = 'neutro', href }: { label: string; valor: React.ReactNode; detalle?: React.ReactNode; tono?: 'neutro' | 'alerta' | 'ok' | 'peligro'; href?: string }) {
  const contenido = (
    <div className={clsx('rounded-xl border bg-white p-4 shadow-sm transition-colors', href && 'hover:border-marca-300', tono === 'alerta' ? 'border-amber-200' : tono === 'peligro' ? 'border-red-200' : tono === 'ok' ? 'border-green-200' : 'border-slate-200')}>
      <div className="text-xs font-medium text-slate-500">{label}</div>
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
        <Link key={i.clave} href={i.href} className={clsx('-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium', i.clave === activa ? 'border-marca-600 text-marca-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
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
  return <th className={clsx('whitespace-nowrap bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500', className)}>{children}</th>
}
export function Td({ children, className, colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={clsx('px-3 py-2 align-top', className)}>{children}</td>
}

export function Aviso({ tono = 'info', children, titulo }: { tono?: 'info' | 'alerta' | 'error' | 'ok'; children: React.ReactNode; titulo?: string }) {
  const c = { info: 'border-blue-200 bg-blue-50 text-blue-900', alerta: 'border-amber-200 bg-amber-50 text-amber-900', error: 'border-red-200 bg-red-50 text-red-900', ok: 'border-green-200 bg-green-50 text-green-900' }[tono]
  return (
    <div className={clsx('rounded-lg border px-3 py-2 text-sm', c)}>
      {titulo && <div className="font-semibold">{titulo}</div>}
      <div className="whitespace-pre-line">{children}</div>
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
