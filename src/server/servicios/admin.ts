import { and, eq, gte, lte } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { ErrorNegocio } from '@/domain/flujo/motor'
import { leerKml } from '@/domain/geo'
import { registrarEvento } from '../auditoria'
import { guardarArchivo } from '../archivos'
import { leerDetalleCodigos, leerLibro } from '../excel'
import { notificar } from '../comun'
import { actorDe, tieneRol, type Usuario } from '../usuarios'

function exigir(u: Usuario, ...roles: string[]) {
  if (!tieneRol(u, ...roles)) throw new ErrorNegocio('No tenés permisos para esta operación')
}

/** Carga los polígonos KML de las subregiones operativas (se asocian por nombre o código) */
export async function importarKml(archivo: File, u: Usuario) {
  exigir(u, 'admin_sistema')
  const texto = Buffer.from(await archivo.arrayBuffer()).toString('utf8')
  const polys = leerKml(texto)
  if (!polys.length) throw new ErrorNegocio('El KML no tiene polígonos con nombre')
  return getDb().transaction(async (tx) => {
    const subs = await tx.select().from(s.subregiones)
    const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()
    const asignadas: string[] = []
    const sinMatch: string[] = []
    for (const p of polys) {
      const sub = subs.find((x) => norm(x.nombre) === norm(p.nombre) || norm(x.codigo) === norm(p.nombre))
      if (!sub) { sinMatch.push(p.nombre); continue }
      await tx.update(s.subregiones).set({ poligono: p.poligono }).where(eq(s.subregiones.id, sub.id))
      asignadas.push(sub.nombre)
    }
    const doc = await guardarArchivo(tx, archivo, u.id, 'kml')
    await registrarEvento(tx, actorDe(u, 'admin_sistema'), { entidad: 'organizacion', entidadId: 'kml', accion: 'importar_kml', cambios: { asignadas, sinMatch, documento: doc.id } })
    return { asignadas, sinMatch }
  })
}

export async function crearDelegacion(d: { aUsuarioId: string; desde: string; hasta: string; motivo?: string }, u: Usuario) {
  if (!d.aUsuarioId || d.aUsuarioId === u.id) throw new ErrorNegocio('Elegí a quién delegar')
  if (!d.desde || !d.hasta || d.hasta < d.desde) throw new ErrorNegocio('Revisá las fechas')
  return getDb().transaction(async (tx) => {
    const [a] = await tx.select().from(s.usuarios).where(eq(s.usuarios.id, d.aUsuarioId))
    if (!a || a.tipo !== 'interno') throw new ErrorNegocio('Solo se puede delegar en personal interno')
    const [x] = await tx.insert(s.delegaciones).values({ deUsuarioId: u.id, aUsuarioId: d.aUsuarioId, desde: d.desde, hasta: d.hasta, motivo: d.motivo || null }).returning()
    await tx.update(s.usuarios).set({ noDisponibleHasta: d.hasta }).where(eq(s.usuarios.id, u.id))
    await registrarEvento(tx, actorDe(u), { entidad: 'usuario', entidadId: u.id, accion: 'delegar', cambios: { a: d.aUsuarioId, desde: d.desde, hasta: d.hasta }, comentario: d.motivo ?? null })
    await notificar(tx, [d.aUsuarioId], `${u.nombreCompleto} te delegó su bandeja`, `Del ${d.desde} al ${d.hasta}`, '/i')
    return x
  })
}

export async function finalizarDelegacion(id: number, u: Usuario) {
  return getDb().transaction(async (tx) => {
    const [d] = await tx.select().from(s.delegaciones).where(eq(s.delegaciones.id, id))
    if (!d || (d.deUsuarioId !== u.id && !tieneRol(u, 'admin_sistema'))) throw new ErrorNegocio('No autorizado')
    await tx.update(s.delegaciones).set({ activa: false }).where(eq(s.delegaciones.id, id))
    await tx.update(s.usuarios).set({ noDisponibleHasta: null }).where(eq(s.usuarios.id, d.deUsuarioId))
    await registrarEvento(tx, actorDe(u), { entidad: 'usuario', entidadId: d.deUsuarioId, accion: 'finalizar_delegacion', cambios: { delegacion: id } })
  })
}

export async function delegacionesVigentes(usuarioId: string, hoyStr: string) {
  const db = getDb()
  const [dadas, recibidas] = await Promise.all([
    db.select({ d: s.delegaciones, n: s.usuarios.nombre, a: s.usuarios.apellido }).from(s.delegaciones).innerJoin(s.usuarios, eq(s.usuarios.id, s.delegaciones.aUsuarioId))
      .where(and(eq(s.delegaciones.deUsuarioId, usuarioId), eq(s.delegaciones.activa, true), gte(s.delegaciones.hasta, hoyStr))),
    db.select({ d: s.delegaciones, n: s.usuarios.nombre, a: s.usuarios.apellido }).from(s.delegaciones).innerJoin(s.usuarios, eq(s.usuarios.id, s.delegaciones.deUsuarioId))
      .where(and(eq(s.delegaciones.aUsuarioId, usuarioId), eq(s.delegaciones.activa, true), lte(s.delegaciones.desde, hoyStr), gte(s.delegaciones.hasta, hoyStr))),
  ])
  return { dadas, recibidas }
}

