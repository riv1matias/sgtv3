import { TIPOS_DOCUMENTO } from '@/lib/etiquetas'
import { formatoFechaHora } from '@/lib/fechas'
import { Badge, Vacio } from './ui'

type Doc = { id: string; nombre: string; mime: string | null; tamano: number; tipo: string; createdAt: Date }

function tamano(b: number) {
  return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`
}

export function GaleriaDocumentos({ docs, nuevos = [], quitar, angosta }: { docs: Doc[]; nuevos?: string[]; quitar?: (d: Doc) => React.ReactNode; angosta?: boolean }) {
  if (!docs.length) return <Vacio>Sin documentos</Vacio>
  return (
    <ul className={angosta ? 'grid grid-cols-2 gap-2' : 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3'}>
      {docs.map((d) => {
        const img = d.mime?.startsWith('image/')
        return (
          <li key={d.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <a href={`/api/archivos/${d.id}`} target="_blank" rel="noreferrer" className="block">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/archivos/${d.id}`} alt={d.nombre} className={`${angosta ? 'h-20' : 'h-32'} w-full bg-slate-100 object-cover`} />
              ) : (
                <div className={`flex ${angosta ? 'h-20' : 'h-32'} items-center justify-center bg-slate-50 text-3xl text-slate-300`}>{d.mime === 'application/pdf' ? 'PDF' : '▤'}</div>
              )}
            </a>
            <div className="flex items-start justify-between gap-2 p-2">
              <div className="min-w-0">
                <a href={`/api/archivos/${d.id}?descargar`} className="block truncate text-xs font-medium text-slate-800 hover:text-marca-700" title={d.nombre}>{d.nombre}</a>
                <div className="text-[11px] text-slate-500">{TIPOS_DOCUMENTO[d.tipo] ?? d.tipo} · {tamano(d.tamano)}{angosta ? '' : ` · ${formatoFechaHora(d.createdAt)}`}</div>
                {nuevos.includes(d.id) && <Badge color="blue" className="mt-1">Nuevo en esta versión</Badge>}
              </div>
              {quitar?.(d)}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
