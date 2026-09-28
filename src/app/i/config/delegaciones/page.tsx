import { and, asc, eq, ne } from 'drizzle-orm'
import { getDb, schema as s } from '@/db'
import { requerirUsuario } from '@/server/sesion'
import { delegacionesVigentes } from '@/server/servicios/admin'
import { accionDelegar } from '@/app/acciones/gestion'
import { BotonEnviar, Formulario } from '@/components/formulario'
import { Campo, Card, Encabezado, Input, Select, Vacio } from '@/components/ui'
import { formatoFecha, hoy } from '@/lib/fechas'

export const metadata = { title: 'Delegaciones' }

export default async function Delegaciones() {
  const u = await requerirUsuario('interno')
  const [d, colegas] = await Promise.all([
    delegacionesVigentes(u.id, '1900-01-01'),
    getDb().select().from(s.usuarios).where(and(eq(s.usuarios.tipo, 'interno'), ne(s.usuarios.id, u.id), eq(s.usuarios.activo, true))).orderBy(asc(s.usuarios.apellido)),
  ])
  return (
    <>
      <Encabezado titulo="Delegaciones" subtitulo="Si te vas de vacaciones o de licencia, delegá tu bandeja: la otra persona actúa en tu nombre y queda registrado" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card titulo="Delegar mi bandeja">
          <Formulario accion={accionDelegar} className="space-y-3" reiniciar>
            <Campo label="Delegar en"><Select name="aUsuarioId" required>{colegas.map((c) => <option key={c.id} value={c.id}>{c.nombre} {c.apellido} — {c.cargo}</option>)}</Select></Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo label="Desde"><Input type="date" name="desde" defaultValue={hoy()} required /></Campo>
              <Campo label="Hasta"><Input type="date" name="hasta" required /></Campo>
            </div>
            <Campo label="Motivo"><Input name="motivo" placeholder="Vacaciones, licencia…" /></Campo>
            <BotonEnviar>Delegar</BotonEnviar>
          </Formulario>
        </Card>
        <Card titulo="Delegaciones activas">
          {!d.dadas.length && !d.recibidas.length ? <Vacio>No tenés delegaciones activas</Vacio> : (
            <ul className="space-y-3 text-sm">
              {d.dadas.map((x) => (
                <li key={x.d.id} className="flex items-center justify-between gap-2">
                  <span>Delegaste en <b>{x.n} {x.a}</b> del {formatoFecha(x.d.desde)} al {formatoFecha(x.d.hasta)}</span>
                  <Formulario accion={accionDelegar}><input type="hidden" name="op" value="finalizar" /><input type="hidden" name="delegacionId" value={x.d.id} /><BotonEnviar chico estilo="secundario">Finalizar</BotonEnviar></Formulario>
                </li>
              ))}
              {d.recibidas.map((x) => <li key={x.d.id}>Actuás en nombre de <b>{x.n} {x.a}</b> hasta el {formatoFecha(x.d.hasta)}</li>)}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
