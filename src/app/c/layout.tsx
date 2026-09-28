import { requerirUsuario, tieneRol } from '@/server/sesion'
import { noLeidas } from '@/server/consultas'
import { Shell } from '@/components/shell'
import type { ItemMenu } from '@/components/nav'

export default async function LayoutContratista({ children }: { children: React.ReactNode }) {
  const u = await requerirUsuario('contratista')
  const items: ItemMenu[] = [
    { href: '/c', texto: 'Mi bandeja', icono: 'bandeja', exacto: true },
    { href: '/c/tareas', texto: 'Tareas', icono: 'tareas', grupo: 'Trabajo' },
    { href: '/c/certificados', texto: 'Certificados', icono: 'certificado', grupo: 'Trabajo' },
    { href: '/c/liquidaciones', texto: 'Liquidaciones', icono: 'dinero', grupo: 'Trabajo' },
    { href: '/c/cuadrillas', texto: 'Cuadrillas', icono: 'cuadrilla', grupo: 'Mi empresa' },
    { href: '/c/stock', texto: 'Stock', icono: 'stock', grupo: 'Mi empresa' },
    { href: '/c/indicadores', texto: 'Mis indicadores', icono: 'grafico', grupo: 'Mi empresa' },
    { href: '/c/lpu', texto: 'LPU vigente', icono: 'catalogo', grupo: 'Mi empresa' },
  ]
  if (!tieneRol(u, 'contratista_responsable')) items.splice(4, 1)
  return <Shell u={u} items={items} portal="c" noLeidas={await noLeidas(u)}>{children}</Shell>
}
