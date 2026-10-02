import { and, desc, eq, inArray } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { ErrorNegocio } from '@/domain/flujo/motor'
import { diferenciaLpu, leerGrillaLpu, type DiferenciaLpu, type FilaLpu, type LecturaLpu } from '@/domain/lpu'
import { hoy } from '@/lib/fechas'
import { registrarEvento } from '../auditoria'
import { guardarArchivo } from '../archivos'
import { leerLibro } from '../excel'
import { actorDe, tieneRol, type Usuario } from '../usuarios'
import { limpiarCachePrecios, lpusPublicadas, revalorizarAbiertos } from './precios'
import { notificar } from '../comun'

export interface ResumenLpu {
  filas: FilaLpu[]
  errores: string[]
  diferencia: DiferenciaLpu
  hoja: string
  porcentaje: string | null
  impacto?: { certificados: number; subtotalAntes: string; subtotalDespues: string }
}

function exigirCompras(u: Usuario) {
  if (!tieneRol(u, 'compras', 'admin_sistema')) throw new ErrorNegocio('Solo Compras puede cargar y publicar la LPU')
}

/** Lee el Excel de Compras y lo compara contra el catálogo y la LPU vigente */
export async function analizarArchivoLpu(archivo: File): Promise<LecturaLpu & { diferencia: DiferenciaLpu }> {
  const hojas = await leerLibro(archivo)
  const orden = [...hojas].sort((a, b) => Number(/maestro|lpu/i.test(b.nombre)) - Number(/maestro|lpu/i.test(a.nombre)))
  let lectura: LecturaLpu | null = null
  for (const h of orden) {
    const l = leerGrillaLpu(h.grilla)
    if (l.filas.length) { lectura = { ...l, hoja: h.nombre }; break }
    lectura ??= { ...l, hoja: h.nombre }
  }
  if (!lectura) throw new ErrorNegocio('El archivo no tiene hojas')
  const db = getDb()
  const codigos = await db.select().from(s.codigosMo)
  const vig = (await lpusPublicadas(db)).filter((l) => l.vigenciaDesde <= hoy()).sort((a, b) => b.vigenciaDesde.localeCompare(a.vigenciaDesde))[0]
  const precios = vig ? await db.select({ codigo: s.codigosMo.codigoS4, lista: s.lpuPrecios.lista, precio: s.lpuPrecios.precio }).from(s.lpuPrecios)
    .innerJoin(s.codigosMo, eq(s.codigosMo.id, s.lpuPrecios.codigoMoId)).where(eq(s.lpuPrecios.lpuId, vig.id)) : []
  const diferencia = diferenciaLpu(lectura, codigos, precios.map((p) => ({ codigoS4: p.codigo, lista: p.lista as 'mantenimiento', precio: p.precio })))
  return { ...lectura, diferencia }
}

/** Guarda la LPU importada como borrador (todavía no afecta a nadie) */
export async function crearBorradorLpu(archivo: File, nombre: string, vigencia: string | null, u: Usuario) {
  exigirCompras(u)
  const a = await analizarArchivoLpu(archivo)
  if (!a.filas.length) throw new ErrorNegocio(a.errores[0] ?? 'No se encontraron códigos en el archivo')
  const vigenciaFinal = vigencia || a.vigencia
  if (!vigenciaFinal) throw new ErrorNegocio('Indicá la fecha de vigencia')
  return getDb().transaction(async (tx) => {
    const doc = await guardarArchivo(tx, archivo, u.id, 'lpu')
    const resumen: ResumenLpu = { filas: a.filas, errores: a.errores, diferencia: a.diferencia, hoja: a.hoja ?? '', porcentaje: a.porcentaje }
    const [l] = await tx.insert(s.lpuVersiones).values({
      nombre: nombre?.trim() || `LPU vigencia ${vigenciaFinal}`, vigenciaDesde: vigenciaFinal, porcentajeInformado: a.porcentaje, estado: 'borrador',
      archivoId: doc.id, creadoPor: u.id, resumen,
    }).returning()
    await registrarEvento(tx, actorDe(u, 'compras'), {
      entidad: 'lpu', entidadId: String(l.id), accion: 'importar', estadoHasta: 'borrador',
      cambios: { archivo: archivo.name, codigos: a.filas.length, altas: a.diferencia.altas.length, bajas: a.diferencia.bajas.length, variaciones: a.diferencia.variaciones.length, vigencia: vigenciaFinal },
    })
    return l
  })
}

