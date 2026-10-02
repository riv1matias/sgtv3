import {
  pgTable, text, integer, boolean, timestamp, date, numeric, jsonb, uuid, bigserial, primaryKey, index, uniqueIndex, doublePrecision,
} from 'drizzle-orm/pg-core'

const ts = (name: string) => timestamp(name, { withTimezone: true })
const money = (name: string) => numeric(name, { precision: 16, scale: 2 })
const qty = (name: string) => numeric(name, { precision: 14, scale: 4 })

// ─────────────────────────────── Organización ───────────────────────────────

export const regiones = pgTable('regiones', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  codigo: text('codigo').notNull().unique(),
  nombre: text('nombre').notNull(),
})

export const subregiones = pgTable('subregiones', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  regionId: integer('region_id').notNull().references(() => regiones.id),
  codigo: text('codigo').notNull().unique(),
  nombre: text('nombre').notNull(),
  /** GeoJSON MultiPolygon ([lng, lat]) cargado desde el KML operativo */
  poligono: jsonb('poligono'),
})

export const bases = pgTable('bases', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  subregionId: integer('subregion_id').notNull().references(() => subregiones.id),
  nombre: text('nombre').notNull(),
})

// ─────────────────────────────── Contratistas y usuarios ───────────────────────────────

export const contratistas = pgTable('contratistas', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  razonSocial: text('razon_social').notNull(),
  cuit: text('cuit').notNull().unique(),
  activo: boolean('activo').notNull().default(true),
  suspendido: boolean('suspendido').notNull().default(false),
  centroSap: text('centro_sap'),
  almacenProyecto: text('almacen_proyecto'),
  almacenMantenimiento: text('almacen_mantenimiento'),
})

export const contratistaSubregiones = pgTable('contratista_subregiones', {
  contratistaId: integer('contratista_id').notNull().references(() => contratistas.id),
  subregionId: integer('subregion_id').notNull().references(() => subregiones.id),
}, (t) => [primaryKey({ columns: [t.contratistaId, t.subregionId] })])

export const usuarios = pgTable('usuarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  nombre: text('nombre').notNull(),
  apellido: text('apellido').notNull(),
  /** interno | contratista */
  tipo: text('tipo').notNull(),
  contratistaId: integer('contratista_id').references(() => contratistas.id),
  supervisorId: uuid('supervisor_id'),
  cargo: text('cargo'),
  activo: boolean('activo').notNull().default(true),
  /** Marcado como no disponible (vacaciones, licencia) hasta esta fecha */
  noDisponibleHasta: date('no_disponible_hasta'),
  /** Sujeto del IdP (IDIRA) cuando se integre OIDC */
  idpSubject: text('idp_subject').unique(),
  createdAt: ts('created_at').notNull().defaultNow(),
})

export const usuarioRoles = pgTable('usuario_roles', {
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id),
  rol: text('rol').notNull(),
}, (t) => [primaryKey({ columns: [t.usuarioId, t.rol] })])

export const usuarioSubregiones = pgTable('usuario_subregiones', {
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id),
  subregionId: integer('subregion_id').notNull().references(() => subregiones.id),
}, (t) => [primaryKey({ columns: [t.usuarioId, t.subregionId] })])

export const delegaciones = pgTable('delegaciones', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  deUsuarioId: uuid('de_usuario_id').notNull().references(() => usuarios.id),
  aUsuarioId: uuid('a_usuario_id').notNull().references(() => usuarios.id),
  desde: date('desde').notNull(),
  hasta: date('hasta').notNull(),
  motivo: text('motivo'),
  activa: boolean('activa').notNull().default(true),
  createdAt: ts('created_at').notNull().defaultNow(),
})

// ─────────────────────────────── Catálogos ───────────────────────────────

