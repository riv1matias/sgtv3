'use client'

import { useActionState, useMemo, useState } from 'react'
import { accionNuevaTarea } from '@/app/acciones/tareas'
import { BotonEnviar } from '@/components/formulario'
import { Campo, Card, Input, Select, Textarea } from '@/components/ui'
import { subregionPorPunto } from '@/domain/geo'
import { SUBTIPOS, TIPOS_IMPUTACION, TIPOS_RED, TIPOS_TRABAJO } from '@/lib/etiquetas'

interface Props {
  subregiones: Array<{ id: number; nombre: string; region: string; poligono: unknown }>
  contratistas: Array<{ id: number; razonSocial: string; subregiones: number[] }>
  imputaciones: Array<{ id: number; tipo: string; numero: string; descripcion: string | null }>
}

export function FormNuevaTarea({ subregiones, contratistas, imputaciones }: Props) {
  const [estado, enviar] = useActionState(accionNuevaTarea, null)
  const [tipo, setTipo] = useState('mantenimiento')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [subElegida, setSubElegida] = useState('')
  const [urgencia, setUrgencia] = useState(false)
  const [elegidos, setElegidos] = useState<string[]>([''])

  const detectada = useMemo(() => {
    const la = Number(lat.replace(',', '.'))
    const ln = Number(lng.replace(',', '.'))
    if (!lat || !lng || isNaN(la) || isNaN(ln)) return null
    return subregionPorPunto(subregiones, la, ln)
  }, [lat, lng, subregiones])
  const subregionId = detectada?.id ?? (subElegida ? Number(subElegida) : null)
  const habilitados = contratistas.filter((c) => subregionId != null && c.subregiones.includes(subregionId))
  const imps = imputaciones.filter((i) => i.tipo === 'oc' || (tipo === 'obra' ? i.tipo === 'pep' : i.tipo === 'wo'))

  const pegarCoordenadas = (v: string) => {
    const m = v.match(/(-?\d+[.,]\d+)\s*[,;\s]\s*(-?\d+[.,]\d+)/)
    if (m) { setLat(m[1].replace(',', '.')); setLng(m[2].replace(',', '.')) } else setLat(v)
  }

  return (
    <form action={enviar} className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card titulo="1. Tipo de trabajo">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo label="Tipo">
              <Select name="tipoTrabajo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
                {Object.entries(TIPOS_TRABAJO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Select>
            </Campo>
            {SUBTIPOS[tipo]?.length > 0 && (
              <Campo label="Subtipo">
                <Select name="subtipo">{SUBTIPOS[tipo].map((s) => <option key={s}>{s}</option>)}</Select>
              </Campo>
            )}
            {tipo === 'mantenimiento' && (
              <Campo label="Tipo de red">
                <Select name="tipoRed" defaultValue=""><option value="">—</option>{TIPOS_RED.map((r) => <option key={r}>{r}</option>)}</Select>
              </Campo>
            )}
          </div>
          {tipo === 'mantenimiento' && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Campo label="N° de acta (opcional)"><Input name="nroActa" /></Campo>
              <Campo label="N° de siniestro" ayuda="12 caracteres, solo si es siniestro"><Input name="siniestro" maxLength={12} /></Campo>
              <Campo label="EHS (opcional)"><Input name="ehs" /></Campo>
            </div>
          )}
          {tipo === 'obra' && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Campo label="Proyecto"><Input name="proyecto" placeholder="ARATO-26011" /></Campo>
              <Campo label="Etapa / tarea / ICD"><Input name="etapa" /></Campo>
              <Campo label="Grafo (opcional)"><Input name="grafo" /></Campo>
            </div>
          )}
        </Card>

        <Card titulo="2. Ubicación">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo label="Dirección" className="sm:col-span-2"><Input name="direccion" placeholder="Calle, altura, localidad" /></Campo>
            <Campo label="Latitud" ayuda="Podés pegar 'lat, long' copiado del mapa"><Input name="lat" value={lat} onChange={(e) => pegarCoordenadas(e.target.value)} placeholder="-34.6280" /></Campo>
            <Campo label="Longitud"><Input name="lng" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-58.4300" /></Campo>
          </div>
          <div className="mt-3">
            {detectada ? (
              <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">Subregión detectada por ubicación: <b>{detectada.region} · {detectada.nombre}</b></div>
            ) : (
              <Campo label={lat && lng ? 'La ubicación no cae en ningún polígono: elegí la subregión' : 'Subregión (se detecta sola si cargás la ubicación)'}>
                <Select name="subregionId" value={subElegida} onChange={(e) => setSubElegida(e.target.value)}>
                  <option value="">Elegí…</option>
                  {subregiones.map((s) => <option key={s.id} value={s.id}>{s.region} · {s.nombre}</option>)}
                </Select>
              </Campo>
            )}
            {detectada && <input type="hidden" name="subregionId" value={detectada.id} />}
          </div>
        </Card>

        <Card titulo="3. Contratista">
          {subregionId == null ? <p className="text-sm text-slate-500">Primero indicá la ubicación o la subregión.</p> : (
            <div className="space-y-2">
              {elegidos.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  {elegidos.length > 1 && <span className="w-16 text-xs text-slate-500">Etapa {i + 1}</span>}
                  <Select name="contratistaId" value={v} onChange={(e) => setElegidos(elegidos.map((x, j) => (j === i ? e.target.value : x)))} required>
                    <option value="">Elegí un contratista habilitado en la subregión…</option>
                    {habilitados.map((c) => <option key={c.id} value={c.id}>{c.razonSocial}</option>)}
                  </Select>
                  {elegidos.length > 1 && <button type="button" onClick={() => setElegidos(elegidos.filter((_, j) => j !== i))} className="text-xs text-red-600">Quitar</button>}
                </div>
              ))}
              {habilitados.length === 0 && <p className="text-sm text-amber-700">No hay contratistas habilitados en esta subregión.</p>}
              <button type="button" onClick={() => setElegidos([...elegidos, ''])} className="text-sm font-medium text-marca-700 hover:underline">+ Agregar otro contratista (tarea múltiple)</button>
              {elegidos.length > 1 && (
                <Campo label="¿Cómo se ejecutan las etapas?">
                  <Select name="modoSubtareas" defaultValue="secuencial">
                    <option value="secuencial">Secuenciales: cada etapa arranca cuando termina la anterior</option>
                    <option value="simultanea">Simultáneas</option>
                  </Select>
                </Campo>
              )}
            </div>
          )}
        </Card>

        <Card titulo="4. Detalle">
          <div className="space-y-3">
            <Campo label="Título"><Input name="titulo" required placeholder="Qué hay que hacer, en pocas palabras" /></Campo>
            <Campo label="Descripción"><Textarea name="descripcion" rows={4} placeholder="Contexto técnico, accesos, contactos…" /></Campo>
            <Campo label="Documentación inicial (opcional)"><Input type="file" name="archivos" multiple /></Campo>
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card titulo="Imputación">
          <Campo label="Cómo se paga" ayuda="La podés cambiar hasta que Administración registre el consumo">
            <Select name="imputacionId" required defaultValue="">
              <option value="" disabled>Elegí la OT, PEP u orden…</option>
              {imps.map((i) => <option key={i.id} value={i.id}>{TIPOS_IMPUTACION[i.tipo]} {i.numero} — {i.descripcion}</option>)}
            </Select>
          </Campo>
        </Card>
        <Card titulo="Urgencia">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="urgencia" checked={urgencia} onChange={(e) => setUrgencia(e.target.checked)} /> Es una urgencia (pedida por teléfono/WhatsApp, se paga con diferencial)</label>
          {urgencia && <Textarea name="urgenciaJustificacion" required className="mt-2" placeholder="Justificación obligatoria: quién la pidió, por qué y cuándo" />}
        </Card>
        <Card titulo="Planificación">
          <div className="space-y-3">
            <Campo label="Certificados previstos" ayuda="Para obras por avances; se puede ampliar después"><Input type="number" name="certificadosPrevistos" min={1} defaultValue={1} /></Campo>
            <Campo label="Fecha tentativa (opcional)"><Input type="date" name="fechaTentativa" /></Campo>
            {tipo === 'obra' && <Campo label="Presupuesto (interno, no lo ve el contratista)"><Input name="presupuesto" inputMode="decimal" placeholder="0,00" /></Campo>}
          </div>
        </Card>
        {estado?.error && <div className="whitespace-pre-line rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{estado.error}</div>}
        <BotonEnviar className="w-full">Crear y asignar tarea</BotonEnviar>
      </div>
    </form>
  )
}
