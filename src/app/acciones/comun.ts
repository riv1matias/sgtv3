import 'server-only'
import { revalidatePath } from 'next/cache'
import { ErrorNegocio } from '@/domain/flujo/motor'
import type { EstadoAccion } from '@/components/formulario'

/** Ejecuta una operación de servicio y convierte los errores de negocio en mensajes para el formulario */
export async function ejecutar(fn: () => Promise<string | void | EstadoAccion>): Promise<EstadoAccion> {
  try {
    const r = await fn()
    revalidatePath('/', 'layout')
    if (r && typeof r === 'object') return { ok: true, ...r }
    return { ok: true, mensaje: typeof r === 'string' ? r : undefined }
  } catch (e) {
    if (e instanceof ErrorNegocio) return { error: e.message }
    // Errores de redirect/notFound de Next deben propagarse
    if (e && typeof e === 'object' && 'digest' in e) throw e
    console.error(e)
    return { error: 'Ocurrió un error inesperado. Se registró para su análisis.' }
  }
}

export const texto = (fd: FormData, k: string) => {
  const v = fd.get(k)
  return typeof v === 'string' ? v.trim() : ''
}
export const numero = (fd: FormData, k: string) => {
  const v = texto(fd, k)
  return v ? Number(v) : null
}