export const codigosMo = pgTable('codigos_mo', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  codigoS4: text('codigo_s4').notNull().unique(),
  descripcion: text('descripcion').notNull(),
  alcance: text('alcance'),
  unidad: text('unidad').notNull(),
  categoria: text('categoria'),
  montoAbierto: boolean('monto_abierto').notNull().default(false),
  requiereSegundaAprobacion: boolean('requiere_segunda_aprobacion').notNull().default(false),
  requiereFactura: boolean('requiere_factura').notNull().default(false),
  soloUrgencia: boolean('solo_urgencia').notNull().default(false),
  umbralAlerta: qty('umbral_alerta'),
  activo: boolean('activo').notNull().default(true),
  /** Código que lo reemplaza si fue dado de baja (reconversión) */
  reemplazadoPorId: integer('reemplazado_por_id'),
})

export const codigoMoAlias = pgTable('codigo_mo_alias', {
  codigoMoId: integer('codigo_mo_id').notNull().references(() => codigosMo.id),
  alias: text('alias').notNull(),
  origen: text('origen').notNull(),
}, (t) => [primaryKey({ columns: [t.codigoMoId, t.alias] }), index('alias_idx').on(t.alias)])

export const lpuVersiones = pgTable('lpu_versiones', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  nombre: text('nombre').notNull(),
  vigenciaDesde: date('vigencia_desde').notNull(),
  porcentajeInformado: numeric('porcentaje_informado', { precision: 8, scale: 4 }),
  /** borrador | publicada | rectificada */
  estado: text('estado').notNull().default('borrador'),
  archivoId: uuid('archivo_id'),
  creadoPor: uuid('creado_por').references(() => usuarios.id),
  createdAt: ts('created_at').notNull().defaultNow(),
  publicadaAt: ts('publicada_at'),
  publicadaPor: uuid('publicada_por').references(() => usuarios.id),
  resumen: jsonb('resumen'),
})

export const lpuPrecios = pgTable('lpu_precios', {
  lpuId: integer('lpu_id').notNull().references(() => lpuVersiones.id),
  codigoMoId: integer('codigo_mo_id').notNull().references(() => codigosMo.id),
  /** mantenimiento | obras */
  lista: text('lista').notNull(),
  precio: numeric('precio', { precision: 16, scale: 4 }).notNull(),
}, (t) => [primaryKey({ columns: [t.lpuId, t.codigoMoId, t.lista] })])

export const materiales = pgTable('materiales', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  codigoSap: text('codigo_sap').notNull().unique(),
  descripcion: text('descripcion').notNull(),
  unidad: text('unidad').notNull(),
  grupo: text('grupo'),
  recuperable: boolean('recuperable').notNull().default(false),
  umbralAlerta: qty('umbral_alerta'),
  precioReferencia: money('precio_referencia'),
  activo: boolean('activo').notNull().default(true),
})

export const imputaciones = pgTable('imputaciones', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  /** wo | pep | oc */
  tipo: text('tipo').notNull(),
  numero: text('numero').notNull().unique(),
  descripcion: text('descripcion'),
  presupuesto: money('presupuesto'),
  activa: boolean('activa').notNull().default(true),
})

export const reglasCodigo = pgTable('reglas_codigo', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  /** requiere_codigo_base | incompatible | maximo_por_certificado | solo_tipo_trabajo */
  tipo: text('tipo').notNull(),
  codigoMoId: integer('codigo_mo_id').notNull().references(() => codigosMo.id),
  codigoRelacionadoId: integer('codigo_relacionado_id').references(() => codigosMo.id),
  parametro: text('parametro'),
  mensaje: text('mensaje').notNull(),
  activa: boolean('activa').notNull().default(true),
  creadoPor: uuid('creado_por').references(() => usuarios.id),
  createdAt: ts('created_at').notNull().defaultNow(),
})

export const parametros = pgTable('parametros', {
  clave: text('clave').primaryKey(),
  valor: jsonb('valor').notNull(),
  descripcion: text('descripcion'),
  updatedAt: ts('updated_at').notNull().defaultNow(),
})

export const contadores = pgTable('contadores', {
  clave: text('clave').primaryKey(),
  valor: integer('valor').notNull().default(0),
})

// ─────────────────────────────── Flujos ───────────────────────────────