/**
 * Publica la LPU: actualiza el catálogo (altas, descripciones, aliases, bajas con reconversión),
 * carga los precios y revaloriza los certificados no cerrados según la política de precios.
 */
export async function publicarLpu(lpuId: number, reconversiones: Record<string, string>, u: Usuario) {
  exigirCompras(u)
  return getDb().transaction(async (tx) => {
    const [l] = await tx.select().from(s.lpuVersiones).where(eq(s.lpuVersiones.id, lpuId)).for('update')
    if (!l) throw new ErrorNegocio('La LPU no existe')
    if (l.estado !== 'borrador') throw new ErrorNegocio('La LPU ya fue publicada')
    const r = l.resumen as ResumenLpu
    const actor = actorDe(u, 'compras')
    const existentes = await tx.select().from(s.codigosMo)
    const porS4 = new Map(existentes.map((c) => [c.codigoS4, c]))
    const nuevos = new Set(r.filas.map((f) => f.codigoS4))
    let altas = 0
    for (const f of r.filas) {
      let c = porS4.get(f.codigoS4)
      const montoAbierto = f.unidad === 'AD'
      if (!c) {
        ;[c] = await tx.insert(s.codigosMo).values({ codigoS4: f.codigoS4, descripcion: f.descripcion, unidad: f.unidad, categoria: f.categoria, montoAbierto, activo: true }).returning()
        porS4.set(c.codigoS4, c)
        altas++
      } else if (c.descripcion !== f.descripcion || c.unidad !== f.unidad || !c.activo || c.categoria !== f.categoria) {
        await tx.update(s.codigosMo).set({ descripcion: f.descripcion, unidad: f.unidad, categoria: f.categoria ?? c.categoria, activo: true, montoAbierto: montoAbierto || c.montoAbierto, reemplazadoPorId: null }).where(eq(s.codigosMo.id, c.id))
      }
      for (const a of f.aliases) await tx.insert(s.codigoMoAlias).values({ codigoMoId: c.id, alias: a.alias, origen: a.origen }).onConflictDoNothing()
      const precios = [
        ...(f.precioMantenimiento && Number(f.precioMantenimiento) > 0 ? [{ lista: 'mantenimiento', precio: f.precioMantenimiento }] : []),
        ...(f.precioObras && Number(f.precioObras) > 0 ? [{ lista: 'obras', precio: f.precioObras }] : []),
      ]
      if (precios.length) await tx.insert(s.lpuPrecios).values(precios.map((p) => ({ lpuId: l.id, codigoMoId: c!.id, lista: p.lista, precio: p.precio })))
    }
    // Bajas: códigos activos que no vienen en la nueva LPU; opcionalmente reconvertidos a otro código
    const bajas = existentes.filter((c) => c.activo && !nuevos.has(c.codigoS4))
    for (const b of bajas) {
      const destino = reconversiones[b.codigoS4] ? porS4.get(reconversiones[b.codigoS4]) : undefined
      await tx.update(s.codigosMo).set({ activo: false, reemplazadoPorId: destino?.id ?? null }).where(eq(s.codigosMo.id, b.id))
    }
    await tx.update(s.lpuVersiones).set({ estado: 'publicada', publicadaAt: new Date(), publicadaPor: u.id }).where(eq(s.lpuVersiones.id, l.id))
    limpiarCachePrecios()
    const revalorizados = await revalorizarAbiertos(tx, l.id, actor, `Publicación de ${l.nombre} (vigencia ${l.vigenciaDesde})`)
    await registrarEvento(tx, actor, {
      entidad: 'lpu', entidadId: String(l.id), accion: 'publicar', estadoDesde: 'borrador', estadoHasta: 'publicada',
      cambios: { altas, bajas: bajas.map((b) => b.codigoS4), reconversiones, revalorizados, vigencia: l.vigenciaDesde },
    })
    // Aviso a todos los responsables de contratistas
    const resp = await tx.select({ id: s.usuarioRoles.usuarioId }).from(s.usuarioRoles).where(eq(s.usuarioRoles.rol, 'contratista_responsable'))
    await notificar(tx, resp.map((x) => x.id), `Nueva LPU publicada: ${l.nombre}`, `Vigencia desde ${l.vigenciaDesde}. ${revalorizados} certificado(s) revalorizados.`, '/c/lpu')
    return { altas, bajas: bajas.length, revalorizados }
  })
}

