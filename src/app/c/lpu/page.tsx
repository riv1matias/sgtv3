import { and, asc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { requerirUsuario } from '@/server/sesion'
import { lpusPublicadas } from '@/server/servicios/precios'
import { Badge, Card, Encabezado, Input, Pesos, Tabla, Td, Th } from '@/components/ui'
import { formatoFecha, hoy } from '@/lib/fechas'

export const metadata = { title: 'LPU vigente' }

export default async function Lpu({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requerirUsuario('contratista')
  const q = (await searchParams).q ?? ''
  const db = getDb()
  const lpus = (await lpusPublicadas(db)).sort((a, b) => b.vigenciaDesde.localeCompare(a.vigenciaDesde))
  const vig = lpus.find((l) => l.vigenciaDesde <= hoy())
  const futura = lpus.find((l) => l.vigenciaDesde > hoy())
  const porAlias = q ? await db.select({ id: s.codigoMoAlias.codigoMoId }).from(s.codigoMoAlias).where(eq(s.codigoMoAlias.alias, q)) : []
  const codigos = await db.select().from(s.codigosMo).where(and(eq(s.codigosMo.activo, true), q ? or(ilike(s.codigosMo.codigoS4, `${q}%`), ilike(s.codigosMo.descripcion, `%${q}%`), ilike(s.codigosMo.categoria, `${q}%`), porAlias.length ? inArray(s.codigosMo.id, porAlias.map((a) => a.id)) : sql`false`) : undefined)).orderBy(asc(s.codigosMo.codigoS4)).limit(400)
  const precios = vig && codigos.length ? await db.select().from(s.lpuPrecios).where(and(eq(s.lpuPrecios.lpuId, vig.id), inArray(s.lpuPrecios.codigoMoId, codigos.map((c) => c.id)))) : []
  const p = (id: number, l: string) => precios.find((x) => x.codigoMoId === id && x.lista === l)?.precio ?? null
  return (
    <>
      <Encabezado titulo="LPU vigente" subtitulo={vig ? `${vig.nombre} · vigente desde ${formatoFecha(vig.vigenciaDesde)}${futura ? ` · próxima: ${futura.nombre} desde ${formatoFecha(futura.vigenciaDesde)}` : ''}` : 'Sin LPU vigente'} />
      <Card sinPadding>
        <form className="flex gap-2 border-b border-slate-100 p-3"><Input name="q" defaultValue={q} placeholder="Código S4, código viejo, descripción o categoría" className="w-96" /><button className="rounded-lg bg-slate-800 px-3 text-sm text-white">Buscar</button></form>
        <Tabla>
          <thead><tr><Th>Código</Th><Th>Descripción y alcance</Th><Th>UM</Th><Th className="text-right">$ Mantenimiento / Eventos</Th><Th className="text-right">$ Obras</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {codigos.map((c) => (
              <tr key={c.id}>
                <Td className="font-mono text-xs">{c.codigoS4}</Td>
                <Td><div>{c.descripcion} {c.requiereFactura && <Badge color="amber">Requiere factura</Badge>} {c.soloUrgencia && <Badge color="red">Solo urgencias</Badge>}</div>{c.alcance && <div className="mt-0.5 text-xs text-slate-500">{c.alcance}</div>}</Td>
                <Td>{c.unidad}</Td>
                <Td className="num">{c.montoAbierto ? 'Monto abierto' : p(c.id, 'mantenimiento') ? <Pesos v={p(c.id, 'mantenimiento')} /> : 'No aplica'}</Td>
                <Td className="num">{c.montoAbierto ? 'Monto abierto' : p(c.id, 'obras') ? <Pesos v={p(c.id, 'obras')} /> : 'No aplica'}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      </Card>
    </>
  )
}