export const flujos = pgTable('flujos', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  clave: text('clave').notNull(),
  version: integer('version').notNull(),
  definicion: jsonb('definicion').notNull(),
  vigenteDesde: date('vigente_desde').notNull(),
  publicadoAt: ts('publicado_at').notNull().defaultNow(),
}, (t) => [uniqueIndex('flujo_clave_version').on(t.clave, t.version)])

// ─────────────────────────────── Documentos ───────────────────────────────

export const documentos = pgTable('documentos', {
  id: uuid('id').primaryKey().defaultRandom(),
  sha256: text('sha256').notNull(),
  nombre: text('nombre').notNull(),
  mime: text('mime'),
  tamano: integer('tamano').notNull(),
  storageKey: text('storage_key').notNull(),
  /** foto | factura | remito | plano | conforme_obra | consumo_sap | ingreso_recuperados | reversa_sap | lpu | kml | stock | otro */
  tipo: text('tipo').notNull().default('otro'),
  sensible: boolean('sensible').notNull().default(false),
  /** Metadatos extraídos (fecha/GPS de fotos) */
  metadatos: jsonb('metadatos'),
  subidoPor: uuid('subido_por').notNull().references(() => usuarios.id),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('doc_sha_idx').on(t.sha256)])

// ─────────────────────────────── Tareas ───────────────────────────────

export const tareas = pgTable('tareas', {
  id: uuid('id').primaryKey().defaultRandom(),
  numero: text('numero').notNull().unique(),
  /** mantenimiento | eventos | obra */
  tipoTrabajo: text('tipo_trabajo').notNull(),
  subtipo: text('subtipo'),
  titulo: text('titulo').notNull(),
  descripcion: text('descripcion'),
  direccion: text('direccion'),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  subregionId: integer('subregion_id').notNull().references(() => subregiones.id),
  baseId: integer('base_id').references(() => bases.id),
  contratistaId: integer('contratista_id').references(() => contratistas.id),
  solicitanteId: uuid('solicitante_id').notNull().references(() => usuarios.id),
  supervisorId: uuid('supervisor_id').references(() => usuarios.id),
  imputacionId: integer('imputacion_id').references(() => imputaciones.id),
  urgencia: boolean('urgencia').notNull().default(false),
  urgenciaJustificacion: text('urgencia_justificacion'),
  certificadosPrevistos: integer('certificados_previstos').notNull().default(1),
  fechaTentativa: date('fecha_tentativa'),
  /** Solo obras; nunca visible para el contratista */
  presupuesto: money('presupuesto'),
  datosExtra: jsonb('datos_extra').notNull().default({}),
  estado: text('estado').notNull(),
  flujoId: integer('flujo_id').notNull().references(() => flujos.id),
  tareaPadreId: uuid('tarea_padre_id'),
  /** simultanea | secuencial (para subtareas de una tarea múltiple) */
  modoSubtarea: text('modo_subtarea'),
  ordenSubtarea: integer('orden_subtarea'),
  causalEspera: text('causal_espera'),
  causalCierre: text('causal_cierre'),
  estadoAntesPedido: text('estado_antes_pedido'),
  asignadaAt: ts('asignada_at'),
  lockVersion: integer('lock_version').notNull().default(0),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [
  index('tarea_estado_idx').on(t.estado),
  index('tarea_contratista_idx').on(t.contratistaId, t.estado),
  index('tarea_solicitante_idx').on(t.solicitanteId),
  index('tarea_subregion_idx').on(t.subregionId),
])

export const tareaMensajes = pgTable('tarea_mensajes', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  tareaId: uuid('tarea_id').notNull().references(() => tareas.id),
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id),
  texto: text('texto').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
})

export const tareaBitacora = pgTable('tarea_bitacora', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  tareaId: uuid('tarea_id').notNull().references(() => tareas.id),
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id),
  texto: text('texto'),
  documentoId: uuid('documento_id').references(() => documentos.id),
  createdAt: ts('created_at').notNull().defaultNow(),
})

