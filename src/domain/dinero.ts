/**
 * Aritmética decimal exacta (nunca punto flotante) sobre strings como los que devuelve PostgreSQL NUMERIC.
 * Internamente trabaja con BigInt escalado a 8 decimales.
 */

const ESCALA = 8
const F = 10n ** BigInt(ESCALA)

export type Decimal = bigint

export function dec(v: string | number | null | undefined): Decimal {
  if (v == null || v === '') return 0n
  const s = typeof v === 'number' ? v.toFixed(ESCALA) : v.trim().replace(',', '.')
  if (!/^-?\d*(\.\d*)?$/.test(s)) throw new Error(`Número inválido: ${v}`)
  const neg = s.startsWith('-')
  const [ent, frac = ''] = (neg ? s.slice(1) : s).split('.')
  const fracNorm = (frac + '0'.repeat(ESCALA)).slice(0, ESCALA)
  const extra = frac.length > ESCALA ? frac[ESCALA] : '0'
  let n = BigInt(ent || '0') * F + BigInt(fracNorm || '0')
  if (extra >= '5') n += 1n
  return neg ? -n : n
}

/** Multiplica dos decimales */
export function mul(a: Decimal, b: Decimal): Decimal {
  return redondearEscala(a * b, ESCALA)
}

function redondearEscala(n: bigint, digitos: number): bigint {
  const d = 10n ** BigInt(digitos)
  const q = n / d
  const r = n % d
  const mitad = d / 2n
  if (r >= mitad) return q + 1n
  if (r <= -mitad) return q - 1n
  return q
}

/** Redondea a N decimales (mitad hacia arriba, simétrico) */
export function redondear(a: Decimal, decimales = 2): Decimal {
  const d = 10n ** BigInt(ESCALA - decimales)
  return redondearEscala(a, ESCALA - decimales) * d
}

export function suma(xs: Decimal[]): Decimal {
  return xs.reduce((acc, x) => acc + x, 0n)
}

/** Porcentaje: a * p / 100 */
export function porcentaje(a: Decimal, p: Decimal): Decimal {
  return redondearEscala(a * p, ESCALA) / 100n
}

/** Convierte a string con N decimales, apto para columnas NUMERIC */
export function aTexto(a: Decimal, decimales = 2): string {
  const r = redondear(a, decimales)
  const neg = r < 0n
  const abs = neg ? -r : r
  const ent = abs / F
  const frac = (abs % F).toString().padStart(ESCALA, '0').slice(0, decimales)
  return `${neg ? '-' : ''}${ent}${decimales > 0 ? '.' + frac : ''}`
}

export function aNumero(a: Decimal): number {
  return Number(aTexto(a, 6))
}

/** Formato argentino: $ 1.234.567,89 */
export function formatoPesos(v: string | number | Decimal | null | undefined, conSigno = true): string {
  if (v == null) return '—'
  const d = typeof v === 'bigint' ? v : dec(v)
  const [ent, frac] = aTexto(d, 2).split('.')
  const neg = ent.startsWith('-')
  const miles = (neg ? ent.slice(1) : ent).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${neg ? '−' : ''}${conSigno ? '$ ' : ''}${miles},${frac}`
}

/** Formato de cantidades: hasta 4 decimales, sin ceros de más */
export function formatoCantidad(v: string | number | null | undefined): string {
  if (v == null || v === '') return '—'
  const s = aTexto(dec(v), 4).replace(/\.?0+$/, '')
  const [ent, frac] = s.split('.')
  const miles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return frac ? `${miles},${frac}` : miles
}

export function esPositivo(v: string | number | null | undefined): boolean {
  try { return dec(v) > 0n } catch { return false }
}
