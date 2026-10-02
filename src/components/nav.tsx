'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { Icono, type NombreIcono } from './iconos'

export interface ItemMenu { href: string; texto: string; icono: NombreIcono; exacto?: boolean; grupo?: string; ayuda?: string }

export function Menu({ items }: { items: ItemMenu[] }) {
  const path = usePathname()
  let grupo: string | undefined
  return (
    <nav className="flex flex-col gap-0.5 px-3" aria-label="Menú principal">
      {items.map((i) => {
        const activo = i.exacto ? path === i.href : path === i.href || path.startsWith(i.href + '/')
        const cabecera = i.grupo && i.grupo !== grupo ? i.grupo : null
        grupo = i.grupo
        return (
          <div key={i.href} className="contents">
            {cabecera && <div className="px-3 pb-1.5 pt-5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-marca-200/60">{cabecera}</div>}
            <Link href={i.href} title={i.ayuda} aria-current={activo ? 'page' : undefined}
              className={clsx('group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
                activo ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white')}>
              {activo && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r bg-marca-400" />}
              <Icono nombre={i.icono} className={clsx('h-[18px] w-[18px]', activo ? 'text-marca-300' : 'text-slate-400 group-hover:text-slate-200')} />
              {i.texto}
            </Link>
          </div>
        )
      })}
    </nav>
  )
}

/** Menú desplegable para pantallas chicas: se cierra solo al navegar */
export function MenuMovil({ items, pie }: { items: ItemMenu[]; pie?: React.ReactNode }) {
  const path = usePathname()
  const [abierto, setAbierto] = useState(false)
  useEffect(() => { setAbierto(false) }, [path])
  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setAbierto(!abierto)} aria-expanded={abierto} aria-label="Abrir menú"
        className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
        <Icono nombre="menu" className="h-5 w-5" />
      </button>
      {abierto && (
        <div className="fixed inset-0 z-40 flex">
          <button type="button" aria-label="Cerrar menú" className="absolute inset-0 bg-noche-950/50" onClick={() => setAbierto(false)} />
          <div className="animar-entrada relative flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-noche-900 pb-6 pt-4">
            <Menu items={items} />
            {pie}
          </div>
        </div>
      )}
    </div>
  )
}