export const tareaDocumentos = pgTable('tarea_documentos', {
  tareaId: uuid('tarea_id').notNull().references(() => tareas.id),
  documentoId: uuid('documento_id').notNull().references(() => documentos.id),
}, (t) => [primaryKey({ columns: [t.tareaId, t.documentoId] })])

// ─────────────────────────────── Certificados ───────────────────────────────

export const certificados = pgTable('certificados', {
  id: uuid('id').primaryKey().defaultRandom(),
  numero: text('numero').notNull().unique(),
  tareaId: uuid('tarea_id').notNull().references(() => tareas.id),
  contratistaId: integer('contratista_id').notNull().references(() => contratistas.id),
  orden: integer('orden').notNull().default(1),
  esFinal: boolean('es_final').notNull().default(true),
  estado: text('estado').notNull(),
  flujoId: integer('flujo_id').notNull().references(() => flujos.id),
  versionActual: integer('version_actual').notNull().default(1),
  /** Paso que rechazó (para reenviar) */
  pasoOrigen: text('paso_origen'),
  /** Estado previo a un pedido de retiro */
  estadoAntesPedido: text('estado_antes_pedido'),
  tomadoPor: uuid('tomado_por').references(() => usuarios.id),
  tomadoAt: ts('tomado_at'),
  periodo: text('periodo'),
  fechaEjecDesde: date('fecha_ejec_desde'),
  fechaEjecHasta: date('fecha_ejec_hasta'),
  centro: text('centro'),
  almacen: text('almacen'),
  comentario: text('comentario'),
  reenvios: integer('reenvios').notNull().default(0),
  /** emision | actualizado (para certificados tardíos autorizados) */
  precioForzado: text('precio_forzado'),
  primeraEmisionAt: ts('primera_emision_at'),
  emitidoAt: ts('emitido_at'),
  subtotalEmision: money('subtotal_emision'),
  subtotalActual: money('subtotal_actual'),
  subtotalFinal: money('subtotal_final'),
  lpuActualId: integer('lpu_actual_id').references(() => lpuVersiones.id),
  requiereSegundaAprobacion: boolean('requiere_segunda_aprobacion').notNull().default(false),
  liquidacionId: integer('liquidacion_id'),
  lockVersion: integer('lock_version').notNull().default(0),
  createdAt: ts('created_at').notNull().defaultNow(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
}, (t) => [
  index('cert_estado_idx').on(t.estado),
  index('cert_tarea_idx').on(t.tareaId),
  index('cert_contratista_idx').on(t.contratistaId, t.estado),
])

export const certificadoItems = pgTable('certificado_items', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  certificadoId: uuid('certificado_id').notNull().references(() => certificados.id),
  version: integer('version').notNull(),
  /** mo | material | recuperado */
  tipo: text('tipo').notNull(),
  codigoMoId: integer('codigo_mo_id').references(() => codigosMo.id),
  materialId: integer('material_id').references(() => materiales.id),
  cantidad: qty('cantidad'),
  /** Para ítems de monto abierto (AD) */
  importe: money('importe'),
  precioUnitario: numeric('precio_unitario', { precision: 16, scale: 4 }),
  /** Precio al que se emitió por primera vez (base de la política de subas/bajas) */
  precioEmision: numeric('precio_emision', { precision: 16, scale: 4 }),
  subtotal: money('subtotal'),
  justificacion: text('justificacion'),
  estadoRecuperado: text('estado_recuperado'),
  observacion: text('observacion'),
  facturaNumero: text('factura_numero'),
  facturaCuit: text('factura_cuit'),
  facturaFecha: date('factura_fecha'),
  facturaImporte: money('factura_importe'),
  facturaDocumentoId: uuid('factura_documento_id').references(() => documentos.id),
  orden: integer('orden').notNull().default(0),
}, (t) => [index('item_cert_version_idx').on(t.certificadoId, t.version)])

