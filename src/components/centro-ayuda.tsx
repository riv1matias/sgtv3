import Link from 'next/link'
import clsx from 'clsx'
import type { Usuario } from '@/server/usuarios'
import { CONTACTO, GLOSARIO, GUIAS, PREGUNTAS, type Guia } from '@/lib/ayuda'
import { Icono, type NombreIcono } from './iconos'
import { PreguntasFrecuentes } from './preguntas'
import { Card } from './ui'

function Seccion({ id, titulo, subtitulo, children }: { id: string; titulo: string; subtitulo?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 pt-10">
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">{titulo}</h2>
      {subtitulo && <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function TarjetaGuia({ g, destacada }: { g: Guia; destacada?: boolean }) {
  return (
    <details id={`guia-${g.id}`} open={destacada} className={clsx('group scroll-mt-24 rounded-2xl border bg-white', destacada ? 'border-marca-200 ring-2 ring-marca-100' : 'border-slate-200/80')}>
      <summary className="flex cursor-pointer items-center gap-3 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-marca-50 text-marca-600"><Icono nombre="libro" /></span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-slate-900">{g.titulo}</span>
          <span className="block text-xs text-slate-500">{g.resumen}</span>
        </span>
        <Icono nombre="chevron" className="text-slate-400 transition-transform group-open:rotate-180" />
      </summary>
      <ol className="space-y-4 px-5 pb-5 pt-1">
        {g.pasos.map((p, i) => (
          <li key={p.titulo} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-marca-500 text-[11px] font-semibold text-white">{i + 1}</span>
            <div>
              <div className="text-sm font-medium text-slate-900">{p.titulo}</div>
              <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{p.texto}</p>
            </div>
          </li>
        ))}
      </ol>
    </details>
  )
}

const CIRCUITO: Array<{ quien: string; que: string; icono: NombreIcono; condicion?: string }> = [
  { quien: 'Contratista', que: 'Carga y emite el certificado', icono: 'empresa' },
  { quien: 'Solicitante', que: 'Validación técnica', icono: 'check' },
  { quien: 'Gerente', que: 'Segunda aprobación', icono: 'usuario', condicion: 'Solo con códigos especiales' },
  { quien: 'Administración', que: 'Materiales y SAP', icono: 'materiales', condicion: 'Solo si hay materiales' },
  { quien: 'CERCO / Adm. de Obra', que: 'Aprobación final', icono: 'escudo' },
  { quien: 'Administración', que: 'Liquidación del período', icono: 'dinero' },
  { quien: 'Contratista', que: 'Sube la factura', icono: 'certificado' },
]

function Circuito() {
  return (
    <Card>
      <ol className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-7">
        {CIRCUITO.map((p, i) => (
          <li key={i} className="relative rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-marca-600 shadow-sm ring-1 ring-slate-200"><Icono nombre={p.icono} className="h-3.5 w-3.5" /></span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Paso {i + 1}</span>
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900">{p.quien}</div>
            <div className="text-xs text-slate-600">{p.que}</div>
            {p.condicion && <div className="mt-1.5 inline-block rounded-md bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-medium text-amber-800">{p.condicion}</div>}
          </li>
        ))}
      </ol>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className="flex gap-2.5 rounded-xl bg-red-50 px-3.5 py-2.5 text-red-900"><Icono nombre="volver" className="mt-0.5" /><span><b>Observación</b> (validación técnica): vuelve al <b>contratista</b> para corregir y reemitir.</span></div>
        <div className="flex gap-2.5 rounded-xl bg-amber-50 px-3.5 py-2.5 text-amber-900"><Icono nombre="volver" className="mt-0.5" /><span><b>Rechazo</b> (gerente, Administración o aprobación final): vuelve al <b>solicitante</b>, que reenvía o devuelve al contratista.</span></div>
      </div>
    </Card>
  )
}

export function CentroAyuda({ u, portal }: { u: Usuario; portal: 'i' | 'c' }) {
  const guias = GUIAS.filter((g) => g.para.includes(portal))
  const mias = guias.filter((g) => !g.roles || g.roles.some((r) => u.roles.includes(r)))
  const otras = guias.filter((g) => !mias.includes(g))
  const preguntas = PREGUNTAS.filter((x) => x.para.includes(portal)).map(({ p, r, tema }) => ({ p, r, tema }))
  const accesos: Array<{ href: string; texto: string; detalle: string; icono: NombreIcono }> = [
    { href: '#guias', texto: 'Guías paso a paso', detalle: portal === 'c' ? 'Certificar, corregir, cobrar' : 'Pedir, validar, aprobar, liquidar', icono: 'libro' },
    { href: '#circuito', texto: 'El circuito', detalle: 'Quién aprueba qué y cuándo', icono: 'camino' },
    { href: '#preguntas', texto: 'Preguntas frecuentes', detalle: `${preguntas.length} respuestas rápidas`, icono: 'mensaje' },
    { href: '#glosario', texto: 'Glosario', detalle: 'LPU, S4, CMD, pool, SLA…', icono: 'catalogo' },
  ]
  return (
    <div className="mx-auto max-w-5xl">
      <div className="fondo-marca relative overflow-hidden rounded-3xl px-6 py-8 text-white sm:px-10 sm:py-10">
        <div className="text-xs font-semibold uppercase tracking-[0.14em] text-marca-200">Centro de ayuda</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Hola, {u.nombre}. ¿En qué te ayudamos?</h1>
        <p className="mt-2 max-w-2xl text-sm text-marca-100/90">
          {portal === 'c'
            ? 'Todo lo que necesitás para trabajar con Personal: aceptar tareas, certificar, corregir observaciones y cobrar.'
            : 'Cómo pedir trabajos, validar y aprobar certificados, gestionar materiales y liquidar, según tu perfil.'}
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {accesos.map((a) => (
            <a key={a.href} href={a.href} className="group flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/10 transition hover:bg-white/15">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15"><Icono nombre={a.icono} className="text-marca-100" /></span>
              <span><span className="block text-sm font-semibold">{a.texto}</span><span className="block text-xs text-marca-100/80">{a.detalle}</span></span>
            </a>
          ))}
        </div>
      </div>

      <Seccion id="guias" titulo="Guías para tu perfil" subtitulo="Abrí una guía para ver los pasos. La primera está desplegada.">
        <div className="space-y-3">
          {mias.map((g, i) => <TarjetaGuia key={g.id} g={g} destacada={i === 0} />)}
        </div>
        {otras.length > 0 && (
          <>
            <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wider text-slate-400">Otros perfiles</h3>
            <div className="space-y-3">{otras.map((g) => <TarjetaGuia key={g.id} g={g} />)}</div>
          </>
        )}
      </Seccion>

      <Seccion id="circuito" titulo="El circuito del certificado" subtitulo="Cada paso tiene un responsable y un plazo. Los pasos opcionales se saltean solos cuando no corresponden.">
        <Circuito />
      </Seccion>

      <Seccion id="preguntas" titulo="Preguntas frecuentes">
        <PreguntasFrecuentes preguntas={preguntas} />
      </Seccion>

      <Seccion id="glosario" titulo="Glosario">
        <dl className="grid gap-3 sm:grid-cols-2">
          {GLOSARIO.map(([t, d]) => (
            <div key={t} className="rounded-xl border border-slate-200/80 bg-white px-4 py-3">
              <dt className="text-sm font-semibold text-slate-900">{t}</dt>
              <dd className="mt-0.5 text-sm text-slate-600">{d}</dd>
            </div>
          ))}
        </dl>
      </Seccion>

      <Seccion id="contacto" titulo="¿No encontraste lo que buscabas?">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 sm:flex-row sm:items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-marca-50 text-marca-600"><Icono nombre="mensaje" className="h-6 w-6" /></span>
          <div className="flex-1">
            <div className="text-sm font-semibold text-slate-900">{CONTACTO.titulo}</div>
            <p className="text-sm text-slate-600">{CONTACTO.texto}</p>
            <ul className="mt-1 text-xs text-slate-400">{CONTACTO.canales.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
          <Link href={`/${portal}`} className="inline-flex items-center gap-1 text-sm font-medium text-marca-700 hover:underline">Volver a Mi bandeja <Icono nombre="flecha" className="h-3.5 w-3.5" /></Link>
        </div>
      </Seccion>
    </div>
  )
}
