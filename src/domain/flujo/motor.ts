import type {
  AccionDisponible, ActorSimple, ActorSpec, Condicion, ContextoFlujo, DefinicionFlujo, Destino, ModoActuacion, TransicionDef,
} from './tipos'

/** Roles que operan como pool con alcance nacional */
const POOLS_NACIONALES = new Set(['cerco'])

export function estadoDef(def: DefinicionFlujo, clave: string) {
  const e = def.estados.find((s) => s.clave === clave)
  if (!e) throw new Error(`Estado desconocido en flujo ${def.flujo} v${def.version}: ${clave}`)
  return e
}

export function evaluarCondicion(c: Condicion, ctx: ContextoFlujo): boolean {
  if (typeof c === 'string') {
    switch (c) {
      case 'verdadero': return true
      case 'no_tomado': return !ctx.relaciones.tomadoPor
      case 'tomado': return !!ctx.relaciones.tomadoPor
      default: return Boolean(ctx.hechos[c])
    }
  }
  if ('tipo_trabajo_en' in c) return c.tipo_trabajo_en.includes(String(ctx.hechos.tipoTrabajo))
  if ('parametro' in c) return (ctx.parametros ?? {})[c.parametro] === c.igual
  if ('no' in c) return !evaluarCondicion(c.no, ctx)
  if ('todas' in c) return c.todas.every((x) => evaluarCondicion(x, ctx))
  if ('alguna' in c) return c.alguna.some((x) => evaluarCondicion(x, ctx))
  throw new Error(`Condición desconocida: ${JSON.stringify(c)}`)
}

/** Resuelve un actor condicional a su forma concreta */
function concretarActor(spec: ActorSpec, ctx: ContextoFlujo): ActorSimple | { pool: string } | null {
  if (Array.isArray(spec)) {
    for (const op of spec) {
      if (!op.si || evaluarCondicion(op.si, ctx)) return op.pool ? { pool: op.pool } : (op.actor ?? null)
    }
    return null
  }
  return spec
}

interface Coincidencia { modo: ModoActuacion; enNombreDe?: string | null; bloqueo?: string }

/** Relación personal (solicitante, supervisor, último aprobador): directo, por delegación o por supervisión */
function coincidePersona(objetivo: string | null | undefined, ctx: ContextoFlujo): Coincidencia | null {
  if (!objetivo) return null
  const u = ctx.usuario
  if (u.id === objetivo) return { modo: 'directo' }
  if (ctx.delegantes?.includes(objetivo)) return { modo: 'delegado', enNombreDe: objetivo }
  if (ctx.supervisados?.includes(objetivo)) return { modo: 'supervisor', enNombreDe: objetivo }
  return null
}

export function coincideActor(spec: ActorSpec | undefined, ctx: ContextoFlujo): Coincidencia | null {
  if (!spec) return null
  const actor = concretarActor(spec, ctx)
  if (!actor) return null
  const u = ctx.usuario
  const r = ctx.relaciones
  if (typeof actor === 'object') {
    const rol = actor.pool
    const enAlcance = POOLS_NACIONALES.has(rol) || (r.subregionId != null && u.subregionIds.includes(r.subregionId))
    if (u.roles.includes(rol) && enAlcance) {
      if (r.tomadoPor && r.tomadoPor !== u.id) {
        if (ctx.supervisados?.includes(r.tomadoPor)) return { modo: 'supervisor', enNombreDe: r.tomadoPor }
        return { modo: 'pool', bloqueo: `Lo está trabajando ${r.tomadoPorNombre ?? 'otra persona'}` }
      }
      return { modo: 'pool' }
    }
    // El supervisor de quien lo tomó puede destrabarlo
    if (r.tomadoPor && ctx.supervisados?.includes(r.tomadoPor)) return { modo: 'supervisor', enNombreDe: r.tomadoPor }
    return null
  }
  switch (actor) {
    case 'sistema':
      return null
    case 'contratista':
      if (u.contratistaId != null && u.contratistaId === r.contratistaId && u.roles.includes('contratista_responsable')) {
        return { modo: 'directo' }
      }
      return null
    case 'solicitante':
      return coincidePersona(r.solicitanteId, ctx)
    case 'supervisor_solicitante':
      return coincidePersona(r.supervisorSolicitanteId, ctx)
    case 'ultimo_aprobador':
      return coincidePersona(ctx.hechos.ultimoAprobadorId as string | undefined, ctx)
    case 'gerente': {
      if (!u.roles.includes('gerente')) return null
      // El gerente de la subregión actúa directo; entre gerentes pueden tomarse pendientes (suplencia)
      const propio = r.subregionId != null && u.subregionIds.includes(r.subregionId)
      return { modo: propio ? 'directo' : 'suplencia' }
    }
  }
}

