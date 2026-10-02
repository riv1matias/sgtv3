'use server'

import { redirect } from 'next/navigation'
import { requerirUsuario } from '@/server/sesion'
import { crearBorradorLpu, publicarLpu, descartarBorradorLpu } from '@/server/servicios/lpu'
import { crearPeriodo, cerrarPeriodo, subirFacturaLiquidacion, crearAjuste } from '@/server/servicios/liquidaciones'
import { importarKml, crearDelegacion, finalizarDelegacion, guardarParametro, crearRegla, desactivarRegla, actualizarCodigo, cargarStock } from '@/server/servicios/admin'
import { archivosDelForm } from '@/server/archivos'
import { procesarVencimientos } from '@/server/servicios/tareas'
import { ErrorNegocio } from '@/domain/flujo/motor'
import type { EstadoAccion } from '@/components/formulario'
import { ejecutar, numero, texto } from './comun'

export async function accionImportarLpu(_: EstadoAccion | null, fd: FormData): Promise<EstadoAccion> {
  const u = await requerirUsuario('interno')
  let id: number | null = null
  const r = await ejecutar(async () => {
    const f = archivosDelForm(fd, 'archivo')[0]
    if (!f) throw new ErrorNegocio('Elegí el archivo Excel de la LPU')
    id = (await crearBorradorLpu(f, texto(fd, 'nombre'), texto(fd, 'vigencia') || null, u)).id
  })
  if (id) redirect(`/i/catalogos/lpu/${id}`)
  return r
}

export async function accionPublicarLpu(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario('interno')
  return ejecutar(async () => {
    const reconv: Record<string, string> = {}
    for (const [k, v] of fd.entries()) if (k.startsWith('reconv_') && typeof v === 'string' && v.trim()) reconv[k.slice(7)] = v.trim()
    const r = await publicarLpu(Number(texto(fd, 'lpuId')), reconv, u)
    return `LPU publicada: ${r.altas} alta(s), ${r.bajas} baja(s), ${r.revalorizados} certificado(s) revalorizado(s)`
  })
}

export async function accionDescartarLpu(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario('interno')
  return ejecutar(async () => { await descartarBorradorLpu(Number(texto(fd, 'lpuId')), u); return 'Borrador descartado' })
}

export async function accionPeriodo(_: EstadoAccion | null, fd: FormData): Promise<EstadoAccion> {
  const u = await requerirUsuario('interno')
  let generadas: number | null = null
  const r = await ejecutar(async () => {
    if (texto(fd, 'op') === 'cerrar') {
      generadas = (await cerrarPeriodo(Number(texto(fd, 'periodoId')), u)).length
      return
    }
    await crearPeriodo(texto(fd, 'nombre'), texto(fd, 'fechaCorte'), u)
    return 'Período creado'
  })
  if (generadas != null) redirect(`/i/liquidaciones?cerrado=${generadas}`)
  return r
}

export async function accionFacturaLiquidacion(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario('contratista')
  return ejecutar(async () => {
    await subirFacturaLiquidacion(Number(texto(fd, 'liquidacionId')), { numero: texto(fd, 'numero'), importe: texto(fd, 'importe'), archivo: archivosDelForm(fd, 'archivo')[0] }, u)
    return 'Factura cargada: la liquidación quedó cerrada'
  })
}

export async function accionAjuste(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario('interno')
  return ejecutar(async () => {
    await crearAjuste({ contratistaId: Number(texto(fd, 'contratistaId')), tipo: texto(fd, 'tipo') as 'debito', importe: texto(fd, 'importe'), motivo: texto(fd, 'motivo'), certificadoId: texto(fd, 'certificadoId') || null, archivo: archivosDelForm(fd, 'archivo')[0] ?? null }, u)
    return 'Ajuste registrado: se aplicará en la próxima liquidación'
  })
}

