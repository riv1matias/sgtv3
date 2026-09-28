import { requerirUsuario, tieneRol } from '@/server/sesion'
import { colaMateriales, maestros } from '@/server/consultas'
import { accionStock } from '@/app/acciones/gestion'
import { TablaCertificados } from '@/components/filas'
import { BotonEnviar, Formulario } from '@/components/formulario'
import { Aviso, Campo, Card, Encabezado, Input, Pestanas, Select } from '@/components/ui'
import { hoy } from '@/lib/fechas'

export const metadata = { title: 'Materiales y SAP' }

export default async function Materiales({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const u = await requerirUsuario('interno')
  if (!tieneRol(u, 'administracion')) return <Aviso tono="alerta">Sección de Administración.</Aviso>
  const tab = (await searchParams).tab ?? 'validacion'
  const [cola, m] = await Promise.all([colaMateriales(u), maestros(u)])
  const contratistas = m.contratistas.filter((c) => m.habilitaciones.some((h) => h.contratistaId === c.id && u.subregionIds.includes(h.subregionId)))
  return (
    <>
      <Encabezado titulo="Materiales y SAP" subtitulo="Validación de materiales, consumo en SAP, rebotes, reversas y stock de contratistas" />
      <Pestanas activa={tab} items={[
        { clave: 'validacion', texto: `Para validar (${cola.validacion.length})`, href: '?tab=validacion' },
        { clave: 'rebotes', texto: `Rebotes en el contratista (${cola.rebotes.length})`, href: '?tab=rebotes' },
        { clave: 'reversas', texto: `Reversas pendientes (${cola.reversas.length})`, href: '?tab=reversas' },
        { clave: 'stock', texto: 'Stock de contratistas', href: '?tab=stock' },
      ]} />
      {tab === 'validacion' && (
        <Card sinPadding>
          <div className="border-b border-slate-100 p-3 text-xs text-slate-500">Para cada certificado: tomalo, descargá el reporte de materiales, consumí en SAP, registrá el documento (el sistema compara con lo declarado) y aprobá o rebotá.</div>
          <TablaCertificados filas={cola.validacion} portal="i" vacio="No hay certificados esperando validación de materiales" />
        </Card>
      )}
      {tab === 'rebotes' && <Card sinPadding><TablaCertificados filas={cola.rebotes} portal="i" vacio="No hay rebotes pendientes" /></Card>}
      {tab === 'reversas' && <Card sinPadding><TablaCertificados filas={cola.reversas} portal="i" vacio="No hay reversas pendientes" /></Card>}
      {tab === 'stock' && (
        <div className="grid gap-5 lg:grid-cols-3">
          <Card titulo="Cargar foto de stock SAP" className="lg:col-span-1">
            <Formulario accion={accionStock} className="space-y-3" reiniciar>
              <Campo label="Contratista"><Select name="contratistaId" required>{contratistas.map((c) => <option key={c.id} value={c.id}>{c.razonSocial} (centro {c.centroSap})</option>)}</Select></Campo>
              <Campo label="Fecha de la foto"><Input type="date" name="fechaFoto" defaultValue={hoy()} required /></Campo>
              <Campo label="Almacén de proyecto (Excel/CSV)" ayuda="Columnas: código de material y cantidad"><Input type="file" name="proyecto" accept=".xlsx,.csv" /></Campo>
              <Campo label="Almacén de mantenimiento (Excel/CSV)"><Input type="file" name="mantenimiento" accept=".xlsx,.csv" /></Campo>
              <BotonEnviar>Cargar stock</BotonEnviar>
            </Formulario>
          </Card>
          <div className="lg:col-span-2"><Aviso tono="info">El contratista ve su stock proyectado en su portal. La foto queda con fecha para que sepa de cuándo es.</Aviso></div>
        </div>
      )}
    </>
  )
}
