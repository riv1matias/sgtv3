import Link from 'next/link'
import { requerirUsuario } from '@/server/sesion'
import { salir } from '@/app/acciones/sesion'
import { Icono, Marca } from '@/components/iconos'

export const metadata = { title: 'Campo', manifest: '/manifest.webmanifest' }

export default async function LayoutCampo({ children }: { children: React.ReactNode }) {
  const u = await requerirUsuario('contratista')
  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50">
      <header className="fondo-marca sticky top-0 z-10 flex items-center justify-between px-4 py-3 text-white">
        <Link href="/campo"><Marca claro chico /></Link>
        <form action={salir}><button className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-marca-50">{u.nombre} <Icono nombre="salir" className="h-3.5 w-3.5" /></button></form>
      </header>
      <main className="p-3">{children}</main>
    </div>
  )
}
