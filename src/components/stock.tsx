import { stockProyectado } from '@/server/consultas'
import { Aviso, Badge, Card, Tabla, Td, Th, Vacio } from './ui'
import { formatoCantidad } from '@/domain/dinero'
import { formatoFecha } from '@/lib/fechas'

export async function TablaStock({ contratistaId }: { contratistaId: number }) {
  const s = await stockProyectado(contratistaId)
  return (
    <Card titulo={`Stock en poder del contratista — centro ${s.contratista?.centroSap ?? '—'}`} sinPadding>
      <div className="p-4 pb-0">
        {s.carga ? (
          <Aviso tono="info">Foto de stock SAP al <b>{formatoFecha(s.carga.fechaFoto)}</b>. El proyectado descuenta lo certificado que todavía no se consumió en SAP.</Aviso>
        ) : <Aviso tono="alerta">Administración todavía no cargó una foto de stock. Solo se muestra lo comprometido en certificados.</Aviso>}
      </div>
      {s.filas.length ? (
        <Tabla className="mt-3">
          <thead><tr><Th>Almacén</Th><Th>Código SAP</Th><Th>Material</Th><Th className="text-right">Stock SAP</Th><Th className="text-right">Certificado sin consumir</Th><Th className="text-right">Proyectado</Th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {s.filas.map((f) => (
              <tr key={f.almacen + f.codigo}>
                <Td><Badge color={f.almacen === 'proyecto' ? 'violet' : 'teal'}>{f.almacen === 'proyecto' ? `Proyecto ${s.contratista?.almacenProyecto ?? ''}` : `Mantenimiento ${s.contratista?.almacenMantenimiento ?? ''}`}</Badge></Td>
                <Td className="font-mono text-xs">{f.codigo}</Td>
                <Td>{f.descripcion}</Td>
                <Td className="num">{formatoCantidad(f.stock)} {f.unidad}</Td>
                <Td className="num">{formatoCantidad(f.comprometido)}</Td>
                <Td className={`num font-medium ${f.proyectado < 0 ? 'text-red-700' : ''}`}>{formatoCantidad(f.proyectado)}{f.proyectado < 0 && ' ⚠'}</Td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      ) : <Vacio>Sin materiales</Vacio>}
    </Card>
  )
}
