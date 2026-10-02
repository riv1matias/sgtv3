import { describe, expect, it } from 'vitest'
import { aTexto, dec, formatoCantidad, formatoPesos, mul, redondear } from './dinero'
import { conIva, fechaReferencia, lpuVigente, precioSegunPolitica, valorizar, POLITICA_DEFECTO } from './precios'

describe('dinero', () => {
  it('opera sin errores de punto flotante', () => {
    expect(aTexto(dec('0.1') + dec('0.2'))).toBe('0.30')
    expect(aTexto(redondear(mul(dec('120'), dec('625.34'))))).toBe('75040.80')
    expect(aTexto(redondear(mul(dec('3.333'), dec('1.005'))))).toBe('3.35')
    expect(aTexto(redondear(dec('2.345')))).toBe('2.35')
    expect(aTexto(redondear(dec('-2.345')))).toBe('-2.35')
  })
  it('formatea en pesos argentinos', () => {
    expect(formatoPesos('1234567.891')).toBe('$ 1.234.567,89')
    expect(formatoPesos('-50')).toBe('−$ 50,00'.replace('−$ ', '−$ '))
    expect(formatoCantidad('1200.5000')).toBe('1.200,5')
  })
})

describe('LPU vigente', () => {
  const lpus = [
    { id: 1, vigenciaDesde: '2025-06-01', estado: 'publicada' },
    { id: 2, vigenciaDesde: '2026-07-01', estado: 'publicada' },
    { id: 3, vigenciaDesde: '2026-10-01', estado: 'borrador' },
  ]
  it('manda la fecha de vigencia y se ignoran borradores', () => {
    expect(lpuVigente(lpus, '2026-06-30')?.id).toBe(1)
    expect(lpuVigente(lpus, '2026-07-01')?.id).toBe(2)
    expect(lpuVigente(lpus, '2026-12-01')?.id).toBe(2)
    expect(lpuVigente(lpus, '2020-01-01')).toBeNull()
  })
  it('una LPU retroactiva (publicada después, vigente antes) gana por vigencia', () => {
    const con = [...lpus, { id: 4, vigenciaDesde: '2026-08-01', estado: 'publicada' }]
    expect(lpuVigente(con, '2026-08-15')?.id).toBe(4)
  })
})

describe('política de precios', () => {
  it('fecha de referencia según política y precio forzado', () => {
    expect(fechaReferencia({ ...POLITICA_DEFECTO, referencia: 'cierre' }, '2026-07-10', '2026-09-20')).toBe('2026-09-20')
    expect(fechaReferencia({ ...POLITICA_DEFECTO, referencia: 'emision' }, '2026-07-10', '2026-09-20')).toBe('2026-07-10')
    expect(fechaReferencia({ ...POLITICA_DEFECTO, referencia: 'cierre' }, '2026-07-10', '2026-09-20', 'emision')).toBe('2026-07-10')
  })
  it('subas y bajas configurables', () => {
    const base = dec('100')
    expect(aTexto(precioSegunPolitica({ referencia: 'cierre', aplicarSubas: true, aplicarBajas: false }, base, dec('110')))).toBe('110.00')
    expect(aTexto(precioSegunPolitica({ referencia: 'cierre', aplicarSubas: true, aplicarBajas: false }, base, dec('90')))).toBe('100.00')
    expect(aTexto(precioSegunPolitica({ referencia: 'cierre', aplicarSubas: false, aplicarBajas: true }, base, dec('110')))).toBe('100.00')
    expect(aTexto(precioSegunPolitica({ referencia: 'cierre', aplicarSubas: true, aplicarBajas: true }, base, dec('90')))).toBe('90.00')
  })
})

describe('valorización', () => {
  const precios: Record<number, string> = { 1: '625.34', 2: '1212.04' }
  it('calcula subtotal, IVA 21% y total; montos abiertos por importe', () => {
    const v = valorizar(
      [
        { tipo: 'mo', codigoMoId: 1, cantidad: '120' },
        { tipo: 'mo', codigoMoId: 2, cantidad: '10.5' },
        { tipo: 'mo', codigoMoId: 9, cantidad: '1', montoAbierto: true, importe: '150000' },
        { tipo: 'material', cantidad: '5' },
      ],
      (id) => precios[id] ?? null,
    )
    expect(v.lineas.map((l) => l.subtotal)).toEqual(['75040.80', '12726.42', '150000.00', '0.00'])
    expect(v.subtotal).toBe('237767.22')
    expect(v.iva).toBe('49931.12')
    expect(v.total).toBe('287698.34')
  })
  it('informa códigos sin precio en la lista', () => {
    expect(valorizar([{ tipo: 'mo', codigoMoId: 5, cantidad: '1' }], () => null).sinPrecio).toEqual([5])
  })
  it('respeta la política respecto del precio de emisión', () => {
    const v = valorizar([{ tipo: 'mo', codigoMoId: 1, cantidad: '10' }], () => '50', {
      politica: { referencia: 'cierre', aplicarSubas: true, aplicarBajas: false },
      precioEmisionDe: () => '60',
    })
    expect(v.subtotal).toBe('600.00')
  })
  it('IVA sobre subtotal', () => {
    expect(conIva('1000')).toEqual({ subtotal: '1000.00', iva: '210.00', total: '1210.00' })
  })
})
