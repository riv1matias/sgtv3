import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { leerDefinicionYaml } from './definiciones'
import { accionesDisponibles, exigirAccion, resolverDestino } from './motor'
import type { ContextoFlujo } from './tipos'

const cert = leerDefinicionYaml(path.join(__dirname, '../../../flujos/certificado.v1.yaml'))
const tarea = leerDefinicionYaml(path.join(__dirname, '../../../flujos/tarea.v1.yaml'))

const SOL = 'u-solicitante'
const SUP = 'u-supervisor'
const CONTR = 7

function ctx(estado: string, usuario: Partial<ContextoFlujo['usuario']>, extra: Partial<ContextoFlujo> = {}): ContextoFlujo {
  return {
    estado,
    usuario: { id: 'x', roles: [], subregionIds: [], contratistaId: null, ...usuario },
    relaciones: { solicitanteId: SOL, supervisorSolicitanteId: SUP, contratistaId: CONTR, subregionId: 1, tomadoPor: null, ...(extra.relaciones ?? {}) },
    hechos: { tipoTrabajo: 'mantenimiento', ...(extra.hechos ?? {}) },
    aprobadoresPrevios: extra.aprobadoresPrevios ?? [],
    supervisados: extra.supervisados ?? [],
    delegantes: extra.delegantes ?? [],
  }
}
const acciones = (c: ContextoFlujo, def = cert) => accionesDisponibles(def, c).map((a) => a.transicion.accion)

describe('definiciones', () => {
  it('cargan y validan sin errores', () => {
    expect(cert.estados.length).toBeGreaterThan(10)
    expect(tarea.estados.length).toBeGreaterThan(10)
  })
})

