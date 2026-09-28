import Link from 'next/link'
import { salir } from '@/app/acciones/sesion'
import { nombreRol } from '@/lib/etiquetas'
import type { Usuario } from '@/server/usuarios'
import { Icono, Marca } from './iconos'
import { Menu, MenuMovil, type ItemMenu } from './nav'

function TarjetaAyuda({ portal }: { portal: 'i' | 'c' }) {
  return (
    <Link href={`/${portal}/ayuda`} className="mx-3 mt-6 block rounded-xl border border-white/10 bg-white/5 p-3 text-slate-300 transition-colors hover:bg-white/10">
      <span className="flex items-center gap-2 text-sm font-medium text-white"><Icono nombre="ayuda" className="h-[18px] w-[18px] text-marca-300" /> Centro de ayuda</span>
      <span className="mt-1 block text-xs leading-snug text-slate-400">Guías paso a paso, preguntas frecuentes y glosario.</span>
    </Link>
  )
}

export function Shell({ u, items, portal, noLeidas, aviso, children }: { u: Usuario; items: ItemMenu[]; portal: 'i' | 'c'; noLeidas: number; aviso?: React.ReactNode; children: React.ReactNode }) {
  const iniciales = `${u.nombre[0] ?? ''}${u.apellido[0] ?? ''}`
  const perfil = u.contratistaNombre ?? u.roles.map(nombreRol).join(' · ')
  return (
    <div className="min-h-screen lg:flex">
      <aside className="no-print fondo-marca hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="px-5 pb-2 pt-5">
          <Link href={`/${portal}`}><Marca claro chico /></Link>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-marca-100">
            <span className={portal === 'i' ? 'h-1.5 w-1.5 rounded-full bg-marca-300' : 'h-1.5 w-1.5 rounded-full bg-acento-400'} />
            {portal === 'i' ? 'Portal interno' : 'Portal de contratistas'}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto pb-4">
          <Menu items={items} />
          <TarjetaAyuda portal={portal} />
        </div>
        <div className="border-t border-white/10 px-5 py-3 text-[11px] text-slate-400">
          Entorno de demostración · datos ficticios
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="no-print sticky top-0 z-30 flex items-center gap-2 border-b border-slate-200/80 bg-white/85 px-3 py-2.5 backdrop-blur sm:gap-3 lg:px-8">
          <MenuMovil items={items} pie={<TarjetaAyuda portal={portal} />} />
          <Link href={`/${portal}`} className="lg:hidden"><Marca chico /></Link>
          <form action={`/${portal}/buscar`} className="relative hidden flex-1 sm:block" role="search">
            <Icono nombre="buscar" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input name="q" aria-label="Buscar" placeholder={portal === 'i' ? 'Buscar tarea, certificado, OT, PEP, contratista, dirección…' : 'Buscar tarea o certificado…'}
              className="w-full max-w-xl rounded-full border-0 bg-slate-100 py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-marca-500" />
          </form>
          <div className="ml-auto flex items-center gap-1">
            <Link href={`/${portal}/buscar`} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 sm:hidden" title="Buscar"><Icono nombre="buscar" className="h-5 w-5" /></Link>
            <Link href={`/${portal}/ayuda`} className="flex items-center gap-1.5 rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-marca-700 md:px-3" title="Ayuda y preguntas frecuentes">
              <Icono nombre="ayuda" className="h-5 w-5" /><span className="hidden text-sm font-medium md:inline">Ayuda</span>
            </Link>
            <Link href={`/${portal}/notificaciones`} className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100" title="Notificaciones">
              <Icono nombre="campana" className="h-5 w-5" />
              {noLeidas > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-acento-500 px-1 text-center text-[10px] font-semibold leading-[18px] text-white ring-2 ring-white">{noLeidas > 99 ? '99+' : noLeidas}</span>}
            </Link>
            <details className="relative">
              <summary className="flex cursor-pointer items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-slate-100">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-marca-400 to-marca-600 text-xs font-semibold text-white">{iniciales}</span>
                <span className="hidden text-left md:block">
                  <span className="block text-sm font-medium leading-tight text-slate-800">{u.nombreCompleto}</span>
                  <span className="block max-w-[14rem] truncate text-xs leading-tight text-slate-500">{perfil}</span>
                </span>
                <Icono nombre="chevron" className="hidden text-slate-400 md:block" />
              </summary>
              <div className="animar-entrada absolute right-0 z-40 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                  <div className="text-sm font-medium text-slate-900">{u.nombreCompleto}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                  <div className="mt-2 flex flex-wrap gap-1">{u.roles.map((r) => <span key={r} className="rounded-md bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200">{nombreRol(r)}</span>)}</div>
                </div>
                <div className="mt-1">
                  {portal === 'i' && <Link href="/i/config/delegaciones" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"><Icono nombre="delegar" className="text-slate-400" /> Mis delegaciones</Link>}
                  <Link href={`/${portal}/ayuda`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"><Icono nombre="ayuda" className="text-slate-400" /> Ayuda y preguntas frecuentes</Link>
                  <form action={salir}><button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"><Icono nombre="salir" /> Salir</button></form>
                </div>
              </div>
            </details>
          </div>
        </header>
        {aviso}
        <main className="animar-entrada mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 lg:px-8">{children}</main>
        <footer className="no-print border-t border-slate-200 px-4 py-4 text-xs text-slate-400 lg:px-8">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-2">
            <span>Personal S.A. · Gestión de tareas y certificación de contratistas</span>
            <span className="flex gap-4"><Link href={`/${portal}/ayuda`} className="hover:text-marca-700">Ayuda</Link><Link href={`/${portal}/ayuda#preguntas`} className="hover:text-marca-700">Preguntas frecuentes</Link></span>
          </div>
        </footer>
      </div>
    </div>
  )
}
