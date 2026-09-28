import { describe, expect, it } from 'vitest'
import { validarEmision, cuitValido, soloMaterialesCambiaron, type EntradaValidacion, type CodigoInfo } from './validaciones'
import { leerKml, subregionPorPunto } from './geo'
import { hashEvento, verificarCadena, HASH_GENESIS, type EventoHasheable } from './auditoria'
import { leerGrillaLpu, diferenciaLpu } from './lpu'

const codigo = (id: number, extra: Partial<CodigoInfo> = {}): CodigoInfo => ({
  id, codigoS4: String(5000000 + id), descripcion: `Código ${id}`, montoAbierto: false, requiereFactura: false, soloUrgencia: false, umbralAlerta: null, activo: true, ...extra,
})

function entrada(extra: Partial<EntradaValidacion> = {}): EntradaValidacion {
  return {
    items: [{ tipo: 'mo', codigoMoId: 1, cantidad: '10' }],
    codigos: new Map([[1, codigo(1)], [2, codigo(2, { montoAbierto: true })], [3, codigo(3, { montoAbierto: true, requiereFactura: true })], [4, codigo(4, { soloUrgencia: true, umbralAlerta: '100' })]]),
    materiales: new Map([[10, { id: 10, codigoSap: '10100001', descripcion: 'Cable', umbralAlerta: '500', activo: true, recuperable: false }]]),
    reglas: [],
    tarea: { urgencia: false, tipoTrabajo: 'mantenimiento', imputacionId: 1 },
    cabecera: { periodo: '2026-09', fechaEjecDesde: '2026-09-01', fechaEjecHasta: '2026-09-05' },
    cantidadDocumentos: 1,
    tienePrecio: () => true,
    hoy: '2026-09-28',
    antiguedadMaximaDias: 90,
    ...extra,
  }
}

