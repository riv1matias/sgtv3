/**
 * Tipos del motor de flujo. Una definición de flujo es un documento versionado (YAML)
 * que combina piezas conocidas: actores, condiciones, validaciones y efectos.
 */

export type Condicion =
  | string
  | { tipo_trabajo_en: string[] }
  | { parametro: string; igual: unknown }
  | { no: Condicion }
  | { todas: Condicion[] }
  | { alguna: Condicion[] }

export type ActorSimple =
  | 'solicitante'
  | 'supervisor_solicitante'
  | 'contratista'
  | 'gerente'
  | 'ultimo_aprobador'
  | 'sistema'

export type ActorSpec =
  | ActorSimple
  | { pool: string }
  | Array<{ si?: Condicion; actor?: ActorSimple; pool?: string }>

export interface EstadoDef {
  clave: string
  etiqueta: string
  tipo?: 'inicial' | 'final'
  actor?: ActorSpec
  /** El reloj del contratista no corre en este estado */
  pausa_contratista?: boolean
  sla_horas?: number
  color?: string
}

export type Destino = string | Array<{ si?: Condicion; ir_a: string }>

export interface TransicionDef {
  accion: string
  etiqueta: string
  desde: string[]
  hacia: Destino
  /** Si no se indica, actúa el actor del estado de origen */
  actor?: ActorSpec
  requiere?: Array<'comentario' | 'motivo' | 'adjunto'>
  /** Clave de la lista de motivos tipificados */
  motivos?: string
  /** Condición para que la acción esté disponible */
  condicion?: Condicion
  validaciones?: string[]
  efectos?: string[]
  /** aprobacion: aplica la regla de "nadie aprueba dos pasos" */
  tipo?: 'aprobacion' | 'rechazo' | 'neutra'
  estilo?: 'primario' | 'peligro' | 'secundario'
  confirmar?: string
}

export interface DefinicionFlujo {
  flujo: string
  version: number
  vigente_desde: string
  parametros?: Record<string, unknown>
  motivos?: Record<string, string[]>
  estados: EstadoDef[]
  transiciones: TransicionDef[]
}

export interface UsuarioCtx {
  id: string
  roles: string[]
  subregionIds: number[]
  contratistaId?: number | null
}

export interface ContextoFlujo {
  estado: string
  usuario: UsuarioCtx
  relaciones: {
    solicitanteId?: string | null
    supervisorSolicitanteId?: string | null
    contratistaId?: number | null
    subregionId?: number | null
    tomadoPor?: string | null
    tomadoPorNombre?: string | null
  }
  /** Hechos del negocio que usan las condiciones (tipoTrabajo, requiereSegundaAprobacion, …) */
  hechos: Record<string, unknown>
  parametros?: Record<string, unknown>
  /** Usuarios que aprobaron pasos anteriores de la versión vigente */
  aprobadoresPrevios?: string[]
  /** Usuarios que este usuario supervisa (puede actuar en su lugar) */
  supervisados?: string[]
  /** Usuarios que delegaron su bandeja en este usuario */
  delegantes?: string[]
}

export type ModoActuacion = 'directo' | 'pool' | 'delegado' | 'supervisor' | 'suplencia'

export interface AccionDisponible {
  transicion: TransicionDef
  modo: ModoActuacion
  /** Usuario en cuyo nombre se actúa (delegación o supervisión) */
  enNombreDe?: string | null
  /** Si está presente, la acción se muestra deshabilitada con este motivo */
  bloqueo?: string
}
