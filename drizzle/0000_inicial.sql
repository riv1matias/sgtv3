CREATE TABLE "ajustes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ajustes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"contratista_id" integer NOT NULL,
	"tipo" text NOT NULL,
	"importe" numeric(16, 2) NOT NULL,
	"motivo" text NOT NULL,
	"certificado_id" uuid,
	"documento_id" uuid,
	"liquidacion_id" integer,
	"creado_por" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alertas" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "alertas_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"entidad" text NOT NULL,
	"entidad_id" text NOT NULL,
	"version" integer,
	"tipo" text NOT NULL,
	"severidad" text DEFAULT 'advertencia' NOT NULL,
	"mensaje" text NOT NULL,
	"evidencia" jsonb,
	"item_id" integer,
	"estado" text DEFAULT 'abierta' NOT NULL,
	"resuelta_por" uuid,
	"resolucion" text,
	"resuelta_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "aprobaciones" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "aprobaciones_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"certificado_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"paso" text NOT NULL,
	"accion" text NOT NULL,
	"usuario_id" uuid NOT NULL,
	"rol" text,
	"en_nombre_de" uuid,
	"motivo" text,
	"comentario" text,
	"vigente" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bases" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subregion_id" integer NOT NULL,
	"nombre" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificado_documentos" (
	"certificado_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"documento_id" uuid NOT NULL,
	CONSTRAINT "certificado_documentos_certificado_id_version_documento_id_pk" PRIMARY KEY("certificado_id","version","documento_id")
);
--> statement-breakpoint
CREATE TABLE "certificado_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "certificado_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"certificado_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"tipo" text NOT NULL,
	"codigo_mo_id" integer,
	"material_id" integer,
	"cantidad" numeric(14, 4),
	"importe" numeric(16, 2),
	"precio_unitario" numeric(16, 4),
	"subtotal" numeric(16, 2),
	"justificacion" text,
	"estado_recuperado" text,
	"observacion" text,
	"factura_numero" text,
	"factura_cuit" text,
	"factura_fecha" date,
	"factura_importe" numeric(16, 2),
	"factura_documento_id" uuid,
	"orden" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificado_versiones" (
	"certificado_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"estado" text NOT NULL,
	"emitida_at" timestamp with time zone,
	"emitida_por" uuid,
	"motivo" text,
	"subtotal" numeric(16, 2),
	CONSTRAINT "certificado_versiones_certificado_id_version_pk" PRIMARY KEY("certificado_id","version")
);
--> statement-breakpoint
CREATE TABLE "certificados" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" text NOT NULL,
	"tarea_id" uuid NOT NULL,
	"contratista_id" integer NOT NULL,
	"orden" integer DEFAULT 1 NOT NULL,
	"es_final" boolean DEFAULT true NOT NULL,
	"estado" text NOT NULL,
	"flujo_id" integer NOT NULL,
	"version_actual" integer DEFAULT 1 NOT NULL,
	"paso_origen" text,
	"estado_antes_pedido" text,
	"tomado_por" uuid,
	"tomado_at" timestamp with time zone,
	"periodo" text,
	"fecha_ejec_desde" date,
	"fecha_ejec_hasta" date,
	"centro" text,
	"almacen" text,
	"comentario" text,
	"reenvios" integer DEFAULT 0 NOT NULL,
	"precio_forzado" text,
	"primera_emision_at" timestamp with time zone,
	"emitido_at" timestamp with time zone,
	"subtotal_emision" numeric(16, 2),
	"subtotal_actual" numeric(16, 2),
	"subtotal_final" numeric(16, 2),
	"lpu_actual_id" integer,
	"requiere_segunda_aprobacion" boolean DEFAULT false NOT NULL,
	"liquidacion_id" integer,
	"lock_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certificados_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "codigo_mo_alias" (
	"codigo_mo_id" integer NOT NULL,
	"alias" text NOT NULL,
	"origen" text NOT NULL,
	CONSTRAINT "codigo_mo_alias_codigo_mo_id_alias_pk" PRIMARY KEY("codigo_mo_id","alias")
);
--> statement-breakpoint
CREATE TABLE "codigos_mo" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "codigos_mo_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"codigo_s4" text NOT NULL,
	"descripcion" text NOT NULL,
	"alcance" text,
	"unidad" text NOT NULL,
	"categoria" text,
	"monto_abierto" boolean DEFAULT false NOT NULL,
	"requiere_segunda_aprobacion" boolean DEFAULT false NOT NULL,
	"requiere_factura" boolean DEFAULT false NOT NULL,
	"solo_urgencia" boolean DEFAULT false NOT NULL,
	"umbral_alerta" numeric(14, 4),
	"activo" boolean DEFAULT true NOT NULL,
	"reemplazado_por_id" integer,
	CONSTRAINT "codigos_mo_codigo_s4_unique" UNIQUE("codigo_s4")
);
--> statement-breakpoint
CREATE TABLE "consumos_sap" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "consumos_sap_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"certificado_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"tipo" text NOT NULL,
	"numero_documento" text NOT NULL,
	"fecha" date NOT NULL,
	"documento_id" uuid,
	"detalle" jsonb,
	"registrado_por" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contadores" (
	"clave" text PRIMARY KEY NOT NULL,
	"valor" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contratista_subregiones" (
	"contratista_id" integer NOT NULL,
	"subregion_id" integer NOT NULL,
	CONSTRAINT "contratista_subregiones_contratista_id_subregion_id_pk" PRIMARY KEY("contratista_id","subregion_id")
);
--> statement-breakpoint
CREATE TABLE "contratistas" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "contratistas_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"razon_social" text NOT NULL,
	"cuit" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"suspendido" boolean DEFAULT false NOT NULL,
	"centro_sap" text,
	"almacen_proyecto" text,
	"almacen_mantenimiento" text,
	CONSTRAINT "contratistas_cuit_unique" UNIQUE("cuit")
);
--> statement-breakpoint
CREATE TABLE "delegaciones" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "delegaciones_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"de_usuario_id" uuid NOT NULL,
	"a_usuario_id" uuid NOT NULL,
	"desde" date NOT NULL,
	"hasta" date NOT NULL,
	"motivo" text,
	"activa" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sha256" text NOT NULL,
	"nombre" text NOT NULL,
	"mime" text,
	"tamano" integer NOT NULL,
	"storage_key" text NOT NULL,
	"tipo" text DEFAULT 'otro' NOT NULL,
	"sensible" boolean DEFAULT false NOT NULL,
	"metadatos" jsonb,
	"subido_por" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eventos" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ocurrido_en" timestamp with time zone DEFAULT now() NOT NULL,
	"usuario_id" uuid,
	"usuario_nombre" text NOT NULL,
	"rol" text,
	"empresa" text,
	"en_nombre_de" text,
	"entidad" text NOT NULL,
	"entidad_id" text NOT NULL,
	"accion" text NOT NULL,
	"estado_desde" text,
	"estado_hasta" text,
	"cambios" jsonb,
	"comentario" text,
	"origen" jsonb,
	"hash_previo" text NOT NULL,
	"hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "flujos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "flujos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"clave" text NOT NULL,
	"version" integer NOT NULL,
	"definicion" jsonb NOT NULL,
	"vigente_desde" date NOT NULL,
	"publicado_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "imputaciones" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "imputaciones_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tipo" text NOT NULL,
	"numero" text NOT NULL,
	"descripcion" text,
	"presupuesto" numeric(16, 2),
	"activa" boolean DEFAULT true NOT NULL,
	CONSTRAINT "imputaciones_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "liquidaciones" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "liquidaciones_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"numero" text NOT NULL,
	"periodo_id" integer NOT NULL,
	"contratista_id" integer NOT NULL,
	"estado" text DEFAULT 'pendiente_factura' NOT NULL,
	"lpu_id" integer,
	"subtotal" numeric(16, 2) NOT NULL,
	"ajustes" numeric(16, 2) DEFAULT '0' NOT NULL,
	"iva" numeric(16, 2) NOT NULL,
	"total" numeric(16, 2) NOT NULL,
	"factura_documento_id" uuid,
	"factura_numero" text,
	"factura_importe" numeric(16, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cerrada_at" timestamp with time zone,
	CONSTRAINT "liquidaciones_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "lpu_precios" (
	"lpu_id" integer NOT NULL,
	"codigo_mo_id" integer NOT NULL,
	"lista" text NOT NULL,
	"precio" numeric(16, 4) NOT NULL,
	CONSTRAINT "lpu_precios_lpu_id_codigo_mo_id_lista_pk" PRIMARY KEY("lpu_id","codigo_mo_id","lista")
);
--> statement-breakpoint
CREATE TABLE "lpu_versiones" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lpu_versiones_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nombre" text NOT NULL,
	"vigencia_desde" date NOT NULL,
	"porcentaje_informado" numeric(8, 4),
	"estado" text DEFAULT 'borrador' NOT NULL,
	"archivo_id" uuid,
	"creado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"publicada_at" timestamp with time zone,
	"publicada_por" uuid,
	"resumen" jsonb
);
--> statement-breakpoint
CREATE TABLE "materiales" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "materiales_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"codigo_sap" text NOT NULL,
	"descripcion" text NOT NULL,
	"unidad" text NOT NULL,
	"grupo" text,
	"recuperable" boolean DEFAULT false NOT NULL,
	"umbral_alerta" numeric(14, 4),
	"precio_referencia" numeric(16, 2),
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "materiales_codigo_sap_unique" UNIQUE("codigo_sap")
);
--> statement-breakpoint
CREATE TABLE "notificaciones" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notificaciones_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"usuario_id" uuid NOT NULL,
	"titulo" text NOT NULL,
	"cuerpo" text,
	"link" text,
	"leida" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "observaciones_item" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "observaciones_item_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"aprobacion_id" integer NOT NULL,
	"item_id" integer NOT NULL,
	"comentario" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parametros" (
	"clave" text PRIMARY KEY NOT NULL,
	"valor" jsonb NOT NULL,
	"descripcion" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "periodos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "periodos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nombre" text NOT NULL,
	"fecha_corte" date NOT NULL,
	"estado" text DEFAULT 'abierto' NOT NULL,
	"cerrado_por" uuid,
	"cerrado_at" timestamp with time zone,
	CONSTRAINT "periodos_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "regiones" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "regiones_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	CONSTRAINT "regiones_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "reglas_codigo" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "reglas_codigo_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tipo" text NOT NULL,
	"codigo_mo_id" integer NOT NULL,
	"codigo_relacionado_id" integer,
	"parametro" text,
	"mensaje" text NOT NULL,
	"activa" boolean DEFAULT true NOT NULL,
	"creado_por" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revalorizaciones" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "revalorizaciones_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"certificado_id" uuid NOT NULL,
	"lpu_id" integer NOT NULL,
	"subtotal_anterior" numeric(16, 2) NOT NULL,
	"subtotal_nuevo" numeric(16, 2) NOT NULL,
	"motivo" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_cargas" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_cargas_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"contratista_id" integer NOT NULL,
	"fecha_foto" date NOT NULL,
	"documento_id" uuid,
	"cargado_por" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_items" (
	"carga_id" integer NOT NULL,
	"almacen" text NOT NULL,
	"material_id" integer NOT NULL,
	"cantidad" numeric(14, 4) NOT NULL,
	CONSTRAINT "stock_items_carga_id_almacen_material_id_pk" PRIMARY KEY("carga_id","almacen","material_id")
);
--> statement-breakpoint
CREATE TABLE "subregiones" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "subregiones_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"region_id" integer NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"poligono" jsonb,
	CONSTRAINT "subregiones_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "tarea_bitacora" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tarea_bitacora_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tarea_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"texto" text,
	"documento_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tarea_documentos" (
	"tarea_id" uuid NOT NULL,
	"documento_id" uuid NOT NULL,
	CONSTRAINT "tarea_documentos_tarea_id_documento_id_pk" PRIMARY KEY("tarea_id","documento_id")
);
--> statement-breakpoint
CREATE TABLE "tarea_mensajes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "tarea_mensajes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tarea_id" uuid NOT NULL,
	"usuario_id" uuid NOT NULL,
	"texto" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tareas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"numero" text NOT NULL,
	"tipo_trabajo" text NOT NULL,
	"subtipo" text,
	"titulo" text NOT NULL,
	"descripcion" text,
	"direccion" text,
	"lat" double precision,
	"lng" double precision,
	"subregion_id" integer NOT NULL,
	"base_id" integer,
	"contratista_id" integer,
	"solicitante_id" uuid NOT NULL,
	"supervisor_id" uuid,
	"imputacion_id" integer,
	"urgencia" boolean DEFAULT false NOT NULL,
	"urgencia_justificacion" text,
	"certificados_previstos" integer DEFAULT 1 NOT NULL,
	"fecha_tentativa" date,
	"presupuesto" numeric(16, 2),
	"datos_extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"estado" text NOT NULL,
	"flujo_id" integer NOT NULL,
	"tarea_padre_id" uuid,
	"modo_subtarea" text,
	"orden_subtarea" integer,
	"causal_espera" text,
	"causal_cierre" text,
	"estado_antes_pedido" text,
	"asignada_at" timestamp with time zone,
	"lock_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tareas_numero_unique" UNIQUE("numero")
);
--> statement-breakpoint
CREATE TABLE "usuario_roles" (
	"usuario_id" uuid NOT NULL,
	"rol" text NOT NULL,
	CONSTRAINT "usuario_roles_usuario_id_rol_pk" PRIMARY KEY("usuario_id","rol")
);
--> statement-breakpoint
CREATE TABLE "usuario_subregiones" (
	"usuario_id" uuid NOT NULL,
	"subregion_id" integer NOT NULL,
	CONSTRAINT "usuario_subregiones_usuario_id_subregion_id_pk" PRIMARY KEY("usuario_id","subregion_id")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"nombre" text NOT NULL,
	"apellido" text NOT NULL,
	"tipo" text NOT NULL,
	"contratista_id" integer,
	"supervisor_id" uuid,
	"cargo" text,
	"activo" boolean DEFAULT true NOT NULL,
	"no_disponible_hasta" date,
	"idp_subject" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email"),
	CONSTRAINT "usuarios_idp_subject_unique" UNIQUE("idp_subject")
);
--> statement-breakpoint
ALTER TABLE "ajustes" ADD CONSTRAINT "ajustes_contratista_id_contratistas_id_fk" FOREIGN KEY ("contratista_id") REFERENCES "public"."contratistas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ajustes" ADD CONSTRAINT "ajustes_certificado_id_certificados_id_fk" FOREIGN KEY ("certificado_id") REFERENCES "public"."certificados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ajustes" ADD CONSTRAINT "ajustes_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ajustes" ADD CONSTRAINT "ajustes_liquidacion_id_liquidaciones_id_fk" FOREIGN KEY ("liquidacion_id") REFERENCES "public"."liquidaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ajustes" ADD CONSTRAINT "ajustes_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_resuelta_por_usuarios_id_fk" FOREIGN KEY ("resuelta_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aprobaciones" ADD CONSTRAINT "aprobaciones_certificado_id_certificados_id_fk" FOREIGN KEY ("certificado_id") REFERENCES "public"."certificados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aprobaciones" ADD CONSTRAINT "aprobaciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aprobaciones" ADD CONSTRAINT "aprobaciones_en_nombre_de_usuarios_id_fk" FOREIGN KEY ("en_nombre_de") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bases" ADD CONSTRAINT "bases_subregion_id_subregiones_id_fk" FOREIGN KEY ("subregion_id") REFERENCES "public"."subregiones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificado_documentos" ADD CONSTRAINT "certificado_documentos_certificado_id_certificados_id_fk" FOREIGN KEY ("certificado_id") REFERENCES "public"."certificados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificado_documentos" ADD CONSTRAINT "certificado_documentos_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificado_items" ADD CONSTRAINT "certificado_items_certificado_id_certificados_id_fk" FOREIGN KEY ("certificado_id") REFERENCES "public"."certificados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificado_items" ADD CONSTRAINT "certificado_items_codigo_mo_id_codigos_mo_id_fk" FOREIGN KEY ("codigo_mo_id") REFERENCES "public"."codigos_mo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificado_items" ADD CONSTRAINT "certificado_items_material_id_materiales_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materiales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificado_items" ADD CONSTRAINT "certificado_items_factura_documento_id_documentos_id_fk" FOREIGN KEY ("factura_documento_id") REFERENCES "public"."documentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificado_versiones" ADD CONSTRAINT "certificado_versiones_certificado_id_certificados_id_fk" FOREIGN KEY ("certificado_id") REFERENCES "public"."certificados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificado_versiones" ADD CONSTRAINT "certificado_versiones_emitida_por_usuarios_id_fk" FOREIGN KEY ("emitida_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_tarea_id_tareas_id_fk" FOREIGN KEY ("tarea_id") REFERENCES "public"."tareas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_contratista_id_contratistas_id_fk" FOREIGN KEY ("contratista_id") REFERENCES "public"."contratistas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_flujo_id_flujos_id_fk" FOREIGN KEY ("flujo_id") REFERENCES "public"."flujos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_tomado_por_usuarios_id_fk" FOREIGN KEY ("tomado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificados" ADD CONSTRAINT "certificados_lpu_actual_id_lpu_versiones_id_fk" FOREIGN KEY ("lpu_actual_id") REFERENCES "public"."lpu_versiones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "codigo_mo_alias" ADD CONSTRAINT "codigo_mo_alias_codigo_mo_id_codigos_mo_id_fk" FOREIGN KEY ("codigo_mo_id") REFERENCES "public"."codigos_mo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumos_sap" ADD CONSTRAINT "consumos_sap_certificado_id_certificados_id_fk" FOREIGN KEY ("certificado_id") REFERENCES "public"."certificados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumos_sap" ADD CONSTRAINT "consumos_sap_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consumos_sap" ADD CONSTRAINT "consumos_sap_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratista_subregiones" ADD CONSTRAINT "contratista_subregiones_contratista_id_contratistas_id_fk" FOREIGN KEY ("contratista_id") REFERENCES "public"."contratistas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratista_subregiones" ADD CONSTRAINT "contratista_subregiones_subregion_id_subregiones_id_fk" FOREIGN KEY ("subregion_id") REFERENCES "public"."subregiones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegaciones" ADD CONSTRAINT "delegaciones_de_usuario_id_usuarios_id_fk" FOREIGN KEY ("de_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delegaciones" ADD CONSTRAINT "delegaciones_a_usuario_id_usuarios_id_fk" FOREIGN KEY ("a_usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_subido_por_usuarios_id_fk" FOREIGN KEY ("subido_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_periodo_id_periodos_id_fk" FOREIGN KEY ("periodo_id") REFERENCES "public"."periodos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_contratista_id_contratistas_id_fk" FOREIGN KEY ("contratista_id") REFERENCES "public"."contratistas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_lpu_id_lpu_versiones_id_fk" FOREIGN KEY ("lpu_id") REFERENCES "public"."lpu_versiones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_factura_documento_id_documentos_id_fk" FOREIGN KEY ("factura_documento_id") REFERENCES "public"."documentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lpu_precios" ADD CONSTRAINT "lpu_precios_lpu_id_lpu_versiones_id_fk" FOREIGN KEY ("lpu_id") REFERENCES "public"."lpu_versiones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lpu_precios" ADD CONSTRAINT "lpu_precios_codigo_mo_id_codigos_mo_id_fk" FOREIGN KEY ("codigo_mo_id") REFERENCES "public"."codigos_mo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lpu_versiones" ADD CONSTRAINT "lpu_versiones_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lpu_versiones" ADD CONSTRAINT "lpu_versiones_publicada_por_usuarios_id_fk" FOREIGN KEY ("publicada_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notificaciones" ADD CONSTRAINT "notificaciones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observaciones_item" ADD CONSTRAINT "observaciones_item_aprobacion_id_aprobaciones_id_fk" FOREIGN KEY ("aprobacion_id") REFERENCES "public"."aprobaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "observaciones_item" ADD CONSTRAINT "observaciones_item_item_id_certificado_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."certificado_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "periodos" ADD CONSTRAINT "periodos_cerrado_por_usuarios_id_fk" FOREIGN KEY ("cerrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reglas_codigo" ADD CONSTRAINT "reglas_codigo_codigo_mo_id_codigos_mo_id_fk" FOREIGN KEY ("codigo_mo_id") REFERENCES "public"."codigos_mo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reglas_codigo" ADD CONSTRAINT "reglas_codigo_codigo_relacionado_id_codigos_mo_id_fk" FOREIGN KEY ("codigo_relacionado_id") REFERENCES "public"."codigos_mo"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reglas_codigo" ADD CONSTRAINT "reglas_codigo_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revalorizaciones" ADD CONSTRAINT "revalorizaciones_certificado_id_certificados_id_fk" FOREIGN KEY ("certificado_id") REFERENCES "public"."certificados"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revalorizaciones" ADD CONSTRAINT "revalorizaciones_lpu_id_lpu_versiones_id_fk" FOREIGN KEY ("lpu_id") REFERENCES "public"."lpu_versiones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_cargas" ADD CONSTRAINT "stock_cargas_contratista_id_contratistas_id_fk" FOREIGN KEY ("contratista_id") REFERENCES "public"."contratistas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_cargas" ADD CONSTRAINT "stock_cargas_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_cargas" ADD CONSTRAINT "stock_cargas_cargado_por_usuarios_id_fk" FOREIGN KEY ("cargado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_carga_id_stock_cargas_id_fk" FOREIGN KEY ("carga_id") REFERENCES "public"."stock_cargas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_material_id_materiales_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materiales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subregiones" ADD CONSTRAINT "subregiones_region_id_regiones_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regiones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_bitacora" ADD CONSTRAINT "tarea_bitacora_tarea_id_tareas_id_fk" FOREIGN KEY ("tarea_id") REFERENCES "public"."tareas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_bitacora" ADD CONSTRAINT "tarea_bitacora_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_bitacora" ADD CONSTRAINT "tarea_bitacora_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_documentos" ADD CONSTRAINT "tarea_documentos_tarea_id_tareas_id_fk" FOREIGN KEY ("tarea_id") REFERENCES "public"."tareas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_documentos" ADD CONSTRAINT "tarea_documentos_documento_id_documentos_id_fk" FOREIGN KEY ("documento_id") REFERENCES "public"."documentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_mensajes" ADD CONSTRAINT "tarea_mensajes_tarea_id_tareas_id_fk" FOREIGN KEY ("tarea_id") REFERENCES "public"."tareas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarea_mensajes" ADD CONSTRAINT "tarea_mensajes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_subregion_id_subregiones_id_fk" FOREIGN KEY ("subregion_id") REFERENCES "public"."subregiones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_base_id_bases_id_fk" FOREIGN KEY ("base_id") REFERENCES "public"."bases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_contratista_id_contratistas_id_fk" FOREIGN KEY ("contratista_id") REFERENCES "public"."contratistas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_solicitante_id_usuarios_id_fk" FOREIGN KEY ("solicitante_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_supervisor_id_usuarios_id_fk" FOREIGN KEY ("supervisor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_imputacion_id_imputaciones_id_fk" FOREIGN KEY ("imputacion_id") REFERENCES "public"."imputaciones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tareas" ADD CONSTRAINT "tareas_flujo_id_flujos_id_fk" FOREIGN KEY ("flujo_id") REFERENCES "public"."flujos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_roles" ADD CONSTRAINT "usuario_roles_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_subregiones" ADD CONSTRAINT "usuario_subregiones_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuario_subregiones" ADD CONSTRAINT "usuario_subregiones_subregion_id_subregiones_id_fk" FOREIGN KEY ("subregion_id") REFERENCES "public"."subregiones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_contratista_id_contratistas_id_fk" FOREIGN KEY ("contratista_id") REFERENCES "public"."contratistas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alerta_entidad_idx" ON "alertas" USING btree ("entidad","entidad_id");--> statement-breakpoint
CREATE INDEX "aprob_cert_idx" ON "aprobaciones" USING btree ("certificado_id");--> statement-breakpoint
CREATE INDEX "item_cert_version_idx" ON "certificado_items" USING btree ("certificado_id","version");--> statement-breakpoint
CREATE INDEX "cert_estado_idx" ON "certificados" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "cert_tarea_idx" ON "certificados" USING btree ("tarea_id");--> statement-breakpoint
CREATE INDEX "cert_contratista_idx" ON "certificados" USING btree ("contratista_id","estado");--> statement-breakpoint
CREATE INDEX "alias_idx" ON "codigo_mo_alias" USING btree ("alias");--> statement-breakpoint
CREATE INDEX "doc_sha_idx" ON "documentos" USING btree ("sha256");--> statement-breakpoint
CREATE INDEX "evento_entidad_idx" ON "eventos" USING btree ("entidad","entidad_id");--> statement-breakpoint
CREATE UNIQUE INDEX "flujo_clave_version" ON "flujos" USING btree ("clave","version");--> statement-breakpoint
CREATE INDEX "notif_usuario_idx" ON "notificaciones" USING btree ("usuario_id","leida");--> statement-breakpoint
CREATE INDEX "tarea_estado_idx" ON "tareas" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "tarea_contratista_idx" ON "tareas" USING btree ("contratista_id","estado");--> statement-breakpoint
CREATE INDEX "tarea_solicitante_idx" ON "tareas" USING btree ("solicitante_id");--> statement-breakpoint
CREATE INDEX "tarea_subregion_idx" ON "tareas" USING btree ("subregion_id");