import { requerirUsuario, tieneRol } from '@/server/sesion'
import { noLeidas } from '@/server/consultas'
import { delegacionesVigentes } from '@/server/servicios/admin'
import { Shell } from '@/components/shell'
import type { ItemMenu } from '@/components/nav'
import { hoy, formatoFecha } from '@/lib/fechas'

export default async function LayoutInterno({ children }: { children: React.ReactNode }) {
  const u = await requerirUsuario('interno')
  const items: ItemMenu[] = [{ href: '/i', texto: 'Mi bandeja', icono: '◉', exacto: true }]
  if (tieneRol(u, 'solicitante', 'supervisor', 'gerente', 'administracion', 'cerco', 'adm_obra', 'auditor', 'admin_sistema')) {
    items.push({ href: '/i/tareas', texto: 'Tareas', icono: '▤', grupo: 'Operación' })
    items.push({ href: '/i/certificados', texto: 'Certificados', icono: '▦', grupo: 'Operación' })
  }
  if (tieneRol(u, 'administracion')) items.push({ href: '/i/materiales', texto: 'Materiales y SAP', icono: '▣', grupo: 'Operación' })
  if (tieneRol(u, 'administracion', 'cerco', 'adm_obra', 'auditor')) items.push({ href: '/i/liquidaciones', texto: 'Liquidaciones', icono: '$', grupo: 'Operación' })
  items.push({ href: '/i/contratistas', texto: 'Contratistas', icono: '⚑', grupo: 'Seguimiento' })
  items.push({ href: '/i/indicadores', texto: 'Indicadores', icono: '▲', grupo: 'Seguimiento' })
  items.push({ href: '/i/catalogos', texto: 'Catálogos y LPU', icono: '☰', grupo: 'Seguimiento' })
  if (tieneRol(u, 'auditor', 'cerco', 'supervisor', 'admin_sistema', 'gerente')) items.push({ href: '/i/auditoria', texto: 'Auditoría', icono: '⌾', grupo: 'Control' })
  items.push({ href: '/i/config', texto: tieneRol(u, 'admin_sistema') ? 'Configuración' : 'Delegaciones', icono: '⚙', grupo: 'Control' })

  const [n, deleg] = await Promise.all([noLeidas(u), delegacionesVigentes(u.id, hoy())])
  const aviso = (deleg.recibidas.length > 0 || deleg.dadas.length > 0) ? (
    <div className="no-print border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 lg:px-8">
      {deleg.recibidas.map((d) => <div key={d.d.id}>Estás actuando como delegado de <b>{d.n} {d.a}</b> hasta el {formatoFecha(d.d.hasta)}.</div>)}
      {deleg.dadas.map((d) => <div key={d.d.id}>Delegaste tu bandeja en <b>{d.n} {d.a}</b> del {formatoFecha(d.d.desde)} al {formatoFecha(d.d.hasta)}.</div>)}
    </div>
  ) : null
  return <Shell u={u} items={items} portal="i" noLeidas={n} aviso={aviso}>{children}</Shell>
}
