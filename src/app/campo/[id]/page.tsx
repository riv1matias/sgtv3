import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requerirUsuario } from '@/server/sesion'
import { detalleTarea } from '@/server/consultas'
import { accionBitacora } from '@/app/acciones/tareas'
import { BotonEnviar, Formulario } from '@/components/formulario'
import { formatoFechaHora } from '@/lib/fechas'

export default async function TareaCampo({ params }: { params: Promise<{ id: string }> }) {
  const u = await requerirUsuario('contratista')
  const d = await detalleTarea((await params).id)
  if (!d || d.t.contratistaId !== u.contratistaId) notFound()
  const { t } = d
  return (
    <>
      <Link href="/campo" className="text-sm text-marca-700">← Mis tareas</Link>
      <div className="mt-2 rounded-xl bg-white p-4 shadow-sm">
        <div className="text-xs text-slate-500">{t.numero}</div>
        <h1 className="text-lg font-semibold">{t.urgencia && '⚡ '}{t.titulo}</h1>
        <p className="text-sm text-slate-600">{t.direccion}</p>
        {t.lat != null && <a className="mt-2 inline-block rounded-lg bg-marca-50 px-3 py-2 text-sm font-medium text-marca-700" href={`https://www.google.com/maps/dir/?api=1&destination=${t.lat},${t.lng}`}>Cómo llegar</a>}
        {t.descripcion && <p className="mt-3 whitespace-pre-line text-sm">{t.descripcion}</p>}
      </div>
      <div className="mt-3 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">Cargar en la bitácora</h2>
        <Formulario accion={accionBitacora} className="space-y-3" reiniciar>
          <input type="hidden" name="tareaId" value={t.id} />
          <label className="flex h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-marca-300 bg-marca-50 text-marca-700">
            <span className="text-3xl">📷</span><span className="text-sm font-medium">Sacar o elegir fotos</span>
            <input type="file" name="archivos" accept="image/*" capture="environment" multiple className="sr-only" />
          </label>
          <textarea name="texto" rows={3} placeholder="Qué se hizo, qué se encontró…" className="w-full rounded-lg border border-slate-300 p-3 text-base" />
          <BotonEnviar className="w-full py-3 text-base">Guardar</BotonEnviar>
        </Formulario>
        <p className="mt-2 text-xs text-slate-500">Sin señal: las fotos quedan en el teléfono; volvé a intentar cuando tengas conexión.</p>
      </div>
      <div className="mt-3 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">Lo cargado</h2>
        <ul className="space-y-3">
          {d.bitacora.map((b) => (
            <li key={b.b.id} className="flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {b.doc?.mime?.startsWith('image/') && <img src={`/api/archivos/${b.doc.id}`} alt="" className="h-16 w-16 rounded-lg object-cover" />}
              <div className="text-sm"><div className="text-xs text-slate-400">{b.nombre} {b.apellido} · {formatoFechaHora(b.b.createdAt)}</div>{b.b.texto}</div>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