export async function accionKml(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario('interno')
  return ejecutar(async () => {
    const f = archivosDelForm(fd, 'archivo')[0]
    if (!f) throw new ErrorNegocio('Elegí el archivo KML')
    const r = await importarKml(f, u)
    return `Polígonos asignados: ${r.asignadas.join(', ') || 'ninguno'}${r.sinMatch.length ? `\nSin subregión coincidente: ${r.sinMatch.join(', ')}` : ''}`
  })
}

export async function accionDelegar(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario('interno')
  return ejecutar(async () => {
    if (texto(fd, 'op') === 'finalizar') { await finalizarDelegacion(Number(texto(fd, 'delegacionId')), u); return 'Delegación finalizada' }
    await crearDelegacion({ aUsuarioId: texto(fd, 'aUsuarioId'), desde: texto(fd, 'desde'), hasta: texto(fd, 'hasta'), motivo: texto(fd, 'motivo') }, u)
    return 'Delegación creada'
  })
}

export async function accionParametros(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario('interno')
  return ejecutar(async () => {
    await guardarParametro('politica_precios', { referencia: texto(fd, 'referencia') === 'emision' ? 'emision' : 'cierre', aplicarSubas: fd.get('aplicarSubas') === 'on', aplicarBajas: fd.get('aplicarBajas') === 'on' }, u)
    for (const k of ['antiguedad_maxima_dias', 'horas_aceptacion', 'reenvios_para_escalar', 'radio_duplicados_metros']) {
      const v = numero(fd, k)
      if (v == null || isNaN(v) || v <= 0) throw new ErrorNegocio(`Valor inválido para ${k}`)
      await guardarParametro(k, v, u)
    }
    const iva = texto(fd, 'iva_alicuota')
    if (!/^\d+(\.\d+)?$/.test(iva)) throw new ErrorNegocio('Alícuota de IVA inválida')
    await guardarParametro('iva_alicuota', iva, u)
    return 'Parámetros guardados'
  })
}

export async function accionRegla(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario('interno')
  return ejecutar(async () => {
    if (texto(fd, 'op') === 'desactivar') { await desactivarRegla(Number(texto(fd, 'reglaId')), u); return 'Regla desactivada' }
    await crearRegla({ tipo: texto(fd, 'tipo'), codigoMoId: Number(texto(fd, 'codigoMoId')), codigoRelacionadoId: numero(fd, 'codigoRelacionadoId'), parametro: texto(fd, 'parametro') || null, mensaje: texto(fd, 'mensaje') }, u)
    return 'Regla creada'
  })
}

export async function accionCodigo(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario('interno')
  return ejecutar(async () => {
    await actualizarCodigo(Number(texto(fd, 'codigoId')), {
      requiereSegundaAprobacion: fd.get('requiereSegundaAprobacion') === 'on', requiereFactura: fd.get('requiereFactura') === 'on',
      soloUrgencia: fd.get('soloUrgencia') === 'on', umbralAlerta: texto(fd, 'umbralAlerta') || null, alcance: texto(fd, 'alcance') || null,
    }, u)
    return 'Código actualizado'
  })
}

export async function accionStock(_: EstadoAccion | null, fd: FormData) {
  const u = await requerirUsuario('interno')
  return ejecutar(async () => {
    const r = await cargarStock(Number(texto(fd, 'contratistaId')), texto(fd, 'fechaFoto'), { proyecto: archivosDelForm(fd, 'proyecto')[0], mantenimiento: archivosDelForm(fd, 'mantenimiento')[0] }, u)
    return `Stock cargado: ${r.filas} material(es)${r.noEncontrados.length ? ` · ${r.noEncontrados.length} código(s) no encontrados en el catálogo` : ''}`
  })
}

export async function accionVencimientos(_: EstadoAccion | null, _fd: FormData) {
  await requerirUsuario('interno')
  return ejecutar(async () => `Tareas vencidas devueltas: ${await procesarVencimientos()}`)
}
