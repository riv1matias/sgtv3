'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

export interface ItemMenu { href: string; texto: string; icono: string; exacto?: boolean; grupo?: string }

export function Menu({ items }: { items: ItemMenu[] }) {
  const path = usePathname()
  let grupo: string | undefined
  return (
    <nav className="flex gap-1 overflow-x-auto px-2 lg:flex-col lg:overflow-visible">
      {items.map((i) => {
        const activo = i.exacto ? path === i.href : path === i.href || path.startsWith(i.href + '/')
        const cabecera = i.grupo && i.grupo !== grupo ? i.grupo : null
        grupo = i.grupo
        return (
          <div key={i.href} className="contents">
            {cabecera && <div className="hidden px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400 lg:block">{cabecera}</div>}
            <Link href={i.href} className={clsx('flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors', activo ? 'bg-marca-50 text-marca-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900')}>
              <span className="w-4 text-center text-base leading-none" aria-hidden>{i.icono}</span>
              {i.texto}
            </Link>
          </div>
        )
      })}
    </nav>
  )
}
