import Link from 'next/link'
import { requerirUsuario } from '@/server/sesion'
import { salir } from '@/app/acciones/sesion'

export const metadata = { title: 'Campo', manifest: '/manifest.webmanifest' }

export default async function LayoutCampo({ children }: { children: React.ReactNode }) {
  const u = await requerirUsuario('contratista')
  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-marca-700 px-4 py-3 text-white">
        <Link href="/campo" className="font-semibold">SGT · Campo</Link>
        <form action={salir}><button className="text-xs text-marca-100">{u.nombre} · salir</button></form>
      </header>
      <main className="p-3">{children}</main>
    </div>
  )
}
