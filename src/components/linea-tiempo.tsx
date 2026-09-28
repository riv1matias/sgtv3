import { eventosDe } from '@/server/auditoria'
import { flujoPorId } from '@/server/flujos'
import { formatoFechaHora } from '@/lib/fechas'
import { nombreRol } from '@/lib/etiquetas'
import { Vacio } from './ui'

const ACCIONES: Record<string, string> = {
  crear: 'creó', guardar_borrador: 'guardó el borrador', adjuntar: 'adjuntó documentos', quitar_documento: 'quitó un documento', importar_bitacora: 'agregó fotos de la bitácora',
  tomar: 'tomó el certificado', soltar: 'liberó el certificado', revalorizar: 'revalorizó por nueva LPU', resolver_alerta: 'resolvió una alerta',
  registrar_consumo: 'registró el consumo SAP', registrar_ingreso_recuperados: 'registró el ingreso de recuperados', registrar_correccion: 'registró una corrección SAP',
  cambiar_imputacion: 'cambió la imputación', cambiar_tipo: 'cambió el tipo de trabajo', pedir_cambio_tipo: 'pidió cambiar el tipo de trabajo',
  conformar_cambio_tipo: 'dio conformidad al cambio de tipo', rechazar_cambio_tipo: 'rechazó el cambio de tipo', bitacora: 'cargó la bitácora', subasignar: 'subasignó a una cuadrilla',
  incluir_en_liquidacion: 'incluyó en la liquidación', cerrar: 'cerró',
}

/** Línea de tiempo legible a partir de la auditoría inmutable */
export async function LineaTiempo({ entidad, id, flujoId, ocultarInternos }: { entidad: string; id: string; flujoId?: number; ocultarInternos?: boolean }) {
  const eventos = await eventosDe(entidad, id)
  const def = flujoId ? await flujoPorId(flujoId) : null
  const etiquetaAccion = (a: string) => ACCIONES[a] ?? def?.transiciones.find((t) => t.accion === a)?.etiqueta.toLowerCase() ?? a.replaceAll('_', ' ')
  const etiquetaEstado = (e: string | null) => (e ? def?.estados.find((x) => x.clave === e)?.etiqueta ?? e : '')
  const visibles = ocultarInternos ? eventos.filter((e) => !['tomar', 'soltar', 'resolver_alerta', 'cambiar_imputacion'].includes(e.accion)) : eventos
  if (!visibles.length) return <Vacio>Sin eventos</Vacio>
  return (
    <ol className="relative ml-2 border-l border-slate-200">
      {visibles.map((e) => {
        const cambios = e.cambios as Record<string, unknown> | null
        return (
          <li key={e.id} className="mb-4 ml-4">
            <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-marca-500" />
            <div className="text-sm">
              <b className="font-medium text-slate-900">{e.usuarioNombre}</b>
              {e.rol && e.rol !== 'sistema' && <span className="text-slate-500"> ({nombreRol(e.rol)}{e.empresa ? ` · ${e.empresa}` : ''})</span>}
              {e.enNombreDe && <span className="text-slate-500"> en nombre de otra persona</span>}
              {' '}{etiquetaAccion(e.accion)}
              {e.estadoHasta && e.estadoDesde !== e.estadoHasta && <span className="text-slate-500"> → <span className="font-medium text-slate-700">{etiquetaEstado(e.estadoHasta)}</span></span>}
            </div>
            <div className="text-xs text-slate-400">{formatoFechaHora(e.ocurridoEn)}</div>
            {cambios?.motivo ? <div className="mt-1 text-xs text-slate-600">Motivo: {String(cambios.motivo)}</div> : null}
            {e.comentario && <div className="mt-1 whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{e.comentario}</div>}
          </li>
        )
      })}
    </ol>
  )
}
