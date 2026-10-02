import { Etapas } from './ui'
import { Icono } from './iconos'

/*
 * Guías visuales del recorrido. Son solo presentación: agrupan los estados del motor de flujo
 * en etapas fáciles de leer y sugieren el próximo paso. Las reglas siguen en flujos/*.yaml.
 */

const ETAPAS_CERT: Array<{ texto: string; opcional?: boolean; estados: string[] }> = [
  { texto: 'Carga del contratista', estados: ['BORRADOR', 'OBSERVADO'] },
  { texto: 'Validación técnica', estados: ['VAL_TECNICA', 'PEDIDO_RETIRO', 'REVISION_RECHAZO'] },
  { texto: 'Aprobación gerencial', opcional: true, estados: ['APROB_GERENTE'] },
  { texto: 'Materiales y SAP', opcional: true, estados: ['VAL_MATERIALES', 'REBOTE_MATERIALES', 'PENDIENTE_REVERSA_SAP'] },
  { texto: 'Aprobación final', estados: ['APROB_FINAL'] },
  { texto: 'Aprobado para pago', estados: ['APROBADO'] },
  { texto: 'Liquidación y factura', estados: ['EN_LIQUIDACION', 'CERRADO'] },
]
const ALERTA_CERT = ['OBSERVADO', 'REVISION_RECHAZO', 'REBOTE_MATERIALES', 'PEDIDO_RETIRO', 'PENDIENTE_REVERSA_SAP']

export function EtapasCertificado({ estado }: { estado: string }) {
  const i = ETAPAS_CERT.findIndex((e) => e.estados.includes(estado))
  if (i < 0) return null
  return <Etapas etapas={ETAPAS_CERT} actual={i} tono={estado === 'CERRADO' ? 'fin' : ALERTA_CERT.includes(estado) ? 'alerta' : 'normal'} />
}

const ETAPAS_TAREA: Array<{ texto: string; estados: string[] }> = [
  { texto: 'Pedido y asignación', estados: ['PENDIENTE_ETAPA', 'ASIGNADA', 'DEVUELTA', 'PEDIDO_REASIGNACION'] },
  { texto: 'Aceptada', estados: ['ACEPTADA'] },
  { texto: 'En ejecución', estados: ['EN_EJECUCION', 'EN_ESPERA'] },
  { texto: 'Ejecutada', estados: ['EJECUTADA'] },
  { texto: 'Certificación', estados: ['EN_CERTIFICACION', 'PEDIDO_CIERRE'] },
  { texto: 'Certificada', estados: ['CERTIFICADA'] },
]
const ALERTA_TAREA = ['DEVUELTA', 'PEDIDO_REASIGNACION', 'EN_ESPERA', 'PEDIDO_CIERRE']

export function EtapasTarea({ estado }: { estado: string }) {
  const i = ETAPAS_TAREA.findIndex((e) => e.estados.includes(estado))
  if (i < 0) return null
  return <Etapas etapas={ETAPAS_TAREA} actual={i} tono={estado === 'CERTIFICADA' ? 'fin' : ALERTA_TAREA.includes(estado) ? 'alerta' : 'normal'} />
}

/** Texto del próximo paso según quién mira. Si no hay nada que decir, no se muestra. */
const PASOS: Record<string, { c?: string; i?: string }> = {
  // Tareas
  ASIGNADA: { c: 'Revisá el pedido y aceptalo (o devolvelo con el motivo). Tenés 48 h: si no respondés, vuelve al solicitante.', i: 'Esperando que el contratista acepte (48 h).' },
  DEVUELTA: { i: 'El contratista devolvió la tarea. Reasignala a otro contratista habilitado o cancelala.' },
  ACEPTADA: { c: 'Cuando la cuadrilla empiece, marcá “Iniciar”. Así corre el tiempo de ejecución.' },
  EN_EJECUCION: { c: 'Cargá avances y fotos en la bitácora. Al terminar, informá el fin de la ejecución.', i: 'El contratista está trabajando. Podés seguir la bitácora y los mensajes.' },
  EN_ESPERA: { c: 'La tarea está en espera: cuando se resuelva la causa, reanudala. El tiempo en espera no cuenta para el SLA.' },
  EJECUTADA: { c: 'Trabajo terminado: tocá “Certificar” para armar el certificado con los códigos de la LPU, materiales y fotos.' },
  PEDIDO_CIERRE: { i: 'El contratista pidió cerrar la tarea sin más certificados. Aceptá o rechazá el pedido.' },
  // Certificados
  BORRADOR: { c: 'Completá la carátula, los códigos de mano de obra, los materiales y las fotos. Guardá cuando quieras y emití cuando esté completo.' },
  OBSERVADO: { c: 'Te observaron el certificado: leé los comentarios (también por ítem), corregí y volvé a emitir. Se genera una nueva versión.' },
  VAL_TECNICA: { i: 'Verificá que lo certificado coincida con lo ejecutado (cantidades, fotos, documentos). Podés aprobar, observar o pedir el retiro.', c: 'En validación técnica del solicitante.' },
  REVISION_RECHAZO: { i: 'Un paso posterior rechazó el certificado. Decidí si lo reenviás con una aclaración o lo devolvés al contratista.' },
  APROB_GERENTE: { i: 'Tiene códigos que requieren segunda aprobación (costo mínimo diario, adicionales o recursos solicitados). Revisá la justificación.' },
  VAL_MATERIALES: { i: 'Descargá el reporte de materiales, registrá el documento de consumo SAP y compará. Si algo no coincide, rebotá al contratista.' },
  REBOTE_MATERIALES: { c: 'Administración rebotó los materiales: corregí solo la sección de materiales y reenviá.' },
  APROB_FINAL: { i: 'Aprobación final (CERCO o Adm. de Obra): controlá la mano de obra contra las reglas por código.' },
  APROBADO: { c: 'Aprobado para pago. Se incluye en la liquidación al cierre del período.', i: 'Aprobado para pago: entra en la próxima liquidación.' },
  EN_LIQUIDACION: { c: 'Está en una liquidación: subí la factura desde “Liquidaciones” para cerrarla.' },
}

/**
 * Panel del paso actual. Con acciones (children) es "Te toca a vos": explica qué decidir y muestra los botones.
 * Sin acciones es un aviso discreto de en qué está y quién lo tiene.
 */
export function SiguientePaso({ estado, portal, extra, children, quien, pie }: { estado: string; portal: 'i' | 'c'; extra?: React.ReactNode; children?: React.ReactNode; quien?: React.ReactNode; pie?: React.ReactNode }) {
  const texto = PASOS[estado]?.[portal]
  if (children) {
    return (
      <section className="no-print mb-6 rounded-2xl border border-marca-200 bg-gradient-to-br from-marca-50 via-white to-white p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04)] sm:p-5" aria-label="Tu acción">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-marca-500 text-white"><Icono nombre="flecha" /></span>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-marca-700">Te toca a vos</div>
            {texto && <p className="mt-0.5 text-sm text-slate-700">{texto}</p>}
            {extra}
            <div className="mt-3">{children}</div>
            {pie}
          </div>
        </div>
      </section>
    )
  }
  if (!texto && !extra && !quien) return null
  return (
    <div className="no-print mb-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"><Icono nombre="reloj" className="h-3.5 w-3.5" /></span>
      <div className="text-sm text-slate-700">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Próximo paso</div>
        {texto}
        {quien && <div className="text-slate-500">{quien}</div>}
        {extra}
      </div>
    </div>
  )
}