export const certificadoVersiones = pgTable('certificado_versiones', {
  certificadoId: uuid('certificado_id').notNull().references(() => certificados.id),
  version: integer('version').notNull(),
  /** borrador | emitida */
  estado: text('estado').notNull(),
  emitidaAt: ts('emitida_at'),
  emitidaPor: uuid('emitida_por').references(() => usuarios.id),
  motivo: text('motivo'),
  subtotal: money('subtotal'),
}, (t) => [primaryKey({ columns: [t.certificadoId, t.version] })])

export const certificadoDocumentos = pgTable('certificado_documentos', {
  certificadoId: uuid('certificado_id').notNull().references(() => certificados.id),
  version: integer('version').notNull(),
  documentoId: uuid('documento_id').notNull().references(() => documentos.id),
}, (t) => [primaryKey({ columns: [t.certificadoId, t.version, t.documentoId] })])

/** Cada acción de un aprobador sobre una versión (aprobar, observar, rechazar, reenviar…) */
export const aprobaciones = pgTable('aprobaciones', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  certificadoId: uuid('certificado_id').notNull().references(() => certificados.id),
  version: integer('version').notNull(),
  paso: text('paso').notNull(),
  accion: text('accion').notNull(),
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id),
  rol: text('rol'),
  enNombreDe: uuid('en_nombre_de').references(() => usuarios.id),
  motivo: text('motivo'),
  comentario: text('comentario'),
  vigente: boolean('vigente').notNull().default(true),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('aprob_cert_idx').on(t.certificadoId)])

export const observacionesItem = pgTable('observaciones_item', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  aprobacionId: integer('aprobacion_id').notNull().references(() => aprobaciones.id),
  itemId: integer('item_id').notNull().references(() => certificadoItems.id),
  comentario: text('comentario').notNull(),
})

export const consumosSap = pgTable('consumos_sap', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  certificadoId: uuid('certificado_id').notNull().references(() => certificados.id),
  version: integer('version').notNull(),
  /** consumo | ingreso_recuperados | reversa | correccion */
  tipo: text('tipo').notNull(),
  numeroDocumento: text('numero_documento').notNull(),
  fecha: date('fecha').notNull(),
  documentoId: uuid('documento_id').references(() => documentos.id),
  /** Detalle leído del archivo (código → cantidad) para comparar */
  detalle: jsonb('detalle'),
  registradoPor: uuid('registrado_por').notNull().references(() => usuarios.id),
  createdAt: ts('created_at').notNull().defaultNow(),
})

export const revalorizaciones = pgTable('revalorizaciones', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  certificadoId: uuid('certificado_id').notNull().references(() => certificados.id),
  lpuId: integer('lpu_id').notNull().references(() => lpuVersiones.id),
  subtotalAnterior: money('subtotal_anterior').notNull(),
  subtotalNuevo: money('subtotal_nuevo').notNull(),
  motivo: text('motivo').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
})

export const alertas = pgTable('alertas', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  /** certificado | tarea | liquidacion */
  entidad: text('entidad').notNull(),
  entidadId: text('entidad_id').notNull(),
  version: integer('version'),
  /** regla_codigo | umbral | foto_repetida | factura_repetida | duplicado_tarea | consumo_diferente | codigo_baja | tardio | metadatos_foto | ia */
  tipo: text('tipo').notNull(),
  severidad: text('severidad').notNull().default('advertencia'),
  mensaje: text('mensaje').notNull(),
  evidencia: jsonb('evidencia'),
  itemId: integer('item_id'),
  /** abierta | resuelta */
  estado: text('estado').notNull().default('abierta'),
  resueltaPor: uuid('resuelta_por').references(() => usuarios.id),
  resolucion: text('resolucion'),
  resueltaAt: ts('resuelta_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('alerta_entidad_idx').on(t.entidad, t.entidadId)])

// ─────────────────────────────── Liquidaciones ───────────────────────────────

export const periodos = pgTable('periodos', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  nombre: text('nombre').notNull().unique(),
  fechaCorte: date('fecha_corte').notNull(),
  /** abierto | cerrado */
  estado: text('estado').notNull().default('abierto'),
  cerradoPor: uuid('cerrado_por').references(() => usuarios.id),
  cerradoAt: ts('cerrado_at'),
})

export const liquidaciones = pgTable('liquidaciones', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  numero: text('numero').notNull().unique(),
  periodoId: integer('periodo_id').notNull().references(() => periodos.id),
  contratistaId: integer('contratista_id').notNull().references(() => contratistas.id),
  /** pendiente_factura | cerrada */
  estado: text('estado').notNull().default('pendiente_factura'),
  lpuId: integer('lpu_id').references(() => lpuVersiones.id),
  subtotal: money('subtotal').notNull(),
  ajustes: money('ajustes').notNull().default('0'),
  iva: money('iva').notNull(),
  total: money('total').notNull(),
  facturaDocumentoId: uuid('factura_documento_id').references(() => documentos.id),
  facturaNumero: text('factura_numero'),
  facturaImporte: money('factura_importe'),
  createdAt: ts('created_at').notNull().defaultNow(),
  cerradaAt: ts('cerrada_at'),
})