export async function guardarParametro(clave: string, valor: unknown, u: Usuario) {
  exigir(u, 'admin_sistema')
  return getDb().transaction(async (tx) => {
    const [antes] = await tx.select().from(s.parametros).where(eq(s.parametros.clave, clave))
    await tx.insert(s.parametros).values({ clave, valor, updatedAt: new Date() }).onConflictDoUpdate({ target: s.parametros.clave, set: { valor, updatedAt: new Date() } })
    await registrarEvento(tx, actorDe(u, 'admin_sistema'), { entidad: 'parametro', entidadId: clave, accion: 'modificar', cambios: { antes: antes?.valor ?? null, despues: valor } })
  })
}

export async function crearRegla(d: { tipo: string; codigoMoId: number; codigoRelacionadoId?: number | null; parametro?: string | null; mensaje: string }, u: Usuario) {
  exigir(u, 'cerco', 'admin_sistema')
  if (!d.mensaje?.trim()) throw new ErrorNegocio('Escribí el mensaje que verá el validador')
  if (['requiere_codigo_base', 'incompatible'].includes(d.tipo) && !d.codigoRelacionadoId) throw new ErrorNegocio('Elegí el código relacionado')
  return getDb().transaction(async (tx) => {
    const [r] = await tx.insert(s.reglasCodigo).values({ tipo: d.tipo, codigoMoId: d.codigoMoId, codigoRelacionadoId: d.codigoRelacionadoId ?? null, parametro: d.parametro || null, mensaje: d.mensaje.trim(), creadoPor: u.id }).returning()
    await registrarEvento(tx, actorDe(u, 'cerco'), { entidad: 'regla', entidadId: String(r.id), accion: 'crear', cambios: d })
    return r
  })
}

export async function desactivarRegla(id: number, u: Usuario) {
  exigir(u, 'cerco', 'admin_sistema')
  return getDb().transaction(async (tx) => {
    await tx.update(s.reglasCodigo).set({ activa: false }).where(eq(s.reglasCodigo.id, id))
    await registrarEvento(tx, actorDe(u, 'cerco'), { entidad: 'regla', entidadId: String(id), accion: 'desactivar' })
  })
}

/** Atributos de un código de MO que administra Compras/CERCO (2da aprobación, umbral, factura, urgencia) */
export async function actualizarCodigo(id: number, d: { requiereSegundaAprobacion: boolean; requiereFactura: boolean; soloUrgencia: boolean; umbralAlerta: string | null; alcance: string | null }, u: Usuario) {
  exigir(u, 'compras', 'cerco', 'admin_sistema')
  return getDb().transaction(async (tx) => {
    const [antes] = await tx.select().from(s.codigosMo).where(eq(s.codigosMo.id, id))
    if (!antes) throw new ErrorNegocio('Código inexistente')
    await tx.update(s.codigosMo).set({ ...d, umbralAlerta: d.umbralAlerta || null }).where(eq(s.codigosMo.id, id))
    await registrarEvento(tx, actorDe(u), {
      entidad: 'codigo_mo', entidadId: String(id), accion: 'modificar',
      cambios: Object.fromEntries(Object.entries(d).filter(([k, v]) => (antes as Record<string, unknown>)[k] !== v).map(([k, v]) => [k, { antes: (antes as Record<string, unknown>)[k], despues: v }])),
    })
  })
}

/** Administración sube la foto de stock SAP de un contratista (centro + almacenes) */
export async function cargarStock(contratistaId: number, fechaFoto: string, archivos: { proyecto?: File | null; mantenimiento?: File | null }, u: Usuario) {
  exigir(u, 'administracion')
  if (!fechaFoto) throw new ErrorNegocio('Indicá la fecha de la foto de stock')
  return getDb().transaction(async (tx) => {
    const [carga] = await tx.insert(s.stockCargas).values({ contratistaId, fechaFoto, cargadoPor: u.id }).returning()
    const mats = await tx.select({ id: s.materiales.id, cod: s.materiales.codigoSap }).from(s.materiales)
    const porCod = new Map(mats.map((m) => [m.cod, m.id]))
    let filas = 0
    const noEncontrados: string[] = []
    for (const [almacen, f] of Object.entries(archivos)) {
      if (!f?.size) continue
      const hojas = await leerLibro(f)
      const det = leerDetalleCodigos(hojas[0]?.grilla ?? [])
      for (const [cod, cant] of det) {
        const id = porCod.get(cod)
        if (!id) { noEncontrados.push(cod); continue }
        await tx.insert(s.stockItems).values({ cargaId: carga.id, almacen, materialId: id, cantidad: String(cant) }).onConflictDoUpdate({ target: [s.stockItems.cargaId, s.stockItems.almacen, s.stockItems.materialId], set: { cantidad: String(cant) } })
        filas++
      }
      await guardarArchivo(tx, f, u.id, 'stock')
    }
    if (!filas) throw new ErrorNegocio('No se encontraron materiales en los archivos (se esperan columnas de código de material y cantidad)')
    await registrarEvento(tx, actorDe(u, 'administracion'), { entidad: 'contratista', entidadId: String(contratistaId), accion: 'cargar_stock', cambios: { fechaFoto, filas, noEncontrados: noEncontrados.slice(0, 50) } })
    return { filas, noEncontrados }
  })
}
