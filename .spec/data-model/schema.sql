-- =============================================
-- SISTEMA DE GESTIÓN DE TAREAS DE MANTENIMIENTO
-- ESTRUCTURA COMPLETA DE BASE DE DATOS
-- =============================================

-- Eliminar tablas existentes si existen (en orden inverso por dependencias)
DROP TABLE IF EXISTS historial_certificados CASCADE;
DROP TABLE IF EXISTS certificado_materiales CASCADE;
DROP TABLE IF EXISTS certificado_mano_obra CASCADE;
DROP TABLE IF EXISTS documentos_tarea CASCADE;
DROP TABLE IF EXISTS certificados CASCADE;
DROP TABLE IF EXISTS historial_tareas CASCADE;
DROP TABLE IF EXISTS tareas CASCADE;
DROP TABLE IF EXISTS exportaciones_limite CASCADE;
DROP TABLE IF EXISTS notificaciones CASCADE;
DROP TABLE IF EXISTS configuracion_sistema CASCADE;
DROP TABLE IF EXISTS permisos_rol_accion_estado CASCADE;
DROP TABLE IF EXISTS jerarquias CASCADE;
DROP TABLE IF EXISTS usuarios_roles CASCADE;
DROP TABLE IF EXISTS usuarios_regiones CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS materiales CASCADE;
DROP TABLE IF EXISTS codigos_mano_obra CASCADE;
DROP TABLE IF EXISTS acciones CASCADE;
DROP TABLE IF EXISTS estados_tarea CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS regiones CASCADE;

-- =============================================
-- TABLAS MAESTRAS
-- =============================================

-- Regiones geográficas
CREATE TABLE regiones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    codigo VARCHAR(10) UNIQUE, -- Código corto para la región
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles base del sistema
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    nivel_jerarquico INTEGER DEFAULT 1, -- Para ordenar jerarquías
    puede_crear_tareas BOOLEAN DEFAULT false,
    puede_certificar BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Estados posibles de las tareas
CREATE TABLE estados_tarea (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    orden_flujo INTEGER NOT NULL, -- Para ordenar el flujo lógico
    es_inicial BOOLEAN DEFAULT false,
    es_final BOOLEAN DEFAULT false,
    requiere_comentario BOOLEAN DEFAULT false,
    color_hex VARCHAR(7) DEFAULT '#6B7280', -- Para UI
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Acciones que se pueden realizar en el sistema
CREATE TABLE acciones (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT,
    requiere_comentario BOOLEAN DEFAULT false,
    requiere_confirmacion BOOLEAN DEFAULT false,
    es_critica BOOLEAN DEFAULT false, -- Para acciones que requieren log especial
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- USUARIOS Y PERMISOS
-- =============================================

CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    empresa VARCHAR(200), -- Para proveedores
    cargo VARCHAR(100),
    fecha_ultimo_acceso TIMESTAMP,
    intentos_login_fallidos INTEGER DEFAULT 0,
    bloqueado_hasta TIMESTAMP,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Relación usuarios con regiones (muchos a muchos)
CREATE TABLE usuarios_regiones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    region_id INTEGER REFERENCES regiones(id) ON DELETE CASCADE,
    es_region_principal BOOLEAN DEFAULT false,
    activo BOOLEAN DEFAULT true,
    asignado_por INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, region_id)
);

-- Roles asignados a usuarios (muchos a muchos)
CREATE TABLE usuarios_roles (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    rol_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    region_id INTEGER REFERENCES regiones(id) ON DELETE CASCADE,
    activo BOOLEAN DEFAULT true,
    asignado_por INTEGER REFERENCES usuarios(id),
    fecha_inicio DATE DEFAULT CURRENT_DATE,
    fecha_fin DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, rol_id, region_id)
);

-- Jerarquías dinámicas (quién reporta a quién)
CREATE TABLE jerarquias (
    id SERIAL PRIMARY KEY,
    usuario_subordinado_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    usuario_supervisor_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    region_id INTEGER REFERENCES regiones(id) ON DELETE CASCADE,
    tipo_jerarquia VARCHAR(50) DEFAULT 'supervisor', -- supervisor, backup, temporal
    activa BOOLEAN DEFAULT true,
    fecha_inicio DATE DEFAULT CURRENT_DATE,
    fecha_fin DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_subordinado_id, usuario_supervisor_id, region_id),
    CHECK (usuario_subordinado_id != usuario_supervisor_id)
);

