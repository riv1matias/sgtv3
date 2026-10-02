'use server'

import { redirect } from 'next/navigation'
import { requerirUsuario } from '@/server/sesion'
import {
  crearCertificado, guardarBorrador, adjuntarDocumentos, quitarDocumento, importarDeBitacora, ejecutarAccionCertificado,
  tomarCertificado, soltarCertificado, registrarDocumentoSap, resolverAlerta, subirFacturaTercero, type Borrador,
} from '@/server/servicios/certificados'
import { archivosDelForm } from '@/server/archivos'
import { ErrorNegocio } from '@/domain/flujo/motor'
import type { EstadoAccion } from '@/components/formulario'
import { ejecutar, numero, texto } from './comun'

export async function accionCrearCertificado(_: EstadoAccion | null, fd: FormData): Promise<EstadoAccion> {
  const u = await requerirUsuario('contratista')
  let id: string | null = null
  const r = await ejecutar(async () => { id = (await crearCertificado(texto(fd, 'tareaId'), u)).id })
  if (id) redirect(`/c/certificados/${id}`)
  return r
}

/** Guarda el borrador (el editor envía los ítems como JSON) */
export async function accionGuardarBorrador(certId: string, borrador: Borrador): Promise<EstadoAccion> {
  const u = await requerirUsuario('contratista')
  return ejecutar(async () => {
    const v = await guardarBorrador(certId, borrador, u)
    return { mensaje: 'Borrador guardado', datos: v }
  })
}

export async function accionAdjuntar(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario('contratista')
  return ejecutar(async () => { await adjuntarDocumentos(texto(fd, 'certificadoId'), archivosDelForm(fd, 'archivos'), texto(fd, 'tipo') || 'auto', u); return 'Documentos adjuntados' })
}

export async function accionQuitarDocumento(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario('contratista')
  return ejecutar(async () => { await quitarDocumento(texto(fd, 'certificadoId'), texto(fd, 'documentoId'), u) })
}

export async function accionImportarBitacora(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario('contratista')
  return ejecutar(async () => {
    const ids = fd.getAll('documentoId').map(String)
    if (!ids.length) throw new ErrorNegocio('Elegí al menos una foto de la bitácora')
    await importarDeBitacora(texto(fd, 'certificadoId'), ids, u)
    return `${ids.length} archivo(s) agregados desde la bitácora`
  })
}

export async function accionFacturaTercero(fd: FormData): Promise<EstadoAccion> {
  const u = await requerirUsuario('contratista')
  return ejecutar(async () => {
    const f = archivosDelForm(fd, 'archivo')[0]
    if (!f) throw new ErrorNegocio('Elegí el archivo de la factura')
    const id = await subirFacturaTercero(texto(fd, 'certificadoId'), f, u)
    return { mensaje: 'Factura adjuntada', datos: { documentoId: id, nombre: f.name } }
  })
}

export async function accionFlujoCertificado(_: EstadoAccion | null, fd: FormData): Promise<EstadoAccion> {
  const u = await requerirUsuario()
  return ejecutar(async () => {
    const obs = fd.getAll('obsItemId').map((id) => ({ itemId: Number(id), comentario: texto(fd, `obsItem_${id}`) })).filter((o) => o.comentario)
    const reversa = texto(fd, 'reversaNumero') ? { numeroDocumento: texto(fd, 'reversaNumero'), fecha: texto(fd, 'reversaFecha'), archivo: archivosDelForm(fd, 'reversaArchivo')[0] ?? null } : undefined
    await ejecutarAccionCertificado(texto(fd, 'certificadoId'), texto(fd, 'accion'), {
      comentario: texto(fd, 'comentario') || null, motivo: texto(fd, 'motivo') || null, lockVersion: numero(fd, 'lockVersion'), observacionesItems: obs, reversa,
    }, u)
    return 'Listo'
  })
}

export async function accionTomar(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario('interno')
  return ejecutar(async () => {
    if (texto(fd, 'op') === 'soltar') await soltarCertificado(texto(fd, 'certificadoId'), u)
    else await tomarCertificado(texto(fd, 'certificadoId'), u)
  })
}

export async function accionDocumentoSap(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario('interno')
  return ejecutar(async () => {
    const r = await registrarDocumentoSap(texto(fd, 'certificadoId'), {
      tipo: texto(fd, 'tipo') as 'consumo', numeroDocumento: texto(fd, 'numeroDocumento'), fecha: texto(fd, 'fecha'), archivo: archivosDelForm(fd, 'archivo')[0] ?? null,
    }, u)
    if (!r.conDetalle) return 'Documento registrado (sin detalle legible para comparar)'
    return r.diferencias ? `Documento registrado: se detectaron ${r.diferencias} diferencia(s) — revisá las alertas` : 'Documento registrado: coincide con lo declarado por el contratista'
  })
}

export async function accionResolverAlerta(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario('interno')
  return ejecutar(async () => { await resolverAlerta(Number(texto(fd, 'alertaId')), texto(fd, 'resolucion'), u); return 'Alerta resuelta' })
}
