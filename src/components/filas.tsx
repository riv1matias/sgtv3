import Link from 'next/link'
import { EstadoBadge, slaDe } from './estado'
import { Badge, Pesos, Semaforo, Tabla, Td, Th, Vacio } from './ui'
import { hace, horasDesde, nombrePeriodo } from '@/lib/fechas'
import { TIPOS_TRABAJO } from '@/lib/etiquetas'
import type { FilaCertificado, FilaTarea } from '@/server/consultas'

export async function TablaCertificados({ filas, portal, vacio = 'No hay certificados', conAcciones }: { filas: Array<FilaCertificado & { acciones?: string[]; bloqueo?: string; modo?: string }>; portal: 'i' | 'c'; vacio?: string; conAcciones?: boolean }) {
  if (!filas.length) return <Vacio>{vacio}</Vacio>
  const slas = await Promise.all(filas.map((f) => slaDe(f.flujoId, f.estado)))
  return (
    <Tabla>
      <thead>
        <tr>
          <Th className="w-6" />
          <Th>Certificado</Th>
          <Th>Tarea</Th>
          {portal === 'i' && <Th>Contratista</Th>}
          <Th>Estado</Th>
          <Th className="text-right">Subtotal</Th>
          <Th>En el estado</Th>
          {conAcciones && <Th>Qué hay que hacer</Th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {filas.map((f, i) => (
          <tr key={f.id} className="hover:bg-slate-50">
            <Td><Semaforo horas={horasDesde(f.desde)} objetivo={slas[i]} /></Td>
            <Td>
              <Link href={`/${portal}/certificados/${f.id}`} className="whitespace-nowrap font-medium text-marca-700 hover:underline">{f.numero}</Link>
              <div className="text-xs text-slate-500">{f.orden}/{f.previstos}{f.esFinal ? ' · final' : ''} · {nombrePeriodo(f.periodo)}</div>
            </Td>
            <Td>
              <div className="max-w-xs truncate">{f.titulo}</div>
              <div className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
                {f.tareaNumero} · {TIPOS_TRABAJO[f.tipoTrabajo]} · {f.subregion}
                {f.urgencia && <Badge color="red">Urgencia</Badge>}
                {f.requiereSegunda && portal === 'i' && <Badge color="indigo">2da aprob.</Badge>}
              </div>
            </Td>
            {portal === 'i' && <Td className="text-slate-700">{f.contratista}</Td>}
            <Td>
              <EstadoBadge flujoId={f.flujoId} estado={f.estado} />
              {f.tomadoPorNombre && <div className="mt-1 text-xs text-slate-500">Lo trabaja {f.tomadoPorNombre}</div>}
              {f.alertasAbiertas > 0 && portal === 'i' && <div className="mt-1"><Badge color="amber">⚠ {f.alertasAbiertas} alerta{f.alertasAbiertas > 1 ? 's' : ''}</Badge></div>}
            </Td>
            <Td className="num"><Pesos v={f.subtotalFinal ?? f.subtotal} /></Td>
            <Td className="whitespace-nowrap text-xs text-slate-500">{hace(f.desde)}</Td>
            {conAcciones && (
              <Td className="text-xs">
                {f.bloqueo ? <span className="text-amber-700">{f.bloqueo}</span> : <span className="text-slate-700">{f.acciones?.join(' · ')}</span>}
                {f.modo === 'supervisor' && <div className="text-slate-400">en lugar de {f.solicitanteNombre}</div>}
                {f.modo === 'delegado' && <div className="text-slate-400">como delegado</div>}
              </Td>
            )}
          </tr>
        ))}
      </tbody>
    </Tabla>
  )
}

export async function TablaTareas({ filas, portal, vacio = 'No hay tareas', conAcciones }: { filas: Array<FilaTarea & { acciones?: string[] }>; portal: 'i' | 'c'; vacio?: string; conAcciones?: boolean }) {
  if (!filas.length) return <Vacio>{vacio}</Vacio>
  return (
    <Tabla>
      <thead>
        <tr>
          <Th>Tarea</Th>
          <Th>Tipo</Th>
          {portal === 'i' ? <Th>Contratista</Th> : <Th>Solicitante</Th>}
          <Th>Subregión</Th>
          <Th>Estado</Th>
          <Th>En el estado</Th>
          {conAcciones && <Th>Qué hay que hacer</Th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {filas.map((f) => (
          <tr key={f.id} className="hover:bg-slate-50">
            <Td>
              <Link href={`/${portal}/tareas/${f.id}`} className="whitespace-nowrap font-medium text-marca-700 hover:underline">{f.numero}</Link>
              <div className="max-w-sm truncate text-slate-700">{f.titulo}</div>
              {f.direccion && <div className="max-w-sm truncate text-xs text-slate-500">{f.direccion}</div>}
            </Td>
            <Td>
              <div>{TIPOS_TRABAJO[f.tipoTrabajo]}</div>
              <div className="flex gap-1 text-xs text-slate-500">{f.subtipo}{f.urgencia && <Badge color="red">Urgencia</Badge>}</div>
            </Td>
            <Td className="text-slate-700">{portal === 'i' ? f.contratista ?? '—' : f.solicitanteNombre}</Td>
            <Td className="text-slate-700">{f.subregion}</Td>
            <Td>
              <EstadoBadge flujoId={f.flujoId} estado={f.estado} />
              {f.causalEspera && <div className="mt-1 text-xs text-slate-500">{f.causalEspera}</div>}
            </Td>
            <Td className="whitespace-nowrap text-xs text-slate-500">{hace(f.desde)}</Td>
            {conAcciones && <Td className="text-xs text-slate-700">{f.acciones?.join(' · ')}</Td>}
          </tr>
        ))}
      </tbody>
    </Tabla>
  )
}
