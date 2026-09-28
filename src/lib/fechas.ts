/** Utilidades de fecha en zona horaria de Argentina */
const TZ = 'America/Argentina/Buenos_Aires'

/** Fecha de hoy en Argentina, YYYY-MM-DD */
export function hoy(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

export function periodoActual(d = new Date()): string {
  return hoy(d).slice(0, 7)
}

export function formatoFecha(v: string | Date | null | undefined): string {
  if (!v) return '—'
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split('-')
    return `${d}/${m}/${y}`
  }
  const d = typeof v === 'string' ? new Date(v) : v
  return new Intl.DateTimeFormat('es-AR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

export function formatoFechaHora(v: string | Date | null | undefined): string {
  if (!v) return '—'
  const d = typeof v === 'string' ? new Date(v) : v
  return new Intl.DateTimeFormat('es-AR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
}

/** "hace 3 días", "hace 5 h" */
export function hace(v: string | Date | null | undefined, ahora = new Date()): string {
  if (!v) return '—'
  const d = typeof v === 'string' ? new Date(v) : v
  const min = Math.floor((ahora.getTime() - d.getTime()) / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const dias = Math.floor(h / 24)
  return `hace ${dias} ${dias === 1 ? 'día' : 'días'}`
}

export function horasDesde(v: string | Date | null | undefined, ahora = new Date()): number {
  if (!v) return 0
  const d = typeof v === 'string' ? new Date(v) : v
  return (ahora.getTime() - d.getTime()) / 3_600_000
}

export function nombrePeriodo(p: string | null | undefined): string {
  if (!p) return '—'
  const [y, m] = p.split('-')
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${meses[Number(m) - 1] ?? m} ${y}`
}