-- Permisos granulares: qué rol puede hacer qué acción en qué estado
CREATE TABLE permisos_rol_accion_estado (
    id SERIAL PRIMARY KEY,
    rol_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    accion_id INTEGER REFERENCES acciones(id) ON DELETE CASCADE,
    estado_origen_id INTEGER REFERENCES estados_tarea(id) ON DELETE CASCADE,
    estado_destino_id INTEGER REFERENCES estados_tarea(id) ON DELETE CASCADE,
    requiere_supervisor BOOLEAN DEFAULT false,
    requiere_wo BOOLEAN DEFAULT false, -- Si requiere Work Order
    condiciones_adicionales JSONB, -- Para reglas complejas
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CÓDIGOS MAESTROS
-- =============================================

CREATE TABLE codigos_mano_obra (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT NOT NULL,
    unidad VARCHAR(20) NOT NULL, -- horas, días, etc.
    costo_unitario DECIMAL(10,2),
    categoria VARCHAR(100), -- Para agrupar códigos
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE materiales (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    descripcion TEXT NOT NULL,
    unidad VARCHAR(20) NOT NULL, -- unidades, metros, kg, etc.
    costo_unitario DECIMAL(10,2),
    categoria VARCHAR(100), -- Para agrupar materiales
    es_recuperable BOOLEAN DEFAULT false,
    stock_minimo INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TAREAS Y WORKFLOW
-- =============================================

CREATE TABLE tareas (
    id SERIAL PRIMARY KEY,
    numero_tarea VARCHAR(50) NOT NULL UNIQUE,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    ubicacion TEXT, -- Descripción de la ubicación física
    coordenadas_gps POINT, -- Para ubicación exacta
    
    -- Relaciones básicas
    region_id INTEGER REFERENCES regiones(id) NOT NULL,
    estado_id INTEGER REFERENCES estados_tarea(id) NOT NULL,
    proveedor_asignado_id INTEGER REFERENCES usuarios(id),
    
    -- Work Order
    wo_numero VARCHAR(100),
    wo_asignado_por INTEGER REFERENCES usuarios(id),
    wo_asignado_at TIMESTAMP,
    wo_comentario TEXT,
    
    -- Control de flujo
    creado_por INTEGER REFERENCES usuarios(id) NOT NULL,
    bloqueada_por_usuario_id INTEGER REFERENCES usuarios(id),
    bloqueada_at TIMESTAMP,
    tiempo_bloqueo_minutos INTEGER DEFAULT 30, -- Auto-unlock después de X minutos
    
    -- Clasificación
    prioridad INTEGER DEFAULT 1 CHECK (prioridad BETWEEN 1 AND 4), -- 1=baja, 4=crítica
    tipo_trabajo VARCHAR(100), -- Mantenimiento, Reparación, Instalación, etc.
    categoria VARCHAR(100), -- Eléctrico, Mecánico, Civil, etc.
    
    -- Fechas importantes
    fecha_limite DATE,
    fecha_inicio_estimada DATE,
    fecha_fin_estimada DATE,
    fecha_inicio_real TIMESTAMP,
    fecha_fin_real TIMESTAMP,
    
    -- Costos estimados
    costo_estimado_mo DECIMAL(12,2) DEFAULT 0,
    costo_estimado_materiales DECIMAL(12,2) DEFAULT 0,
    costo_real_mo DECIMAL(12,2) DEFAULT 0,
    costo_real_materiales DECIMAL(12,2) DEFAULT 0,
    
    -- Metadatos
    datos_adicionales JSONB, -- Para campos personalizados
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historial completo de cambios en las tareas
CREATE TABLE historial_tareas (
    id SERIAL PRIMARY KEY,
    tarea_id INTEGER REFERENCES tareas(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) NOT NULL,
    accion_id INTEGER REFERENCES acciones(id) NOT NULL,
    
    -- Estados
    estado_anterior_id INTEGER REFERENCES estados_tarea(id),
    estado_nuevo_id INTEGER REFERENCES estados_tarea(id),
    
    -- Datos completos del cambio
    datos_anteriores JSONB, -- Snapshot completo del estado anterior
    datos_nuevos JSONB, -- Snapshot completo del estado nuevo
    campos_modificados TEXT[], -- Array de campos que cambiaron
    
    -- Contexto del cambio
    comentario TEXT,
    motivo VARCHAR(200),
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    
    -- Metadatos
    duracion_accion_segundos INTEGER, -- Cuánto tardó la acción
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CERTIFICADOS Y DOCUMENTACIÓN
-- =============================================

-- Certificados emitidos por proveedores y editados por inspectores
CREATE TABLE certificados (
    id SERIAL PRIMARY KEY,
    tarea_id INTEGER REFERENCES tareas(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    
    -- 🔑 PROVEEDOR EMITE EL CERTIFICADO ORIGINAL
    emitido_por INTEGER REFERENCES usuarios(id) NOT NULL, -- SIEMPRE es el proveedor
    datos_certificado JSONB NOT NULL, -- Certificado original del proveedor
    fecha_emision TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    comentario_proveedor TEXT,
    
    -- 🔧 INSPECTOR/SUPERVISOR PUEDE EDITAR
    editado_por INTEGER REFERENCES usuarios(id), -- Inspector/Supervisor que editó
    datos_editados JSONB, -- Solo los campos que se modificaron
    fecha_edicion TIMESTAMP,
    motivo_edicion TEXT, -- Por qué se editó
    campos_editados TEXT[], -- Qué campos específicos se editaron
    
    -- ✅ PROVEEDOR VALIDA LAS EDICIONES
    validado_por_proveedor BOOLEAN DEFAULT false,
    validado_por INTEGER REFERENCES usuarios(id), -- Usuario proveedor que validó
    validado_at TIMESTAMP,
    comentario_validacion TEXT, -- Si rechaza, por qué
    
    -- Control de versiones
    es_version_activa BOOLEAN DEFAULT true,
    certificado_padre_id INTEGER REFERENCES certificados(id), -- Para versionado
    
    -- Firmas digitales (futuro)
    hash_integridad VARCHAR(64), -- Para verificar que no se alteró
    firma_digital TEXT, -- Para autenticidad
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historial detallado de cambios en certificados
CREATE TABLE historial_certificados (
    id SERIAL PRIMARY KEY,
    certificado_id INTEGER REFERENCES certificados(id) ON DELETE CASCADE,
    accion VARCHAR(50) NOT NULL, -- 'emitido', 'editado', 'validado', 'rechazado', 'revertido'
    usuario_id INTEGER REFERENCES usuarios(id) NOT NULL,
    datos_anteriores JSONB,
    datos_nuevos JSONB,
    campos_afectados TEXT[],
    comentario TEXT,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mano de obra certificada
CREATE TABLE certificado_mano_obra (
    id SERIAL PRIMARY KEY,
    certificado_id INTEGER REFERENCES certificados(id) ON DELETE CASCADE,
    codigo_mo_id INTEGER REFERENCES codigos_mano_obra(id) NOT NULL,
    
    -- Valores originales del proveedor
    cantidad_original DECIMAL(10,2) NOT NULL,
    horas_trabajadas_original DECIMAL(10,2),
    fecha_inicio_original DATE,
    fecha_fin_original DATE,
    
    -- Valores editados por inspector (si aplica)
    cantidad_editada DECIMAL(10,2),
    horas_trabajadas_editada DECIMAL(10,2),
    fecha_inicio_editada DATE,
    fecha_fin_editada DATE,
    
    -- Control de cambios
    editado_por INTEGER REFERENCES usuarios(id),
    fecha_edicion TIMESTAMP,
    motivo_edicion TEXT,
    
    -- Cálculos
    costo_unitario DECIMAL(10,2),
    costo_total_original DECIMAL(12,2) GENERATED ALWAYS AS (cantidad_original * costo_unitario) STORED,
    costo_total_final DECIMAL(12,2) GENERATED ALWAYS AS (COALESCE(cantidad_editada, cantidad_original) * costo_unitario) STORED,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Materiales certificados
CREATE TABLE certificado_materiales (
    id SERIAL PRIMARY KEY,
    certificado_id INTEGER REFERENCES certificados(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES materiales(id) NOT NULL,
    
    -- Valores originales del proveedor
    cantidad_utilizada_original DECIMAL(10,2) NOT NULL DEFAULT 0,
    cantidad_recuperada_original DECIMAL(10,2) DEFAULT 0,
    estado_material_original VARCHAR(50), -- nuevo, usado, recuperado
    
    -- Valores editados por inspector (si aplica)
    cantidad_utilizada_editada DECIMAL(10,2),
    cantidad_recuperada_editada DECIMAL(10,2),
    estado_material_editado VARCHAR(50),
    
    -- Control de cambios
    editado_por INTEGER REFERENCES usuarios(id),
    fecha_edicion TIMESTAMP,
    motivo_edicion TEXT,
    
    -- Cálculos
    costo_unitario DECIMAL(10,2),
    costo_total_utilizado_original DECIMAL(12,2) GENERATED ALWAYS AS (cantidad_utilizada_original * costo_unitario) STORED,
    costo_total_utilizado_final DECIMAL(12,2) GENERATED ALWAYS AS (COALESCE(cantidad_utilizada_editada, cantidad_utilizada_original) * costo_unitario) STORED,
    
    -- Ubicación de materiales
    almacen_origen VARCHAR(100),
    almacen_destino VARCHAR(100), -- Para materiales recuperados
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documentos adjuntos a las tareas
CREATE TABLE documentos_tarea (
    id SERIAL PRIMARY KEY,
    tarea_id INTEGER REFERENCES tareas(id) ON DELETE CASCADE,
    certificado_id INTEGER REFERENCES certificados(id) ON DELETE CASCADE, -- Opcional, si es específico de un certificado
    
    -- Información del archivo
    nombre_archivo VARCHAR(255) NOT NULL,
    nombre_original VARCHAR(255) NOT NULL, -- Nombre que tenía cuando se subió
    ruta_archivo VARCHAR(500) NOT NULL,
    tipo_mime VARCHAR(100),
    tamaño_bytes BIGINT,
    extension VARCHAR(10),
    
    -- Clasificación
    tipo_documento VARCHAR(50), -- foto, plano, certificado, reporte, etc.
    categoria VARCHAR(100),
    es_obligatorio BOOLEAN DEFAULT false,
    
    -- Control
    subido_por INTEGER REFERENCES usuarios(id) NOT NULL,
    descripcion TEXT,
    es_publico BOOLEAN DEFAULT false, -- Si todos los roles pueden verlo
    
    -- Validación
    validado BOOLEAN DEFAULT false,
    validado_por INTEGER REFERENCES usuarios(id),
    validado_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CONTROL DE EXPORTACIONES
-- =============================================

CREATE TABLE exportaciones_limite (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo_exportacion VARCHAR(50) NOT NULL, -- 'materiales', 'mano_obra', 'tareas', 'reportes'
    cantidad_exportaciones INTEGER DEFAULT 0,
    ultimo_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    limite_por_periodo INTEGER DEFAULT 5,
    periodo_minutos INTEGER DEFAULT 10,
    bloqueado_hasta TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, tipo_exportacion)
);

-- Log de exportaciones realizadas
CREATE TABLE log_exportaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) NOT NULL,
    tipo_exportacion VARCHAR(50) NOT NULL,
    filtros_aplicados JSONB, -- Qué filtros se usaron
    cantidad_registros INTEGER, -- Cuántos registros se exportaron
    nombre_archivo VARCHAR(255),
    tamaño_archivo_bytes BIGINT,
    tiempo_generacion_segundos INTEGER,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- NOTIFICACIONES
-- =============================================

CREATE TABLE notificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    tarea_id INTEGER REFERENCES tareas(id) ON DELETE CASCADE,
    
    -- Contenido
    tipo VARCHAR(50) NOT NULL, -- 'reasignacion', 'observacion', 'aprobacion', 'vencimiento', etc.
    titulo VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    datos_adicionales JSONB, -- Para información extra
    
    -- Control
    leida BOOLEAN DEFAULT false,
    fecha_leida TIMESTAMP,
    prioridad INTEGER DEFAULT 1 CHECK (prioridad BETWEEN 1 AND 3), -- 1=baja, 3=alta
    
    -- Canales de envío
    enviada_email BOOLEAN DEFAULT false,
    enviada_sms BOOLEAN DEFAULT false,
    enviada_push BOOLEAN DEFAULT false,
    
    -- Programación
    programada_para TIMESTAMP, -- Para notificaciones futuras
    procesada BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Plantillas de notificaciones
CREATE TABLE plantillas_notificaciones (
    id SERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL UNIQUE,
    titulo_template VARCHAR(200) NOT NULL,
    mensaje_template TEXT NOT NULL,
    variables_disponibles TEXT[], -- Variables que se pueden usar en el template
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CONFIGURACIÓN DEL SISTEMA
-- =============================================

CREATE TABLE configuracion_sistema (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(100) NOT NULL UNIQUE,
    valor TEXT NOT NULL,
    descripcion TEXT,
    tipo VARCHAR(20) DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
    categoria VARCHAR(50) DEFAULT 'general', -- Para agrupar configuraciones
    es_publica BOOLEAN DEFAULT false, -- Si se puede mostrar en frontend
    requiere_reinicio BOOLEAN DEFAULT false, -- Si cambiar este valor requiere reiniciar
    valor_por_defecto TEXT,
    validacion_regex VARCHAR(500), -- Para validar el formato del valor
    updated_by INTEGER REFERENCES usuarios(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Log de cambios en configuración
CREATE TABLE log_configuracion (
    id SERIAL PRIMARY KEY,
    configuracion_id INTEGER REFERENCES configuracion_sistema(id) ON DELETE CASCADE,
    valor_anterior TEXT,
    valor_nuevo TEXT NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id) NOT NULL,
    motivo TEXT,
    ip_address INET,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- ÍNDICES PARA PERFORMANCE
-- =============================================

-- Índices principales para tareas
CREATE INDEX idx_tareas_estado ON tareas(estado_id);
CREATE INDEX idx_tareas_region ON tareas(region_id);
CREATE INDEX idx_tareas_proveedor ON tareas(proveedor_asignado_id);
CREATE INDEX idx_tareas_creado_por ON tareas(creado_por);
CREATE INDEX idx_tareas_wo_numero ON tareas(wo_numero) WHERE wo_numero IS NOT NULL;
CREATE INDEX idx_tareas_bloqueada ON tareas(bloqueada_por_usuario_id, bloqueada_at) WHERE bloqueada_por_usuario_id IS NOT NULL;
CREATE INDEX idx_tareas_fechas ON tareas(fecha_limite, fecha_inicio_estimada, fecha_fin_estimada);
CREATE INDEX idx_tareas_prioridad ON tareas(prioridad, created_at);

-- Índices para historial
CREATE INDEX idx_historial_tarea ON historial_tareas(tarea_id, created_at DESC);
CREATE INDEX idx_historial_usuario ON historial_tareas(usuario_id, created_at DESC);
CREATE INDEX idx_historial_accion ON historial_tareas(accion_id, created_at DESC);
CREATE INDEX idx_historial_fecha ON historial_tareas(created_at DESC);

-- Índices para certificados
CREATE INDEX idx_certificados_tarea ON certificados(tarea_id);
CREATE INDEX idx_certificados_emitido_por ON certificados(emitido_por);
CREATE INDEX idx_certificados_editado_por ON certificados(editado_por) WHERE editado_por IS NOT NULL;
CREATE INDEX idx_certificados_version_activa ON certificados(es_version_activa) WHERE es_version_activa = true;

-- Índices para usuarios y permisos
CREATE INDEX idx_usuarios_activos ON usuarios(activo, email) WHERE activo = true;
CREATE INDEX idx_usuarios_empresa ON usuarios(empresa) WHERE empresa IS NOT NULL;
CREATE INDEX idx_usuarios_regiones_activos ON usuarios_regiones(usuario_id, region_id) WHERE activo = true;
CREATE INDEX idx_usuarios_roles_activos ON usuarios_roles(usuario_id, rol_id, region_id) WHERE activo = true;
CREATE INDEX idx_jerarquias_activas ON jerarquias(usuario_supervisor_id, usuario_subordinado_id, region_id) WHERE activa = true;

-- Índices para notificaciones
CREATE INDEX idx_notificaciones_usuario_no_leidas ON notificaciones(usuario_id, leida, created_at DESC) WHERE leida = false;
CREATE INDEX idx_notificaciones_tipo ON notificaciones(tipo, created_at DESC);
CREATE INDEX idx_notificaciones_programadas ON notificaciones(programada_para, procesada) WHERE programada_para IS NOT NULL AND procesada = false;

-- Índices para exportaciones
CREATE INDEX idx_exportaciones_limite_usuario ON exportaciones_limite(usuario_id, tipo_exportacion);
CREATE INDEX idx_log_exportaciones_usuario ON log_exportaciones(usuario_id, created_at DESC);

-- Índices para documentos
CREATE INDEX idx_documentos_tarea ON documentos_tarea(tarea_id);
CREATE INDEX idx_documentos_certificado ON documentos_tarea(certificado_id) WHERE certificado_id IS NOT NULL;
CREATE INDEX idx_documentos_tipo ON documentos_tarea(tipo_documento, categoria);

-- =============================================
-- TRIGGERS Y FUNCIONES
-- =============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a todas las tablas que tienen updated_at
CREATE TRIGGER update_regiones_updated_at BEFORE UPDATE ON regiones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usuarios_regiones_updated_at BEFORE UPDATE ON usuarios_regiones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usuarios_roles_updated_at BEFORE UPDATE ON usuarios_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jerarquias_updated_at BEFORE UPDATE ON jerarquias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permisos_updated_at BEFORE UPDATE ON permisos_rol_accion_estado FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_codigos_mo_updated_at BEFORE UPDATE ON codigos_mano_obra FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_materiales_updated_at BEFORE UPDATE ON materiales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tareas_updated_at BEFORE UPDATE ON tareas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_certificados_updated_at BEFORE UPDATE ON certificados FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_certificado_mo_updated_at BEFORE UPDATE ON certificado_mano_obra FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_certificado_materiales_updated_at BEFORE UPDATE ON certificado_materiales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documentos_updated_at BEFORE UPDATE ON documentos_tarea FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exportaciones_updated_at BEFORE UPDATE ON exportaciones_limite FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notificaciones_updated_at BEFORE UPDATE ON notificaciones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_plantillas_updated_at BEFORE UPDATE ON plantillas_notificaciones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_configuracion_updated_at BEFORE UPDATE ON configuracion_sistema FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para generar número de tarea automático
CREATE OR REPLACE FUNCTION generar_numero_tarea()
RETURNS TRIGGER AS $$
DECLARE
    region_codigo VARCHAR(10);
    contador INTEGER;
    nuevo_numero VARCHAR(50);
BEGIN
    -- Obtener código de región
    SELECT codigo INTO region_codigo FROM regiones WHERE id = NEW.region_id;
    
    -- Obtener siguiente número para esta región
    SELECT COALESCE(MAX(CAST(SUBSTRING(numero_tarea FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO contador
    FROM tareas 
    WHERE region_id = NEW.region_id 
    AND numero_tarea LIKE region_codigo || '-%';
    
    -- Generar nuevo número
    nuevo_numero := region_codigo || '-' || LPAD(contador::TEXT, 6, '0');
    
    NEW.numero_tarea := nuevo_numero;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para generar número de tarea
CREATE TRIGGER trigger_generar_numero_tarea 
    BEFORE INSERT ON tareas 
    FOR EACH ROW 
    WHEN (NEW.numero_tarea IS NULL OR NEW.numero_tarea = '')
    EXECUTE FUNCTION generar_numero_tarea();

-- =============================================
-- DATOS INICIALES BÁSICOS
-- =============================================

-- Insertar regiones básicas
INSERT INTO regiones (nombre, descripcion, codigo) VALUES
('Región Norte', 'Región Norte del país', 'RN'),
('Región Centro', 'Región Centro del país', 'RC'),
('Región Sur', 'Región Sur del país', 'RS'),
('Región Este', 'Región Este del país', 'RE'),
('Región Oeste', 'Región Oeste del país', 'RO');

-- Insertar roles básicos
INSERT INTO roles (nombre, descripcion, nivel_jerarquico, puede_crear_tareas, puede_certificar) VALUES
('superadmin', 'Super Administrador del Sistema', 10, true, true),
('administracion', 'Personal Administrativo', 8, false, false),
('gerente', 'Gerente Regional', 7, true, true),
('cerco', 'Control de Costos', 6, false, false),
('supervisor_mantenimiento', 'Supervisor de Mantenimiento', 5, true, true),
('supervisor_disponibilidad', 'Supervisor de Disponibilidad', 5, true, true),
('supervisor_soporte', 'Supervisor de Soporte', 5, true, true),
('supervisor_provision', 'Supervisor de Provisión', 5, true, true),
('inspector', 'Inspector de Campo', 3, true, true),
('proveedor', 'Proveedor de Servicios', 1, false, true);

-- Insertar estados de tarea
INSERT INTO estados_tarea (nombre, descripcion, orden_flujo, es_inicial, es_final, color_hex) VALUES
('asignada', 'Tarea asignada a proveedor', 1, true, false, '#3B82F6'),
('en_progreso', 'Tarea en ejecución', 2, false, false, '#F59E0B'),
('pendiente_certificacion_inspector', 'Pendiente certificación por inspector/supervisor', 3, false, false, '#8B5CF6'),
('pendiente_aprobacion_con_edicion', 'Pendiente aprobación de ediciones por proveedor', 4, false, false, '#EC4899'),
('observado', 'Tarea observada, devuelta al proveedor', 5, false, false, '#EF4444'),
('pendiente_supervisor_mantenimiento', 'Pendiente aprobación supervisor mantenimiento', 6, false, false, '#6366F1'),
('pendiente_administracion', 'Pendiente revisión administrativa', 7, false, false, '#10B981'),
('pendiente_gerente', 'Pendiente autorización gerencial', 8, false, false, '#F97316'),
('pendiente_cerco', 'Pendiente aprobación final CERCO', 9, false, false, '#84CC16'),
('finalizada', 'Tarea finalizada y aprobada', 10, false, true, '#22C55E'),
('cancelada', 'Tarea cancelada', 11, false, true, '#6B7280');

-- Insertar acciones básicas
INSERT INTO acciones (nombre, descripcion, requiere_comentario, requiere_confirmacion, es_critica) VALUES
('crear_tarea', 'Crear nueva tarea', false, false, false),
('asignar_wo', 'Asignar número de Work Order', false, false, true),
('modificar_wo', 'Modificar Work Order existente', true, true, true),
('reasignar_tarea', 'Reasignar tarea a otro proveedor', true, true, true),
('iniciar_progreso', 'Cambiar tarea a En Progreso', false, false, false),
('emitir_certificado', 'Proveedor emite certificado', false, false, true),
('aprobar_certificado', 'Aprobar certificado sin cambios', false, false, false),
('editar_certificado', 'Editar certificado emitido', true, true, true),
('observar_tarea', 'Observar tarea con comentarios', true, true, false),
('validar_edicion', 'Proveedor valida edición del inspector', false, false, false),
('rechazar_edicion', 'Proveedor rechaza edición del inspector', true, true, false),
('cancelar_tarea', 'Cancelar tarea', true, true, true),
('rehacer_certificado', 'Rehacer certificado desde cero', true, true, true),
('exportar_materiales', 'Exportar reporte de materiales', false, false, false),
('exportar_mano_obra', 'Exportar reporte de mano de obra', false, false, false),
('finalizar_tarea', 'Finalizar y aprobar tarea', false, false, true);

-- Insertar códigos de mano de obra básicos
INSERT INTO codigos_mano_obra (codigo, descripcion, unidad, costo_unitario, categoria) VALUES
('MO001', 'Técnico Electricista Senior', 'horas', 25.00, 'Eléctrico'),
('MO002', 'Técnico Electricista Junior', 'horas', 18.00, 'Eléctrico'),
('MO003', 'Técnico Mecánico Senior', 'horas', 28.00, 'Mecánico'),
('MO004', 'Técnico Mecánico Junior', 'horas', 20.00, 'Mecánico'),
('MO005', 'Operario General', 'horas', 15.00, 'General'),
('MO006', 'Supervisor de Campo', 'horas', 35.00, 'Supervisión'),
('MO007', 'Soldador Certificado', 'horas', 30.00, 'Especializado'),
('MO008', 'Técnico en Instrumentación', 'horas', 32.00, 'Instrumentación');

-- Insertar materiales básicos
INSERT INTO materiales (codigo, descripcion, unidad, costo_unitario, categoria, es_recuperable) VALUES
('MAT001', 'Cable de Cobre 12 AWG', 'metros', 2.50, 'Eléctrico', false),
('MAT002', 'Interruptor Termomagnético 20A', 'unidades', 15.00, 'Eléctrico', true),
('MAT003', 'Tubo Conduit 1/2 pulgada', 'metros', 1.80, 'Eléctrico', false),
('MAT004', 'Aceite Hidráulico ISO 68', 'litros', 8.50, 'Mecánico', false),
('MAT005', 'Rodamiento 6205-2RS', 'unidades', 12.00, 'Mecánico', true),
('MAT006', 'Tornillo Hexagonal M8x25', 'unidades', 0.25, 'Ferretería', false),
('MAT007', 'Soldadura E6013 3.2mm', 'kg', 4.50, 'Soldadura', false),
('MAT008', 'Válvula de Bola 1 pulgada', 'unidades', 25.00, 'Plomería', true);

-- Insertar configuraciones básicas del sistema
INSERT INTO configuracion_sistema (clave, valor, descripcion, tipo, categoria, es_publica) VALUES
('sistema_nombre', 'Sistema de Gestión de Tareas de Mantenimiento', 'Nombre del sistema', 'string', 'general', true),
('version_sistema', '1.0.0', 'Versión actual del sistema', 'string', 'general', true),
('limite_exportaciones_default', '5', 'Límite por defecto de exportaciones por usuario', 'number', 'exportaciones', false),
('periodo_exportaciones_minutos', '10', 'Período en minutos para reset de límite de exportaciones', 'number', 'exportaciones', false),
('tiempo_bloqueo_tarea_minutos', '30', 'Tiempo en minutos para auto-desbloqueo de tareas', 'number', 'tareas', false),
('requiere_wo_para_certificar', 'true', 'Si se requiere WO para poder certificar', 'boolean', 'validaciones', false),
('notificaciones_email_activas', 'true', 'Si las notificaciones por email están activas', 'boolean', 'notificaciones', false),
('auditoria_completa_activa', 'true', 'Si la auditoría completa está activa', 'boolean', 'auditoria', false),
('max_intentos_login', '5', 'Máximo número de intentos de login fallidos', 'number', 'seguridad', false),
('tiempo_bloqueo_usuario_minutos', '15', 'Tiempo de bloqueo después de intentos fallidos', 'number', 'seguridad', false);

-- Insertar plantillas de notificaciones básicas
INSERT INTO plantillas_notificaciones (tipo, titulo_template, mensaje_template, variables_disponibles) VALUES
('reasignacion', 'Tarea {numero_tarea} reasignada', 'La tarea {numero_tarea} - {titulo} ha sido reasignada a {nuevo_proveedor} por {usuario_reasigno}. Motivo: {motivo}', ARRAY['numero_tarea', 'titulo', 'nuevo_proveedor', 'usuario_reasigno', 'motivo']),
('observacion', 'Tarea {numero_tarea} observada', 'La tarea {numero_tarea} - {titulo} ha sido observada por {inspector}. Comentario: {comentario}', ARRAY['numero_tarea', 'titulo', 'inspector', 'comentario']),
('aprobacion', 'Tarea {numero_tarea} aprobada', 'La tarea {numero_tarea} - {titulo} ha sido aprobada y pasa al siguiente nivel.', ARRAY['numero_tarea', 'titulo']),
('certificado_editado', 'Certificado editado en tarea {numero_tarea}', 'El inspector {inspector} ha editado el certificado de la tarea {numero_tarea}. Debe validar los cambios.', ARRAY['numero_tarea', 'inspector']),
('tarea_vencida', 'Tarea {numero_tarea} vencida', 'La tarea {numero_tarea} - {titulo} ha superado su fecha límite: {fecha_limite}', ARRAY['numero_tarea', 'titulo', 'fecha_limite']);

-- =============================================
-- COMENTARIOS FINALES
-- =============================================

-- Esta estructura de base de datos proporciona:
-- ✅ Sistema flexible de permisos basado en roles y acciones
-- ✅ Control granular de estados y transiciones
-- ✅ Auditoría completa con snapshots de datos
-- ✅ Sistema de certificados donde proveedor emite e inspector edita
-- ✅ Control de concurrencia con bloqueo de tareas
-- ✅ Gestión de exportaciones con límites configurables
-- ✅ Sistema de notificaciones con plantillas
-- ✅ Configuración flexible del sistema
-- ✅ Triggers automáticos para numeración y timestamps
-- ✅ Índices optimizados para performance
-- ✅ Datos iniciales para comenzar a operar

COMMENT ON DATABASE CURRENT_DATABASE() IS 'Sistema de Gestión de Tareas de Mantenimiento - Base de datos completa con sistema flexible de permisos, auditoría completa y control granular de workflow';