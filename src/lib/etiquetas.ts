export const ROLES: Record<string, string> = {
  solicitante: 'Solicitante',
  supervisor: 'Supervisor',
  gerente: 'Gerente',
  administracion: 'Administración',
  cerco: 'CERCO',
  adm_obra: 'Adm. de Obra',
  compras: 'Compras',
  admin_sistema: 'Administrador del sistema',
  auditor: 'Auditoría',
  contratista_responsable: 'Responsable del contratista',
  contratista_tecnico: 'Técnico / cuadrilla',
  contratista_consulta: 'Consulta (contratista)',
  contratista: 'Contratista',
  ultimo_aprobador: 'Aprobador',
  sistema: 'Sistema',
}

export const TIPOS_TRABAJO: Record<string, string> = { mantenimiento: 'Mantenimiento', eventos: 'Eventos', obra: 'Obra' }
export const SUBTIPOS: Record<string, string[]> = {
  mantenimiento: ['correctivo', 'preventivo', 'siniestro', 'edificios', 'edificios orden real'],
  eventos: ['evento corporativo', 'evento masivo'],
  obra: [],
}
export const TIPOS_RED = ['BBI', 'CU', 'FO', 'FTTH', 'HFC']
export const TIPOS_IMPUTACION: Record<string, string> = { wo: 'OT Helix', pep: 'PEP', oc: 'Orden de controlling' }
export const TIPOS_DOCUMENTO: Record<string, string> = {
  foto: 'Foto', factura: 'Factura', remito: 'Remito', plano: 'Plano', conforme_obra: 'Conforme a obra', consumo_sap: 'Consumo SAP',
  ingreso_recuperados: 'Ingreso de recuperados', reversa_sap: 'Reversa SAP', otro: 'Documento', lpu: 'LPU', kml: 'KML', stock: 'Stock',
}
export const ESTADOS_RECUPERADO = ['utilizable', 'no utilizable', 'chatarra']

export const MODOS: Record<string, string> = { directo: '', pool: '', delegado: 'como delegado', supervisor: 'en lugar de', suplencia: 'como suplente' }

export function nombreRol(r: string | null | undefined) {
  return r ? ROLES[r] ?? r : '—'
}
