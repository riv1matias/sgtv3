/**
 * Geografía: asignación de subregión por coordenada (polígonos KML) — spec 02.
 * Coordenadas GeoJSON: [lng, lat].
 */

export type Anillo = Array<[number, number]>
export type Poligono = Anillo[]
export interface MultiPoligono { type: 'MultiPolygon'; coordinates: Poligono[] }

function enAnillo(lng: number, lat: number, anillo: Anillo): boolean {
  let dentro = false
  for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
    const [xi, yi] = anillo[i]
    const [xj, yj] = anillo[j]
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro
  }
  return dentro
}

export function puntoEnMultiPoligono(lng: number, lat: number, mp: MultiPoligono | null | undefined): boolean {
  if (!mp?.coordinates) return false
  return mp.coordinates.some(([exterior, ...huecos]) => exterior && enAnillo(lng, lat, exterior) && !huecos.some((h) => enAnillo(lng, lat, h)))
}

/** Devuelve la subregión que contiene el punto; null si no cae en ninguna (el solicitante elige) */
export function subregionPorPunto<T extends { id: number; poligono: unknown }>(subregiones: T[], lat: number, lng: number): T | null {
  return subregiones.find((s) => puntoEnMultiPoligono(lng, lat, s.poligono as MultiPoligono)) ?? null
}

/** Distancia aproximada en metros (haversine) */
export function distanciaMetros(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000
  const rad = (g: number) => (g * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Lee un KML y devuelve un MultiPolygon por cada Placemark (clave: nombre).
 * Soporta Polygon y MultiGeometry con outer/innerBoundaryIs.
 */
export function leerKml(kml: string): Array<{ nombre: string; poligono: MultiPoligono }> {
  const out: Array<{ nombre: string; poligono: MultiPoligono }> = []
  const placemarks = kml.match(/<Placemark[\s\S]*?<\/Placemark>/g) ?? []
  for (const pm of placemarks) {
    const nombre = (pm.match(/<name>([\s\S]*?)<\/name>/)?.[1] ?? '').replace(/<!\[CDATA\[|\]\]>/g, '').trim()
    const poligonos: Poligono[] = []
    for (const pol of pm.match(/<Polygon[\s\S]*?<\/Polygon>/g) ?? []) {
      const anillo = (bloque: string | undefined): Anillo | null => {
        const coords = bloque?.match(/<coordinates>([\s\S]*?)<\/coordinates>/)?.[1]
        if (!coords) return null
        return coords.trim().split(/\s+/).map((t) => t.split(',').map(Number)).filter((p) => p.length >= 2 && !isNaN(p[0]) && !isNaN(p[1]))
          .map((p) => [p[0], p[1]] as [number, number])
      }
      const ext = anillo(pol.match(/<outerBoundaryIs>[\s\S]*?<\/outerBoundaryIs>/)?.[0])
      if (!ext) continue
      const huecos = (pol.match(/<innerBoundaryIs>[\s\S]*?<\/innerBoundaryIs>/g) ?? []).map((b) => anillo(b)).filter(Boolean) as Anillo[]
      poligonos.push([ext, ...huecos])
    }
    if (nombre && poligonos.length) out.push({ nombre, poligono: { type: 'MultiPolygon', coordinates: poligonos } })
  }
  return out
}
