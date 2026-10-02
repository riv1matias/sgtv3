'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import clsx from 'clsx'
import { clasesBoton, type EstiloBoton } from './ui'

export interface EstadoAccion { ok?: boolean; error?: string; mensaje?: string; datos?: unknown }
export type AccionServidor = (prev: EstadoAccion | null, fd: FormData) => Promise<EstadoAccion>

/** Formulario que envía a una Server Action y muestra el resultado (funciona también sin JavaScript) */
export function Formulario({ accion, children, className, reiniciar, id }: { accion: AccionServidor; children: React.ReactNode; className?: string; reiniciar?: boolean; id?: string }) {
  const [estado, enviar] = useActionState(accion, null)
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (estado?.ok && reiniciar) ref.current?.reset()
  }, [estado, reiniciar])
  return (
    <form ref={ref} action={enviar} className={className} id={id}>
      {children}
      {estado?.error && <div role="alert" className="mt-3 whitespace-pre-line rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{estado.error}</div>}
      {estado?.ok && estado.mensaje && <div role="status" className="mt-3 whitespace-pre-line rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{estado.mensaje}</div>}
    </form>
  )
}

export function BotonEnviar({ children, estilo = 'primario', chico, confirmar, className, name, value, disabled }: { children: React.ReactNode; estilo?: EstiloBoton; chico?: boolean; confirmar?: string; className?: string; name?: string; value?: string; disabled?: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending || disabled}
      className={clsx(clasesBoton(estilo, chico), className)}
      onClick={(e) => { if (confirmar && !window.confirm(confirmar)) e.preventDefault() }}
    >
      {pending ? 'Procesando…' : children}
    </button>
  )
}
