import fs from 'node:fs'
import path from 'node:path'
import YAML from 'yaml'
import type { DefinicionFlujo } from './tipos'
import { validarDefinicion } from './motor'

/** Piezas implementadas en código que las definiciones pueden combinar */
export const PIEZAS = {
  validaciones: [
    'emision', 'alertas_resueltas', 'consumo_registrado', 'solo_materiales_cambiados', 'reversa_registrada',
  ],
  efectos: [
    // tarea
    'cambiar_contratista', 'guardar_reasignacion_pendiente', 'aplicar_reasignacion_pendiente', 'descartar_reasignacion_pendiente',
    'registrar_causal_espera', 'recordar_estado', 'registrar_causal_cierre', 'aumentar_certificados_previstos',
    // certificado
    'emitir_version', 'invalidar_aprobaciones', 'tarea_certificado_emitido', 'nueva_version_borrador', 'registrar_aprobacion',
    'tarea_certificado_aprobado', 'recordar_paso_origen', 'contar_reenvio', 'tarea_certificado_anulado', 'invalidar_ultima_aprobacion',
  ],
}

export function leerDefinicionYaml(archivo: string): DefinicionFlujo {
  const def = YAML.parse(fs.readFileSync(archivo, 'utf8')) as DefinicionFlujo
  def.vigente_desde = String(def.vigente_desde).slice(0, 10)
  const errores = validarDefinicion(def, PIEZAS)
  if (errores.length) throw new Error(`Flujo ${archivo} inválido:\n- ${errores.join('\n- ')}`)
  return def
}

export function directorioFlujos() {
  return path.join(process.cwd(), 'flujos')
}

export function leerTodas(): DefinicionFlujo[] {
  const dir = directorioFlujos()
  return fs.readdirSync(dir).filter((f) => f.endsWith('.yaml')).sort().map((f) => leerDefinicionYaml(path.join(dir, f)))
}
