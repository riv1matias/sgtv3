import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Personal · Gestión de contratistas', template: '%s · Personal' },
  description: 'Personal S.A. — Gestión de tareas y certificación de contratistas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
