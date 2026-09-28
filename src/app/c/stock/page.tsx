import { requerirUsuario } from '@/server/sesion'
import { TablaStock } from '@/components/stock'
import { Encabezado } from '@/components/ui'

export const metadata = { title: 'Stock' }

export default async function Stock() {
  const u = await requerirUsuario('contratista')
  return (
    <>
      <Encabezado titulo="Stock de materiales" subtitulo="Material en tu poder según SAP, menos lo que ya certificaste y todavía no se consumió" />
      <TablaStock contratistaId={u.contratistaId ?? -1} />
    </>
  )
}
