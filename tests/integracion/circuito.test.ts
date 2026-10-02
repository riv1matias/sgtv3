import { beforeAll, describe, expect, it } from 'vitest'
import { and, eq, sql } from 'drizzle-orm'
import { prepararBase } from './preparar'

// Los módulos se importan después de apuntar DATABASE_URL a la base de pruebas
let db: Awaited<typeof import('@/db')>['getDb'] extends () => infer R ? R : never
let s: typeof import('@/db')['schema']
let T: typeof import('@/server/servicios/tareas')
let C: typeof import('@/server/servicios/certificados')
let L: typeof import('@/server/servicios/liquidaciones')
let P: typeof import('@/server/servicios/precios')
let usuarios: typeof import('@/server/usuarios')
let auditoria: typeof import('@/server/auditoria')

const u = async (email: string) => {
  const [x] = await db.select().from(s.usuarios).where(eq(s.usuarios.email, `${email}@demo.local`))
  return (await usuarios.cargarUsuario(x.id))!
}
const cert = async (numero: string) => (await db.select().from(s.certificados).where(eq(s.certificados.numero, numero)))[0]

beforeAll(async () => {
  await prepararBase()
  const m = await import('@/db')
  db = m.getDb()
  s = m.schema
  T = await import('@/server/servicios/tareas')
  C = await import('@/server/servicios/certificados')
  L = await import('@/server/servicios/liquidaciones')
  P = await import('@/server/servicios/precios')
  usuarios = await import('@/server/usuarios')
  auditoria = await import('@/server/auditoria')
}, 120_000)

describe('seguridad y reglas de actuación', () => {
  it('un contratista no puede actuar sobre la tarea de otro contratista', async () => {
    const [t] = await db.select().from(s.tareas).where(eq(s.tareas.numero, 'T-AMBA-000001'))
    const otro = await u('cds.admin')
    await expect(T.ejecutarAccionTarea(t.id, 'aceptar', {}, otro)).rejects.toThrow(/no está disponible/)
    await expect(C.crearCertificado(t.id, otro)).rejects.toThrow(/responsable del contratista asignado/)
  })

  it('un técnico del contratista no puede emitir certificados', async () => {
    const c = await cert('CERT-2026-000006')
    await expect(C.ejecutarAccionCertificado(c.id, 'emitir', {}, await u('rdp.tecnico'))).rejects.toThrow()
  })

  it('nadie aprueba dos pasos del mismo certificado', async () => {
    // El gerente Carla también figura como solicitante en un certificado nuevo: se simula que ya aprobó la validación técnica
    const c = await cert('CERT-2026-000002') // en APROB_GERENTE, aprobado por Diego
    const diego = await u('diego.romero')
    await db.insert(s.usuarioRoles).values({ usuarioId: diego.id, rol: 'gerente' }).onConflictDoNothing()
    await expect(C.ejecutarAccionCertificado(c.id, 'aprobar', {}, (await usuarios.cargarUsuario(diego.id))!)).rejects.toThrow(/otra persona/)
    await db.delete(s.usuarioRoles).where(and(eq(s.usuarioRoles.usuarioId, diego.id), eq(s.usuarioRoles.rol, 'gerente')))
  })

  it('la validación técnica exige resolver las alertas antes de aprobar', async () => {
    const c = await cert('CERT-2026-000001')
    const lucia = await u('lucia.fernandez')
    await expect(C.ejecutarAccionCertificado(c.id, 'aprobar', {}, lucia)).rejects.toThrow(/alerta/)
    for (const a of await db.select().from(s.alertas).where(and(eq(s.alertas.entidadId, c.id), eq(s.alertas.estado, 'abierta')))) {
      await C.resolverAlerta(a.id, 'Verificado: se retiró red de 6 manzanas', lucia)
    }
    await expect(C.ejecutarAccionCertificado(c.id, 'aprobar', {}, lucia)).resolves.toBe('VAL_MATERIALES')
  })

  it('control de concurrencia: una acción con versión vieja se rechaza', async () => {
    const c = await cert('CERT-2026-000004')
    await expect(C.ejecutarAccionCertificado(c.id, 'aprobar', { lockVersion: c.lockVersion - 1 }, await u('valeria.ruiz'))).rejects.toThrow(/cambió/)
  })
})