describe('flujo del certificado', () => {
  const contratista = { id: 'u-c', roles: ['contratista_responsable'], contratistaId: CONTR }
  const solicitante = { id: SOL, roles: ['solicitante'], subregionIds: [1] }

  it('el contratista emite desde borrador; otro contratista no', () => {
    expect(acciones(ctx('BORRADOR', contratista))).toContain('emitir')
    expect(acciones(ctx('BORRADOR', { ...contratista, contratistaId: 99 }))).not.toContain('emitir')
  })

  it('un técnico del contratista no puede emitir', () => {
    expect(acciones(ctx('BORRADOR', { id: 'u-t', roles: ['contratista_tecnico'], contratistaId: CONTR }))).toEqual([])
  })

  it('validación técnica: aprueba el solicitante y el destino depende de 2da aprobación y materiales', () => {
    const c = ctx('VAL_TECNICA', solicitante)
    const t = exigirAccion(cert, c, 'aprobar').transicion
    expect(resolverDestino(t, ctx('VAL_TECNICA', solicitante, { hechos: { requiereSegundaAprobacion: true } }))).toBe('APROB_GERENTE')
    expect(resolverDestino(t, ctx('VAL_TECNICA', solicitante, { hechos: { tieneMateriales: true } }))).toBe('VAL_MATERIALES')
    expect(resolverDestino(t, ctx('VAL_TECNICA', solicitante))).toBe('APROB_FINAL')
  })

  it('el contratista retira si nadie lo tomó; si ya lo tomaron, pide retiro', () => {
    expect(acciones(ctx('VAL_TECNICA', contratista))).toEqual(['retirar'])
    expect(acciones(ctx('VAL_TECNICA', contratista, { relaciones: { tomadoPor: SOL } }))).toEqual(['pedir_retiro'])
  })

  it('el supervisor del solicitante puede actuar en su lugar', () => {
    const d = accionesDisponibles(cert, ctx('VAL_TECNICA', { id: SUP, roles: ['supervisor'] }, { supervisados: [SOL] }))
    const aprobar = d.find((a) => a.transicion.accion === 'aprobar')!
    expect(aprobar.modo).toBe('supervisor')
    expect(aprobar.enNombreDe).toBe(SOL)
  })

  it('un delegado actúa en nombre del delegante', () => {
    const d = accionesDisponibles(cert, ctx('VAL_TECNICA', { id: 'u-d', roles: ['solicitante'] }, { delegantes: [SOL] }))
    expect(d.find((a) => a.transicion.accion === 'aprobar')?.modo).toBe('delegado')
  })

  it('nadie aprueba dos pasos del mismo certificado', () => {
    const gerente = { id: SOL, roles: ['gerente', 'solicitante'], subregionIds: [1] }
    const c = ctx('APROB_GERENTE', gerente, { aprobadoresPrevios: [SOL] })
    expect(() => exigirAccion(cert, c, 'aprobar')).toThrow(/otra persona/)
  })

  it('gerente de otra subregión actúa como suplencia', () => {
    const d = accionesDisponibles(cert, ctx('APROB_GERENTE', { id: 'g2', roles: ['gerente'], subregionIds: [5] }))
    expect(d.find((a) => a.transicion.accion === 'aprobar')?.modo).toBe('suplencia')
  })

  it('pool de administración: bloquea si lo tomó otro', () => {
    const adm = { id: 'a1', roles: ['administracion'], subregionIds: [1] }
    expect(acciones(ctx('VAL_MATERIALES', adm))).toEqual(expect.arrayContaining(['aprobar', 'rebotar']))
    const d = accionesDisponibles(cert, ctx('VAL_MATERIALES', adm, { relaciones: { tomadoPor: 'a2', tomadoPorNombre: 'Ana Gómez' } }))
    expect(d[0].bloqueo).toMatch(/Ana Gómez/)
    expect(acciones(ctx('VAL_MATERIALES', { ...adm, subregionIds: [9] }))).toEqual([])
  })

  it('aprobación final: CERCO (nacional) para mantenimiento, Adm. Obra para obras', () => {
    const cerco = { id: 'c1', roles: ['cerco'], subregionIds: [] }
    const admObra = { id: 'o1', roles: ['adm_obra'], subregionIds: [1] }
    expect(acciones(ctx('APROB_FINAL', cerco))).toContain('aprobar')
    expect(acciones(ctx('APROB_FINAL', admObra))).toEqual([])
    const obra = { hechos: { tipoTrabajo: 'obra' } }
    expect(acciones(ctx('APROB_FINAL', admObra, obra))).toContain('aprobar')
    expect(acciones(ctx('APROB_FINAL', cerco, obra))).toEqual([])
  })

  it('rechazo va a revisión y el reenvío vuelve al paso que rechazó', () => {
    const t = exigirAccion(cert, ctx('REVISION_RECHAZO', solicitante), 'reenviar').transicion
    expect(resolverDestino(t, ctx('REVISION_RECHAZO', solicitante, { hechos: { pasoOrigen: 'APROB_FINAL' } }))).toBe('APROB_FINAL')
  })

  it('anular con materiales consumidos deja pendiente la reversa SAP', () => {
    const t = exigirAccion(cert, ctx('REVISION_RECHAZO', solicitante), 'anular').transicion
    expect(resolverDestino(t, ctx('REVISION_RECHAZO', solicitante, { hechos: { tieneConsumoRegistrado: true } }))).toBe('PENDIENTE_REVERSA_SAP')
    expect(resolverDestino(t, ctx('REVISION_RECHAZO', solicitante))).toBe('ANULADO')
  })

  it('el último aprobador puede recuperar su aprobación mientras nadie lo tomó', () => {
    const h = { hechos: { ultimoAprobadorId: SOL, pasoAnterior: 'VAL_TECNICA' } }
    expect(acciones(ctx('VAL_MATERIALES', solicitante, h))).toContain('recuperar_aprobacion')
    expect(acciones(ctx('VAL_MATERIALES', solicitante, { ...h, relaciones: { tomadoPor: 'a1' } }))).not.toContain('recuperar_aprobacion')
  })

  it('las transiciones del sistema no están disponibles para personas', () => {
    expect(acciones(ctx('APROBADO', { id: 'adm', roles: ['administracion', 'cerco', 'admin_sistema'], subregionIds: [1] }))).toEqual([])
  })
})

describe('flujo de la tarea', () => {
  const contratista = { id: 'u-c', roles: ['contratista_responsable'], contratistaId: CONTR }
  const solicitante = { id: SOL, roles: ['solicitante'], subregionIds: [1] }

  it('asignada: el contratista acepta o rechaza; el solicitante puede reasignar o cancelar', () => {
    expect(acciones(ctx('ASIGNADA', contratista), tarea)).toEqual(['aceptar', 'rechazar_tarea'])
    expect(acciones(ctx('ASIGNADA', solicitante), tarea)).toEqual(['reasignar', 'cancelar'])
  })

  it('aceptada: reasignar requiere pedido y liberación del contratista', () => {
    expect(acciones(ctx('ACEPTADA', solicitante), tarea)).toContain('pedir_reasignacion')
    expect(acciones(ctx('ACEPTADA', solicitante), tarea)).not.toContain('reasignar')
    expect(acciones(ctx('PEDIDO_REASIGNACION', contratista), tarea)).toEqual(['liberar', 'no_liberar'])
  })

  it('en ejecución no se reasigna', () => {
    expect(acciones(ctx('EN_EJECUCION', solicitante), tarea)).toEqual(['desestimar'])
  })

  it('rechazar un pedido de cierre vuelve al estado anterior', () => {
    const t = exigirAccion(tarea, ctx('PEDIDO_CIERRE', solicitante), 'rechazar_cierre').transicion
    expect(resolverDestino(t, ctx('PEDIDO_CIERRE', solicitante, { hechos: { estadoAntesPedido: 'EN_ESPERA' } }))).toBe('EN_ESPERA')
  })
})
