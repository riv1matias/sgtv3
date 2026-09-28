import clsx from 'clsx'
import type { AccionDisponible, DefinicionFlujo } from '@/domain/flujo/tipos'
import { accionFlujoCertificado } from '@/app/acciones/certificados'
import { accionFlujoTarea } from '@/app/acciones/tareas'
import { BotonEnviar, Formulario } from './formulario'
import { Campo, Input, Select, Textarea, clasesBoton } from './ui'
import { MODOS } from '@/lib/etiquetas'
import { hoy } from '@/lib/fechas'

interface ItemObservable { id: number; etiqueta: string }

/**
 * Dibuja las acciones que el motor de flujo habilita para el usuario, cada una con sus campos obligatorios.
 * Usa <details> para desplegar el formulario: funciona sin JavaScript.
 */
export function AccionesFlujo({
  entidad, id, lockVersion, def, acciones, contratistas, items, nombres,
}: {
  entidad: 'tarea' | 'certificado'
  id: string
  lockVersion: number
  def: DefinicionFlujo
  acciones: AccionDisponible[]
  contratistas?: Array<{ id: number; razonSocial: string }>
  items?: ItemObservable[]
  nombres?: Record<string, string>
}) {
  if (!acciones.length) return null
  const accion = entidad === 'tarea' ? accionFlujoTarea : accionFlujoCertificado
  const ordenadas = [...acciones].sort((a, b) => Number(b.transicion.estilo === 'primario') - Number(a.transicion.estilo === 'primario'))
  return (
    <div className="flex flex-wrap items-start gap-2">
      {ordenadas.map((a) => {
        const t = a.transicion
        const req = t.requiere ?? []
        const motivos = t.motivos ? def.motivos?.[t.motivos] ?? [] : []
        const necesitaForm = req.length > 0 || ['reasignar', 'pedir_reasignacion', 'registrar_reversa'].includes(t.accion) || (items && ['observar', 'rebotar', 'rechazar'].includes(t.accion))
        const estilo = t.estilo === 'primario' ? 'primario' : t.estilo === 'peligro' ? 'peligro' : 'secundario'
        const quien = a.enNombreDe && nombres?.[a.enNombreDe] ? `${MODOS[a.modo]} ${nombres[a.enNombreDe]}` : MODOS[a.modo]
        const ocultos = (
          <>
            <input type="hidden" name={entidad === 'tarea' ? 'tareaId' : 'certificadoId'} value={id} />
            <input type="hidden" name="accion" value={t.accion} />
            <input type="hidden" name="lockVersion" value={lockVersion} />
          </>
        )
        if (a.bloqueo) {
          return <span key={t.accion + t.desde.join()} title={a.bloqueo} className={clsx(clasesBoton(estilo), 'cursor-not-allowed opacity-50')}>{t.etiqueta}</span>
        }
        if (!necesitaForm) {
          return (
            <Formulario key={t.accion + t.desde.join()} accion={accion}>
              {ocultos}
              <BotonEnviar estilo={estilo} confirmar={t.confirmar}>{t.etiqueta}{quien ? <span className="text-xs opacity-75"> ({quien})</span> : null}</BotonEnviar>
            </Formulario>
          )
        }
        return (
          <details key={t.accion + t.desde.join()} className="group w-full sm:w-auto">
            <summary className={clasesBoton(estilo)}>{t.etiqueta}{quien ? <span className="text-xs opacity-75"> ({quien})</span> : null} <span className="text-xs opacity-60 group-open:rotate-180">▾</span></summary>
            <div className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-4 shadow-lg sm:w-[30rem]">
              <Formulario accion={accion} className="space-y-3">
                {ocultos}
                {['reasignar', 'pedir_reasignacion'].includes(t.accion) && contratistas && (
                  <Campo label="Nuevo contratista">
                    <Select name="contratistaId" required defaultValue="">
                      <option value="" disabled>Elegí…</option>
                      {contratistas.map((c) => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}
                    </Select>
                  </Campo>
                )}
                {req.includes('motivo') && (
                  <Campo label="Motivo">
                    <Select name="motivo" required defaultValue="">
                      <option value="" disabled>Elegí un motivo…</option>
                      {motivos.map((m) => <option key={m}>{m}</option>)}
                    </Select>
                  </Campo>
                )}
                {t.accion === 'registrar_reversa' && (
                  <div className="grid grid-cols-2 gap-3">
                    <Campo label="N° documento de reversa SAP"><Input name="reversaNumero" required /></Campo>
                    <Campo label="Fecha"><Input type="date" name="reversaFecha" required defaultValue={hoy()} /></Campo>
                    <Campo label="Documento (opcional)" className="col-span-2"><Input type="file" name="reversaArchivo" /></Campo>
                  </div>
                )}
                {items && ['observar', 'rebotar', 'rechazar'].includes(t.accion) && items.length > 0 && (
                  <details className="rounded-lg border border-slate-200 p-2">
                    <summary className="cursor-pointer text-xs font-medium text-slate-600">Observar ítems puntuales (opcional)</summary>
                    <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                      {items.map((it) => (
                        <label key={it.id} className="block">
                          <input type="hidden" name="obsItemId" value={it.id} />
                          <span className="text-xs text-slate-600">{it.etiqueta}</span>
                          <Input name={`obsItem_${it.id}`} placeholder="Observación sobre este ítem" className="mt-0.5 py-1 text-xs" />
                        </label>
                      ))}
                    </div>
                  </details>
                )}
                {(req.includes('comentario') || req.length === 0 || req.includes('motivo')) && (
                  <Campo label={req.includes('comentario') ? 'Comentario (obligatorio)' : 'Comentario (opcional)'}>
                    <Textarea name="comentario" required={req.includes('comentario')} placeholder="Queda registrado en la auditoría y lo ve la otra parte" />
                  </Campo>
                )}
                <div className="flex justify-end"><BotonEnviar estilo={estilo} confirmar={t.confirmar}>Confirmar: {t.etiqueta.toLowerCase()}</BotonEnviar></div>
              </Formulario>
            </div>
          </details>
        )
      })}
    </div>
  )
}