describe('materiales y SAP', () => {
  it('rebote: el contratista solo puede corregir materiales y vuelve directo a Administración', async () => {
    const c = await cert('CERT-2026-000003') // VAL_MATERIALES
    const sofia = await u('sofia.acosta')
    const rdp = await u('rdp.admin')
    await C.ejecutarAccionCertificado(c.id, 'rebotar', { motivo: 'Material sin stock en SAP', comentario: 'No hay morsas en el almacén M101' }, sofia)
    const rebotado = await cert('CERT-2026-000003')
    expect(rebotado.estado).toBe('REBOTE_MATERIALES')
    expect(rebotado.versionActual).toBe(2)
    // Intento de cambiar la MO: se ignora (la MO se conserva)
    const items = await db.select().from(s.certificadoItems).where(and(eq(s.certificadoItems.certificadoId, c.id), eq(s.certificadoItems.version, 2)))
    const [morsa] = await db.select().from(s.materiales).where(eq(s.materiales.codigoSap, '10300001'))
    const nuevos = items.map((i) => ({ tipo: i.tipo as 'mo', codigoMoId: i.codigoMoId, materialId: i.materialId, cantidad: i.tipo === 'mo' ? '9999' : i.materialId === morsa.id ? '10' : i.cantidad }))
    await C.guardarBorrador(c.id, { periodo: '2026-09', fechaEjecDesde: '2026-09-10', fechaEjecHasta: '2026-09-12', items: nuevos }, rdp)
    const mo = await db.select().from(s.certificadoItems).where(and(eq(s.certificadoItems.certificadoId, c.id), eq(s.certificadoItems.version, 2), eq(s.certificadoItems.tipo, 'mo')))
    expect(mo.every((m) => m.cantidad !== '9999.0000')).toBe(true)
    await C.ejecutarAccionCertificado(c.id, 'responder_rebote', { comentario: 'Se usaron 10 morsas del stock propio' }, rdp)
    expect((await cert('CERT-2026-000003')).estado).toBe('VAL_MATERIALES')
    // La aprobación técnica anterior sigue vigente (la MO no cambió)
    const vig = await db.select().from(s.aprobaciones).where(and(eq(s.aprobaciones.certificadoId, c.id), eq(s.aprobaciones.vigente, true), eq(s.aprobaciones.accion, 'aprobar')))
    expect(vig).toHaveLength(1)
  })

  it('el consumo SAP se compara con lo declarado y las diferencias generan alertas', async () => {
    const c = await cert('CERT-2026-000003')
    const sofia = await u('sofia.acosta')
    const archivo = new File(['Material;Cantidad\n10100001;850\n10200001;2\n10300001;8\n'], 'consumo.csv', { type: 'text/csv' })
    const r = await C.registrarDocumentoSap(c.id, { tipo: 'consumo', numeroDocumento: '4900999001', fecha: '2026-09-25', archivo }, sofia)
    expect(r).toEqual({ diferencias: 1, conDetalle: true })
    await expect(C.ejecutarAccionCertificado(c.id, 'aprobar', {}, sofia)).rejects.toThrow(/alerta/)
  })

  it('anular un certificado con consumo registrado deja pendiente la reversa SAP', async () => {
    const c = await cert('CERT-2026-000003')
    const sofia = await u('sofia.acosta')
    for (const a of await db.select().from(s.alertas).where(and(eq(s.alertas.entidadId, c.id), eq(s.alertas.estado, 'abierta')))) await C.resolverAlerta(a.id, 'Ok', sofia)
    await C.ejecutarAccionCertificado(c.id, 'aprobar', {}, sofia)
    await C.ejecutarAccionCertificado(c.id, 'rechazar', { motivo: 'Otro', comentario: 'El trabajo se duplica con otra OT' }, await u('valeria.ruiz'))
    await C.ejecutarAccionCertificado(c.id, 'anular', { comentario: 'Se anula: duplicado' }, await u('diego.romero'))
    expect((await cert('CERT-2026-000003')).estado).toBe('PENDIENTE_REVERSA_SAP')
    await expect(C.ejecutarAccionCertificado(c.id, 'registrar_reversa', {}, sofia)).rejects.toThrow(/reversa/)
    await C.ejecutarAccionCertificado(c.id, 'registrar_reversa', { reversa: { numeroDocumento: '4900999002', fecha: '2026-09-26' } }, sofia)
    expect((await cert('CERT-2026-000003')).estado).toBe('ANULADO_REVERTIDO')
  })
})

