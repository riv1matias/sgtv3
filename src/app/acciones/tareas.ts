'use server'

import { redirect } from 'next/navigation'
import { requerirUsuario } from '@/server/sesion'
import { crearTarea, ejecutarAccionTarea, cambiarImputacion, cambiarTipoTrabajo, responderCambioTipo, enviarMensaje, agregarBitacora, obtenerTarea } from '@/server/servicios/tareas'
import { archivosDelForm } from '@/server/archivos'
import { ErrorNegocio } from '@/domain/flujo/motor'
import { getDb, schema as s } from '@/db'
import { eq } from 'drizzle-orm'
import { registrarEvento } from '@/server/auditoria'
import { actorDe } from '@/server/usuarios'
import type { EstadoAccion } from '@/components/formulario'
import { ejecutar, numero, texto } from './comun'

export async function accionNuevaTarea(_: EstadoAccion | null, fd: FormData): Promise<EstadoAccion> {
  const u = await requerirUsuario('interno')
  let id: string | null = null
  const r = await ejecutar(async () => {
    const contratistaIds = fd.getAll('contratistaId').map(Number).filter((x) => x > 0)
    const lat = numero(fd, 'lat')
    const lng = numero(fd, 'lng')
    const extra: Record<string, unknown> = {}
    for (const k of ['tipoRed', 'nroActa', 'siniestro', 'ehs', 'proyecto', 'etapa', 'grafo']) if (texto(fd, k)) extra[k] = texto(fd, k)
    if (extra.siniestro && String(extra.siniestro).length !== 12) throw new ErrorNegocio('El número de siniestro debe tener 12 caracteres')
    const t = await crearTarea({
      tipoTrabajo: texto(fd, 'tipoTrabajo') as 'mantenimiento', subtipo: texto(fd, 'subtipo') || null, titulo: texto(fd, 'titulo'),
      descripcion: texto(fd, 'descripcion') || null, direccion: texto(fd, 'direccion') || null,
      lat: lat != null && !isNaN(lat) ? lat : null, lng: lng != null && !isNaN(lng) ? lng : null,
      subregionId: numero(fd, 'subregionId'), contratistaIds, modoSubtareas: texto(fd, 'modoSubtareas') === 'secuencial' ? 'secuencial' : 'simultanea',
      imputacionId: numero(fd, 'imputacionId'), urgencia: fd.get('urgencia') === 'on', urgenciaJustificacion: texto(fd, 'urgenciaJustificacion') || null,
      certificadosPrevistos: numero(fd, 'certificadosPrevistos') ?? 1, fechaTentativa: texto(fd, 'fechaTentativa') || null,
      presupuesto: texto(fd, 'presupuesto') || null, datosExtra: extra, archivos: archivosDelForm(fd, 'archivos'),
    }, u)
    id = t.id
  })
  if (id) redirect(`/i/tareas/${id}?creada=1`)
  return r
}

export async function accionFlujoTarea(_: EstadoAccion | null, fd: FormData): Promise<EstadoAccion> {
  const u = await requerirUsuario()
  return ejecutar(async () => {
    await ejecutarAccionTarea(texto(fd, 'tareaId'), texto(fd, 'accion'), {
      comentario: texto(fd, 'comentario') || null, motivo: texto(fd, 'motivo') || null, contratistaId: numero(fd, 'contratistaId'), lockVersion: numero(fd, 'lockVersion'),
    }, u)
    return 'Listo'
  })
}

export async function accionCambiarImputacion(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario('interno')
  return ejecutar(async () => { await cambiarImputacion(texto(fd, 'tareaId'), Number(texto(fd, 'imputacionId')), texto(fd, 'motivo'), u); return 'Imputación actualizada' })
}

export async function accionCambiarTipo(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario('interno')
  return ejecutar(async () => {
    const r = await cambiarTipoTrabajo(texto(fd, 'tareaId'), texto(fd, 'tipoTrabajo'), texto(fd, 'motivo'), u)
    return r === 'aplicado' ? 'Tipo de trabajo actualizado' : 'Pedido enviado: el contratista debe dar conformidad'
  })
}

export async function accionResponderCambioTipo(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario('contratista')
  return ejecutar(async () => { await responderCambioTipo(texto(fd, 'tareaId'), texto(fd, 'respuesta') === 'si', u) })
}

export async function accionMensaje(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario()
  return ejecutar(async () => { await enviarMensaje(texto(fd, 'tareaId'), texto(fd, 'texto'), u) })
}

export async function accionBitacora(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario('contratista')
  return ejecutar(async () => { await agregarBitacora(texto(fd, 'tareaId'), texto(fd, 'texto') || null, archivosDelForm(fd, 'archivos'), u); return 'Cargado en la bitácora' })
}

/** El responsable del contratista subasigna la tarea a un técnico/cuadrilla de su empresa */
export async function accionSubasignar(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario('contratista')
  return ejecutar(async () => {
    const t = await obtenerTarea(texto(fd, 'tareaId'))
    if (t.contratistaId !== u.contratistaId || !u.roles.includes('contratista_responsable')) throw new ErrorNegocio('No autorizado')
    const tecnicoId = texto(fd, 'tecnicoId') || null
    if (tecnicoId) {
      const [tec] = await getDb().select().from(s.usuarios).where(eq(s.usuarios.id, tecnicoId))
      if (!tec || tec.contratistaId !== u.contratistaId) throw new ErrorNegocio('Técnico inválido')
    }
    const extra = { ...(t.datosExtra as Record<string, unknown>), tecnicoId }
    await getDb().transaction(async (tx) => {
      await tx.update(s.tareas).set({ datosExtra: extra }).where(eq(s.tareas.id, t.id))
      await registrarEvento(tx, actorDe(u, 'contratista'), { entidad: 'tarea', entidadId: t.id, accion: 'subasignar', cambios: { tecnicoId } })
    })
    return tecnicoId ? 'Tarea asignada a la cuadrilla' : 'Asignación quitada'
  })
}
