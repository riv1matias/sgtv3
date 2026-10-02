import { flujoPorId } from '@/server/flujos'
import { Badge } from './ui'

/** Etiqueta del estado con el color definido en el flujo (versión propia de cada instancia) */
export async function EstadoBadge({ flujoId, estado }: { flujoId: number; estado: string }) {
  const def = await flujoPorId(flujoId)
  const e = def.estados.find((x) => x.clave === estado)
  return <Badge color={e?.color ?? 'slate'}>{e?.etiqueta ?? estado}</Badge>
}

export async function slaDe(flujoId: number, estado: string) {
  const def = await flujoPorId(flujoId)
  return def.estados.find((x) => x.clave === estado)?.sla_horas ?? null
}