export async function descartarBorradorLpu(lpuId: number, u: Usuario) {
  exigirCompras(u)
  return getDb().transaction(async (tx) => {
    const [l] = await tx.select().from(s.lpuVersiones).where(eq(s.lpuVersiones.id, lpuId))
    if (!l || l.estado !== 'borrador') throw new ErrorNegocio('Solo se pueden descartar borradores')
    await tx.update(s.lpuVersiones).set({ estado: 'descartada' }).where(eq(s.lpuVersiones.id, l.id))
    await registrarEvento(tx, actorDe(u, 'compras'), { entidad: 'lpu', entidadId: String(l.id), accion: 'descartar', estadoDesde: 'borrador', estadoHasta: 'descartada' })
  })
}

export async function listarLpus() {
  return getDb().select({ l: s.lpuVersiones, nombre: s.usuarios.nombre, apellido: s.usuarios.apellido }).from(s.lpuVersiones)
    .leftJoin(s.usuarios, eq(s.usuarios.id, s.lpuVersiones.creadoPor)).orderBy(desc(s.lpuVersiones.vigenciaDesde), desc(s.lpuVersiones.id))
}

/** Busca códigos de MO por S4, alias, descripción o categoría (solo aplicables al tipo de trabajo si se indica) */
export async function buscarCodigos(q: string, lista?: 'mantenimiento' | 'obras', limite = 20) {
  const db = getDb()
  const texto = q.trim()
  if (!texto) return []
  const vig = (await lpusPublicadas(db)).filter((l) => l.vigenciaDesde <= hoy()).sort((a, b) => b.vigenciaDesde.localeCompare(a.vigenciaDesde))[0]
  const porAlias = await db.select({ id: s.codigoMoAlias.codigoMoId }).from(s.codigoMoAlias).where(eq(s.codigoMoAlias.alias, texto))
  const { sql: sqlf, or, ilike } = await import('drizzle-orm')
  const candidatos = await db.select().from(s.codigosMo).where(and(eq(s.codigosMo.activo, true), or(
    ilike(s.codigosMo.codigoS4, `${texto}%`), ilike(s.codigosMo.descripcion, `%${texto}%`), ilike(s.codigosMo.categoria, `${texto}%`),
    porAlias.length ? inArray(s.codigosMo.id, porAlias.map((a) => a.id)) : sqlf`false`,
  ))).limit(limite * 3)
  const precios = vig && candidatos.length ? await db.select().from(s.lpuPrecios).where(and(eq(s.lpuPrecios.lpuId, vig.id), inArray(s.lpuPrecios.codigoMoId, candidatos.map((c) => c.id)))) : []
  const precioDe = (id: number, l: string) => precios.find((p) => p.codigoMoId === id && p.lista === l)?.precio ?? null
  return candidatos
    .map((c) => ({ ...c, precio: lista ? precioDe(c.id, lista) : null, precioMantenimiento: precioDe(c.id, 'mantenimiento'), precioObras: precioDe(c.id, 'obras') }))
    .filter((c) => !lista || c.montoAbierto || (c.precio != null && Number(c.precio) > 0))
    .slice(0, limite)
}

export async function buscarMateriales(q: string, limite = 20) {
  const texto = q.trim()
  if (!texto) return []
  const { or, ilike } = await import('drizzle-orm')
  return getDb().select().from(s.materiales).where(and(eq(s.materiales.activo, true), or(ilike(s.materiales.codigoSap, `${texto}%`), ilike(s.materiales.descripcion, `%${texto}%`)))).limit(limite)
}
