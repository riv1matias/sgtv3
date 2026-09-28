import Link from 'next/link'
import { salir } from '@/app/acciones/sesion'
import { nombreRol } from '@/lib/etiquetas'
import type { Usuario } from '@/server/usuarios'
import { Menu, type ItemMenu } from './nav'

export function Shell({ u, items, portal, noLeidas, aviso, children }: { u: Usuario; items: ItemMenu[]; portal: 'i' | 'c'; noLeidas: number; aviso?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:flex">
      <aside className="no-print border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:w-60 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-5 py-4">
          <Link href={`/${portal}`} className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-marca-600 text-sm font-bold text-white">SGT</span>
            <span className="text-sm font-semibold leading-tight text-slate-800">{portal === 'i' ? 'Portal interno' : 'Portal de contratistas'}</span>
          </Link>
        </div>
        <div className="pb-3 lg:h-[calc(100vh-4.5rem)] lg:overflow-y-auto">
          <Menu items={items} />
        </div>
      </aside>
      <div className="flex-1 lg:pl-60">
        <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur lg:px-8">
          <form action={`/${portal}/buscar`} className="flex-1">
            <input name="q" placeholder={portal === 'i' ? 'Buscar tarea, certificado, OT, PEP, contratista, dirección…' : 'Buscar tarea o certificado…'}
              className="w-full max-w-xl rounded-lg border-0 bg-slate-100 px-3 py-2 text-sm placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-marca-500" />
          </form>
          <Link href={`/${portal}/notificaciones`} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Notificaciones">
            <span className="text-lg leading-none">🔔</span>
            {noLeidas > 0 && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">{noLeidas > 99 ? '99+' : noLeidas}</span>}
          </Link>
          <details className="relative">
            <summary className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-marca-100 text-xs font-semibold text-marca-700">{u.nombre[0]}{u.apellido[0]}</span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight text-slate-800">{u.nombreCompleto}</span>
                <span className="block text-xs leading-tight text-slate-500">{u.contratistaNombre ?? u.roles.map(nombreRol).join(' · ')}</span>
              </span>
            </summary>
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
              <div className="px-2 py-1.5 text-xs text-slate-500">{u.email}</div>
              <div className="px-2 pb-2 text-xs text-slate-500">Roles: {u.roles.map(nombreRol).join(', ')}</div>
              {portal === 'i' && <Link href="/i/config/delegaciones" className="block rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100">Mis delegaciones</Link>}
              <form action={salir}><button className="w-full rounded-lg px-2 py-1.5 text-left text-sm text-red-700 hover:bg-red-50">Salir</button></form>
            </div>
          </details>
        </header>
        {aviso}
        <main className="mx-auto max-w-[1400px] px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