describe('precios y liquidación', () => {
  it('publicar una LPU revaloriza los certificados abiertos según la política', async () => {
    const c = await cert('CERT-2026-000004') // APROB_FINAL, subtotal con LPU de septiembre
    const antes = Number(c.subtotalActual)
    const compras = await u('gustavo.ibanez')
    const [lpu] = await db.insert(s.lpuVersiones).values({ nombre: 'LPU test +10%', vigenciaDesde: '2026-09-15', estado: 'publicada', creadoPor: compras.id }).returning()
    await db.execute(sql`insert into lpu_precios (lpu_id, codigo_mo_id, lista, precio)
      select ${lpu.id}, codigo_mo_id, lista, round(precio * 1.10, 4) from lpu_precios where lpu_id = (select id from lpu_versiones where nombre = 'LPU septiembre 2026')`)
    P.limpiarCachePrecios()
    const n = await db.transaction((tx) => P.revalorizarAbiertos(tx, lpu.id, auditoria.SISTEMA, 'test'))
    expect(n).toBeGreaterThan(0)
    const despues = Number((await cert('CERT-2026-000004')).subtotalActual)
    expect(despues).toBeCloseTo(antes * 1.1, 0)
    const [rev] = await db.select().from(s.revalorizaciones).where(eq(s.revalorizaciones.certificadoId, c.id))
    expect(Number(rev.subtotalNuevo)).toBe(despues)
    // El importe a la primera emisión no cambia
    expect((await cert('CERT-2026-000004')).subtotalEmision).toBe(c.subtotalEmision)
  })

  it('con la política por defecto una baja de precio no se aplica', async () => {
    const c = await cert('CERT-2026-000004')
    const [lpu] = await db.insert(s.lpuVersiones).values({ nombre: 'LPU test -50%', vigenciaDesde: '2026-09-20', estado: 'publicada' }).returning()
    await db.execute(sql`insert into lpu_precios (lpu_id, codigo_mo_id, lista, precio)
      select ${lpu.id}, codigo_mo_id, lista, round(precio * 0.5, 4) from lpu_precios where lpu_id = (select id from lpu_versiones where nombre = 'LPU septiembre 2026')`)
    P.limpiarCachePrecios()
    await db.transaction((tx) => P.revalorizarAbiertos(tx, lpu.id, auditoria.SISTEMA, 'test'))
    // Nunca baja del precio de emisión (subtotal de emisión)
    expect(Number((await cert('CERT-2026-000004')).subtotalActual)).toBeGreaterThanOrEqual(Number(c.subtotalEmision))
  })

  it('cerrar el período congela precios, aplica ajustes y la factura cierra los certificados', async () => {
    const c = await cert('CERT-2026-000004')
    await C.ejecutarAccionCertificado(c.id, 'aprobar', {}, await u('valeria.ruiz'))
    const jorge = await u('jorge.castro')
    const [p] = await db.select().from(s.periodos).where(eq(s.periodos.nombre, '2026-10'))
    const liqs = await L.cerrarPeriodo(p.id, jorge)
    const congelado = await cert('CERT-2026-000004')
    expect(congelado.estado).toBe('EN_LIQUIDACION')
    expect(congelado.subtotalFinal).not.toBeNull()
    const liq = liqs.find((l) => l.contratistaId === congelado.contratistaId)!
    expect(Number(liq.ajustes)).toBe(-45000)
    await expect(L.cerrarPeriodo(p.id, jorge)).rejects.toThrow(/cerrado/)
    const factura = new File(['%PDF-1.4'], 'factura.pdf', { type: 'application/pdf' })
    await L.subirFacturaLiquidacion(liq.id, { numero: 'A-0001-1', importe: '1', archivo: factura }, await u('cds.admin'))
    expect((await cert('CERT-2026-000004')).estado).toBe('CERRADO')
    // Factura con importe distinto: advertencia, no bloqueo
    const [alerta] = await db.select().from(s.alertas).where(and(eq(s.alertas.entidad, 'liquidacion'), eq(s.alertas.entidadId, String(liq.id))))
    expect(alerta.tipo).toBe('factura_diferente')
  })
})

describe('auditoría inmutable', () => {
  it('la base rechaza modificar o borrar eventos y la cadena verifica', async () => {
    await expect(db.execute(sql`update eventos set comentario = 'x' where id = 1`)).rejects.toThrow()
    await expect(db.execute(sql`delete from eventos where id = 1`)).rejects.toThrow()
    const v = await auditoria.verificarAuditoria()
    expect(v.ok).toBe(true)
  })

  it('cada transición queda registrada con nombre, rol y estados', async () => {
    const c = await cert('CERT-2026-000004')
    const ev = await auditoria.eventosDe('certificado', c.id)
    const aprob = ev.find((e) => e.accion === 'aprobar' && e.estadoHasta === 'APROBADO')!
    expect(aprob.usuarioNombre).toBe('Valeria Ruiz')
    expect(aprob.rol).toBe('cerco')
    expect(aprob.estadoDesde).toBe('APROB_FINAL')
  })
})