export const ajustes = pgTable('ajustes', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  contratistaId: integer('contratista_id').notNull().references(() => contratistas.id),
  /** debito | credito */
  tipo: text('tipo').notNull(),
  importe: money('importe').notNull(),
  motivo: text('motivo').notNull(),
  certificadoId: uuid('certificado_id').references(() => certificados.id),
  documentoId: uuid('documento_id').references(() => documentos.id),
  liquidacionId: integer('liquidacion_id').references(() => liquidaciones.id),
  creadoPor: uuid('creado_por').notNull().references(() => usuarios.id),
  createdAt: ts('created_at').notNull().defaultNow(),
})

// ─────────────────────────────── Stock ───────────────────────────────

export const stockCargas = pgTable('stock_cargas', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  contratistaId: integer('contratista_id').notNull().references(() => contratistas.id),
  fechaFoto: date('fecha_foto').notNull(),
  documentoId: uuid('documento_id').references(() => documentos.id),
  cargadoPor: uuid('cargado_por').notNull().references(() => usuarios.id),
  createdAt: ts('created_at').notNull().defaultNow(),
})

export const stockItems = pgTable('stock_items', {
  cargaId: integer('carga_id').notNull().references(() => stockCargas.id),
  /** proyecto | mantenimiento */
  almacen: text('almacen').notNull(),
  materialId: integer('material_id').notNull().references(() => materiales.id),
  cantidad: qty('cantidad').notNull(),
}, (t) => [primaryKey({ columns: [t.cargaId, t.almacen, t.materialId] })])

// ─────────────────────────────── Auditoría y notificaciones ───────────────────────────────

export const eventos = pgTable('eventos', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  ocurridoEn: ts('ocurrido_en').notNull().defaultNow(),
  usuarioId: uuid('usuario_id'),
  usuarioNombre: text('usuario_nombre').notNull(),
  rol: text('rol'),
  empresa: text('empresa'),
  enNombreDe: text('en_nombre_de'),
  entidad: text('entidad').notNull(),
  entidadId: text('entidad_id').notNull(),
  accion: text('accion').notNull(),
  estadoDesde: text('estado_desde'),
  estadoHasta: text('estado_hasta'),
  cambios: jsonb('cambios'),
  comentario: text('comentario'),
  origen: jsonb('origen'),
  hashPrevio: text('hash_previo').notNull(),
  hash: text('hash').notNull(),
}, (t) => [index('evento_entidad_idx').on(t.entidad, t.entidadId)])

export const notificaciones = pgTable('notificaciones', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  usuarioId: uuid('usuario_id').notNull().references(() => usuarios.id),
  titulo: text('titulo').notNull(),
  cuerpo: text('cuerpo'),
  link: text('link'),
  leida: boolean('leida').notNull().default(false),
  createdAt: ts('created_at').notNull().defaultNow(),
}, (t) => [index('notif_usuario_idx').on(t.usuarioId, t.leida)])
