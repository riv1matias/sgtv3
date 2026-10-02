import Link from 'next/link'
import { EstadoBadge, slaDe } from './estado'
import { Badge, Pesos, Semaforo, Tabla, Td, Th, Vacio } from './ui'
import { hace, horasDesde, nombrePeriodo } from '@/lib/fechas'
import { TIPOS_TRABAJO } from '@/lib/etiquetas'
import type { FilaCertificado, FilaTarea } from '@/server/consultas'

export async function TablaCertificados({ filas, portal, vacio = 'No hay certificados', conAcciones, sinEstado }: { filas: Array<FilaCertificado & { acciones?: string[]; bloqueo?: string; modo?: string }>; portal: 'i' | 'c'; vacio?: string; conAcciones?: boolean; sinEstado?: boolean }) {
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
          {!sinEstado && <Th>Estado</Th>}
          <Th className="text-right">Subtotal</Th>
          <Th>En el estado</Th>
          {conAcciones && <Th>Próxima acción</Th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {filas.map((f, i) => (
          <tr key={f.id} className="hover:bg-slate-50">
            <Td><Semaforo horas={horasDesde(f.desde)} objetivo={slas[i]} /></Td>
            <Td>
              <Link href={`/${portal}/certificados/${f.id}`} className="whitespace-nowrap font-medium text-marca-700 hover:underline">{f.numero}</Link>
              <div className="whitespace-nowrap text-xs text-slate-500">{f.previstos > 1 ? `Avance ${f.orden} de ${f.previstos} · ` : ''}{nombrePeriodo(f.periodo)}</div>
              {sinEstado && f.alertasAbiertas > 0 && portal === 'i' && <div className="mt-1"><Badge color="amber">{f.alertasAbiertas} alerta{f.alertasAbiertas > 1 ? 's' : ''}</Badge></div>}
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
            {!sinEstado && (
              <Td>
                <EstadoBadge flujoId={f.flujoId} estado={f.estado} />
                {f.tomadoPorNombre && <div className="mt-1 text-xs text-slate-500">Lo trabaja {f.tomadoPorNombre}</div>}
                {f.alertasAbiertas > 0 && portal === 'i' && <div className="mt-1"><Badge color="amber">{f.alertasAbiertas} alerta{f.alertasAbiertas > 1 ? 's' : ''}</Badge></div>}
              </Td>
            )}
            <Td className="num"><Pesos v={f.subtotalFinal ?? f.subtotal} /></Td>
            <Td className="whitespace-nowrap text-xs text-slate-500">{hace(f.desde)}</Td>
            {conAcciones && (
              <Td className="text-xs">
                {f.bloqueo ? <span className="text-amber-700">{f.bloqueo}</span> : <span className="font-medium text-slate-700">{principales(f.acciones).join(' · ')}</span>}
                {sinEstado && f.tomadoPorNombre && <div className="text-slate-400">Lo trabaja {f.tomadoPorNombre}</div>}
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
          {portal === 'i' ? <Th>Contratista</Th> : <Th>Solicitante</Th>}
          <Th>Subregión</Th>
          <Th>Estado</Th>
          <Th>En el estado</Th>
          {conAcciones && <Th>Próxima acción</Th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {filas.map((f) => (
          <tr key={f.id} className="hover:bg-slate-50">
            <Td>
              <Link href={`/${portal}/tareas/${f.id}`} className="whitespace-nowrap font-medium text-marca-700 hover:underline">{f.numero}</Link>
              <div className="max-w-md truncate text-slate-800">{f.titulo}</div>
              <div className="flex max-w-md flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
                <span>{TIPOS_TRABAJO[f.tipoTrabajo]}{f.subtipo ? ` · ${f.subtipo}` : ''}</span>
                {f.direccion && <span className="truncate">· {f.direccion}</span>}
                {f.urgencia && <Badge color="red">Urgencia</Badge>}
              </div>
            </Td>
            <Td className="text-slate-700">{portal === 'i' ? f.contratista ?? '—' : f.solicitanteNombre}</Td>
            <Td className="text-slate-700">{f.subregion}</Td>
            <Td>
              <EstadoBadge flujoId={f.flujoId} estado={f.estado} />
              {f.causalEspera && <div className="mt-1 text-xs text-slate-500">{f.causalEspera}</div>}
            </Td>
            <Td className="whitespace-nowrap text-xs text-slate-500">{hace(f.desde)}</Td>
            {conAcciones && <Td className="text-xs font-medium text-slate-700">{portal === 'c' && f.estado === 'EJECUTADA' ? 'Certificar' : principales(f.acciones).join(' · ') || '—'}</Td>}
          </tr>
        ))}
      </tbody>
    </Tabla>
  )
}

/** En los listados se resumen solo las acciones habituales; las de excepción siguen disponibles dentro de cada tarea o certificado */
const SECUNDARIAS = new Set(['Pedir cierre sin certificar', 'Desestimar tarea', 'Cancelar tarea', 'Anular certificado', 'Poner en espera', 'Pedir reasignación',
  'Reabrir (más certificados)', 'Retirar para corregir', 'Pedir retiro', 'Recuperar mi aprobación'])
function principales(acciones?: string[]) {
  return (acciones ?? []).filter((a) => !SECUNDARIAS.has(a))
}