/** Acciones que el usuario puede ejecutar ahora (incluye las bloqueadas, con su motivo) */
export function accionesDisponibles(def: DefinicionFlujo, ctx: ContextoFlujo): AccionDisponible[] {
  const origen = estadoDef(def, ctx.estado)
  const out: AccionDisponible[] = []
  for (const t of def.transiciones) {
    if (!t.desde.includes(ctx.estado)) continue
    if (t.condicion && !evaluarCondicion(t.condicion, ctx)) continue
    const m = coincideActor(t.actor ?? origen.actor, ctx)
    if (!m) continue
    let bloqueo = m.bloqueo
    if (!bloqueo && t.tipo === 'aprobacion' && ctx.aprobadoresPrevios?.includes(ctx.usuario.id)) {
      bloqueo = 'Ya aprobaste un paso anterior de este certificado: lo debe aprobar otra persona'
    }
    out.push({ transicion: t, modo: m.modo, enNombreDe: m.enNombreDe ?? null, bloqueo })
  }
  return out
}

/** Busca una acción ejecutable; lanza error de negocio si no corresponde */
export function exigirAccion(def: DefinicionFlujo, ctx: ContextoFlujo, accion: string): AccionDisponible {
  const disp = accionesDisponibles(def, ctx).filter((a) => a.transicion.accion === accion)
  if (disp.length === 0) {
    throw new ErrorNegocio(`La acción "${accion}" no está disponible en el estado ${estadoDef(def, ctx.estado).etiqueta} para este usuario`)
  }
  const libre = disp.find((d) => !d.bloqueo)
  if (!libre) throw new ErrorNegocio(disp[0].bloqueo!)
  return libre
}

export function resolverDestino(t: TransicionDef, ctx: ContextoFlujo): string {
  const d: Destino = t.hacia
  let destino: string | undefined
  if (typeof d === 'string') destino = d
  else destino = d.find((op) => !op.si || evaluarCondicion(op.si, ctx))?.ir_a
  if (!destino) throw new Error(`Transición ${t.accion} sin destino aplicable`)
  if (destino.startsWith('$')) {
    const v = ctx.hechos[destino.slice(1)]
    if (typeof v !== 'string' || !v) throw new Error(`Destino dinámico ${destino} sin valor`)
    return v
  }
  return destino
}

/** Actor responsable del estado (para mostrar "quién tiene la pelota") */
export function actorDelEstado(def: DefinicionFlujo, estado: string, ctx: Pick<ContextoFlujo, 'hechos' | 'parametros' | 'relaciones' | 'usuario' | 'estado'>) {
  const e = estadoDef(def, estado)
  if (!e.actor) return null
  return concretarActor(e.actor, { ...ctx, estado } as ContextoFlujo)
}

export class ErrorNegocio extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'ErrorNegocio'
  }
}

/** Validación estructural de una definición antes de publicarla */
export function validarDefinicion(def: DefinicionFlujo, piezas: { validaciones: string[]; efectos: string[] }): string[] {
  const errores: string[] = []
  const claves = new Set(def.estados.map((e) => e.clave))
  if (claves.size !== def.estados.length) errores.push('Hay estados duplicados')
  const iniciales = def.estados.filter((e) => e.tipo === 'inicial')
  if (iniciales.length === 0) errores.push('No hay estado inicial')
  const destinos = (t: TransicionDef) => (typeof t.hacia === 'string' ? [t.hacia] : t.hacia.map((h) => h.ir_a))
  for (const t of def.transiciones) {
    for (const d of t.desde) if (!claves.has(d)) errores.push(`${t.accion}: estado de origen inexistente ${d}`)
    for (const d of destinos(t)) if (!d.startsWith('$') && !claves.has(d)) errores.push(`${t.accion}: destino inexistente ${d}`)
    for (const v of t.validaciones ?? []) if (!piezas.validaciones.includes(v)) errores.push(`${t.accion}: validación desconocida ${v}`)
    for (const e of t.efectos ?? []) if (!piezas.efectos.includes(e)) errores.push(`${t.accion}: efecto desconocido ${e}`)
    if (t.motivos && !def.motivos?.[t.motivos]) errores.push(`${t.accion}: lista de motivos inexistente ${t.motivos}`)
  }
  // Alcanzabilidad desde los estados iniciales (los destinos dinámicos vuelven a estados ya visitados)
  const alcanzados = new Set(iniciales.map((e) => e.clave))
  let cambio = true
  while (cambio) {
    cambio = false
    for (const t of def.transiciones) {
      if (!t.desde.some((d) => alcanzados.has(d))) continue
      for (const d of destinos(t)) {
        if (!d.startsWith('$') && !alcanzados.has(d)) { alcanzados.add(d); cambio = true }
      }
    }
  }
  for (const e of def.estados) {
    if (!alcanzados.has(e.clave) && e.tipo !== 'inicial') errores.push(`Estado inalcanzable: ${e.clave}`)
    if (e.tipo !== 'final' && !def.transiciones.some((t) => t.desde.includes(e.clave))) errores.push(`Estado sin salida: ${e.clave}`)
  }
  return errores
}