describe('validaciones de emisión', () => {
  it('un certificado completo no tiene bloqueantes', () => {
    expect(validarEmision(entrada()).bloqueantes).toEqual([])
  })
  it('la mano de obra es obligatoria; materiales solos no alcanzan', () => {
    const r = validarEmision(entrada({ items: [{ tipo: 'material', materialId: 10, cantidad: '5' }] }))
    expect(r.bloqueantes.map((b) => b.mensaje).join()).toMatch(/mano de obra/)
  })
  it('exige documentos, imputación y fechas', () => {
    const r = validarEmision(entrada({ cantidadDocumentos: 0, tarea: { urgencia: false, tipoTrabajo: 'obra', imputacionId: null }, cabecera: { periodo: null } }))
    const t = r.bloqueantes.map((b) => b.mensaje).join('|')
    expect(t).toMatch(/documento/)
    expect(t).toMatch(/imputación/)
    expect(t).toMatch(/fechas/)
    expect(t).toMatch(/período/)
  })
  it('monto abierto: importe y justificación; recursos solicitados: factura', () => {
    const r = validarEmision(entrada({ items: [{ tipo: 'mo', codigoMoId: 2, importe: '0' }, { tipo: 'mo', codigoMoId: 3, importe: '1000', justificacion: 'x' }] }))
    const t = r.bloqueantes.map((b) => b.mensaje).join('|')
    expect(t).toMatch(/importe/)
    expect(t).toMatch(/justificación/)
    expect(t).toMatch(/factura/)
  })
  it('alerta si el importe difiere de la factura', () => {
    const r = validarEmision(entrada({ items: [{ tipo: 'mo', codigoMoId: 3, importe: '1000', justificacion: 'x', facturaNumero: 'A-1', facturaCuit: '20-12345678-6', facturaFecha: '2026-09-01', facturaImporte: '900', facturaDocumentoId: 'd' }] }))
    expect(r.bloqueantes).toEqual([])
    expect(r.alertas.map((a) => a.tipo)).toContain('factura_diferente')
  })
  it('código de urgencia solo en tareas urgentes; umbral genera alerta', () => {
    expect(validarEmision(entrada({ items: [{ tipo: 'mo', codigoMoId: 4, cantidad: '5' }] })).bloqueantes).toHaveLength(1)
    const r = validarEmision(entrada({ items: [{ tipo: 'mo', codigoMoId: 4, cantidad: '500' }], tarea: { urgencia: true, tipoTrabajo: 'mantenimiento', imputacionId: 1 } }))
    expect(r.bloqueantes).toEqual([])
    expect(r.alertas[0].tipo).toBe('umbral')
  })
  it('código sin precio en la lista del tipo de trabajo bloquea', () => {
    expect(validarEmision(entrada({ tienePrecio: () => false })).bloqueantes[0].mensaje).toMatch(/no aplica/)
  })
  it('reglas de CERCO: requiere código base, incompatibilidad y máximo por certificado', () => {
    const reglas = [
      { id: 1, tipo: 'requiere_codigo_base', codigoMoId: 2, codigoRelacionadoId: 1, parametro: null, mensaje: 'El 2 va con el 1' },
      { id: 2, tipo: 'maximo_por_certificado', codigoMoId: 2, codigoRelacionadoId: null, parametro: '1', mensaje: 'Máximo uno' },
    ]
    const items = [{ tipo: 'mo' as const, codigoMoId: 2, importe: '10', justificacion: 'x' }, { tipo: 'mo' as const, codigoMoId: 2, importe: '10', justificacion: 'x' }]
    const r = validarEmision(entrada({ items, reglas }))
    expect(r.alertas.map((a) => a.mensaje)).toEqual(['El 2 va con el 1', 'Máximo uno'])
  })
  it('certificado tardío genera alerta', () => {
    const r = validarEmision(entrada({ cabecera: { periodo: '2026-01', fechaEjecDesde: '2026-01-01', fechaEjecHasta: '2026-01-10' } }))
    expect(r.alertas.map((a) => a.tipo)).toContain('tardio')
  })
  it('CUIT', () => {
    expect(cuitValido('20-12345678-6')).toBe(true)
    expect(cuitValido('20-12345678-5')).toBe(false)
  })
  it('detecta si en el rebote solo cambiaron materiales', () => {
    const a = [{ tipo: 'mo' as const, codigoMoId: 1, cantidad: '10' }, { tipo: 'material' as const, materialId: 10, cantidad: '1' }]
    expect(soloMaterialesCambiaron(a, [{ tipo: 'mo', codigoMoId: 1, cantidad: '10.000' }, { tipo: 'material', materialId: 10, cantidad: '3' }])).toBe(true)
    expect(soloMaterialesCambiaron(a, [{ tipo: 'mo', codigoMoId: 1, cantidad: '11' }])).toBe(false)
  })
})

describe('geo', () => {
  const kml = `<kml><Document>
    <Placemark><name>CAP SUR</name><Polygon><outerBoundaryIs><LinearRing><coordinates>
      -58.50,-34.70,0 -58.35,-34.70,0 -58.35,-34.60,0 -58.50,-34.60,0 -58.50,-34.70,0
    </coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>
    <Placemark><name><![CDATA[CAP NORTE]]></name><Polygon><outerBoundaryIs><LinearRing><coordinates>
      -58.50,-34.60 -58.35,-34.60 -58.35,-34.52 -58.50,-34.52 -58.50,-34.60
    </coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>
  </Document></kml>`
  it('lee polígonos de KML y asigna subregión por coordenada', () => {
    const polys = leerKml(kml)
    expect(polys.map((p) => p.nombre)).toEqual(['CAP SUR', 'CAP NORTE'])
    const subs = polys.map((p, i) => ({ id: i + 1, poligono: p.poligono }))
    expect(subregionPorPunto(subs, -34.65, -58.40)?.id).toBe(1)
    expect(subregionPorPunto(subs, -34.55, -58.40)?.id).toBe(2)
    expect(subregionPorPunto(subs, -31.4, -64.18)).toBeNull()
  })
})

