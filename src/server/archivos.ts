import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { schema as s, type Tx } from '@/db'
import { ErrorNegocio } from '@/domain/flujo/motor'

/**
 * Almacenamiento de archivos direccionado por contenido (sha256).
 * Driver "local" para desarrollo; en producción se reemplaza por S3/GCS con la misma interfaz.
 */
const MAX_BYTES = 25 * 1024 * 1024

function dir() {
  return path.resolve(process.env.STORAGE_LOCAL_DIR ?? './storage')
}

export async function guardarArchivo(tx: Tx, archivo: File, subidoPor: string, tipo = 'otro') {
  if (!archivo || archivo.size === 0) throw new ErrorNegocio('El archivo está vacío')
  if (archivo.size > MAX_BYTES) throw new ErrorNegocio(`El archivo ${archivo.name} supera el máximo de 25 MB`)
  const buf = Buffer.from(await archivo.arrayBuffer())
  const sha = createHash('sha256').update(buf).digest('hex')
  const key = `${sha.slice(0, 2)}/${sha}`
  const destino = path.join(dir(), key)
  await fs.mkdir(path.dirname(destino), { recursive: true })
  await fs.writeFile(destino, buf, { flag: 'w' })
  const [doc] = await tx.insert(s.documentos).values({
    sha256: sha, nombre: archivo.name.slice(0, 200), mime: archivo.type || null, tamano: archivo.size, storageKey: key, tipo, subidoPor,
  }).returning()
  return doc
}

export async function leerArchivo(storageKey: string): Promise<Buffer> {
  if (storageKey.includes('..')) throw new Error('Clave inválida')
  return fs.readFile(path.join(dir(), storageKey))
}

export function archivosDelForm(fd: FormData, campo: string): File[] {
  return fd.getAll(campo).filter((f): f is File => typeof f === 'object' && f !== null && 'size' in f && (f as File).size > 0)
}