describe('auditoría', () => {
  const ev = (accion: string): EventoHasheable => ({
    ocurridoEn: '2026-09-28T10:00:00.000Z', usuarioId: 'u1', usuarioNombre: 'Ana Pérez', rol: 'solicitante', empresa: null, enNombreDe: null,
    entidad: 'certificado', entidadId: 'c1', accion, estadoDesde: 'A', estadoHasta: 'B', cambios: { b: 1, a: [1, 2] }, comentario: null,
  })
  it('la cadena verifica y detecta alteraciones', () => {
    const e1 = ev('emitir')
    const h1 = hashEvento(HASH_GENESIS, e1)
    const e2 = ev('aprobar')
    const h2 = hashEvento(h1, e2)
    const cadena = [{ ...e1, id: 1, hashPrevio: HASH_GENESIS, hash: h1 }, { ...e2, id: 2, hashPrevio: h1, hash: h2 }]
    expect(verificarCadena(cadena).ok).toBe(true)
    const alterada = [cadena[0], { ...cadena[1], comentario: 'cambiado' }]
    expect(verificarCadena(alterada)).toMatchObject({ ok: false, eventoId: 2 })
    expect(verificarCadena([cadena[1]])).toMatchObject({ ok: false, eventoId: 2 })
  })
})

describe('LPU', () => {
  const grilla = [
    [null, 'VIGENCIA', new Date('2049-01-28'), null, new Date('2026-07-01'), null, 'ACTUALIZACION'],
    [null, 0.1251, 54451.475],
    [null, 'Standard \nManuales', 'CÓDIGO', 'Nuevo cod SAP exTeco', 'Nuevo cod SAP exCable', 'S4', 'NUEVA DESCRIPCIÓN', 'UdM', null, 'MANTENIMIENTO', 'OBRAS'],
    [null, 'Mantenimiento', 993300122, 3869, 993300122, 5022316, 'TEND. D/LINGA 3MM P/PSTE.', 'M', null, 615.71, 625.34],
    [null, 'Adicional', 993300999, '(*)', 993300999, 5020982, 'Costo mínimo diario', 'AD', null, 1, 1],
    [null, 'Mantenimiento', 1, 2, 3, 5022316, 'Duplicado', 'M', null, 1, 1],
  ]
  it('lee vigencia, porcentaje, aliases y precios por lista', () => {
    const l = leerGrillaLpu(grilla)
    expect(l.vigencia).toBe('2026-07-01')
    expect(l.porcentaje).toBe('12.5100')
    expect(l.filas).toHaveLength(2)
    expect(l.filas[0]).toMatchObject({ codigoS4: '5022316', unidad: 'M', precioMantenimiento: '615.7100', precioObras: '625.3400' })
    expect(l.filas[0].aliases.map((a) => a.alias)).toEqual(['993300122', '3869'])
    expect(l.errores.join()).toMatch(/duplicado/)
  })
  it('calcula la diferencia contra el catálogo', () => {
    const l = leerGrillaLpu(grilla)
    const d = diferenciaLpu(l,
      [{ codigoS4: '5022316', descripcion: 'TEND. D/LINGA 3MM P/PSTE.', unidad: 'M', activo: true }, { codigoS4: '5099999', descripcion: 'Viejo', unidad: 'UN', activo: true }],
      [{ codigoS4: '5022316', lista: 'mantenimiento', precio: '547.2800' }, { codigoS4: '5022316', lista: 'obras', precio: '625.3400' }])
    expect(d.altas.map((a) => a.codigoS4)).toEqual(['5020982'])
    expect(d.bajas.map((b) => b.codigoS4)).toEqual(['5099999'])
    expect(d.variaciones).toHaveLength(1)
    expect(d.variaciones[0].variacionPct).toBeCloseTo(12.5, 1)
  })
})
