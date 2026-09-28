# Personal S.A. — Gestión de tareas y certificación de contratistas

MVP / prueba de concepto del sistema que reemplaza el circuito de mails y planillas Excel: pedido de tareas, ejecución, certificación sobre la LPU, aprobaciones con rechazos cruzados, validación de materiales para SAP, liquidación por período y auditoría inmutable.

La especificación funcional completa está en [`spec/`](spec/README.md).

## Puesta en marcha

Requisitos: Node 22, pnpm 10 y PostgreSQL 16.

```bash
pnpm install
cp .env.example .env            # ajustar DATABASE_URL y SESSION_SECRET
pnpm db:reset                   # crea el esquema, aplica migraciones y carga los datos de demo
pnpm dev                        # http://localhost:3000
```

Con Docker: `docker compose up --build` levanta PostgreSQL, migra, carga la demo y sirve la aplicación en el puerto 3000.

### Usuarios de demostración

En modo `AUTH_MODE=dev` la pantalla de ingreso muestra los usuarios de prueba (todos ficticios). Algunos útiles para recorrer el circuito:

| Usuario | Perfil | Qué ver |
|---|---|---|
| Lucía Fernández | Solicitante (inspectora) | Bandeja de validación técnica, nueva tarea, observar/aprobar |
| Martín Gómez | Supervisor | Pendientes de su equipo, aprobar en lugar de otro, auditoría |
| Carla Benítez | Gerente Capital | 2da aprobación, rechazo al solicitante |
| Sofía Acosta | Administración | Materiales: reporte SAP, documento de consumo, comparación, rebotes, stock |
| Valeria Ruiz | CERCO | Aprobación final, reglas por código, liquidaciones |
| Andrea Paz | Adm. de Obra | Aprobación final de obras |
| Gustavo Ibáñez | Compras | Importar y publicar la LPU desde el Excel |
| Mariana López | Contratista (Redes del Plata) | Certificar la tarea **T-AMBA-000014** (ejecutada, lista para certificar), facturas, stock, indicadores |
| Hernán Vega | Técnico de cuadrilla | App de campo (`/campo`), bitácora con fotos |
| Auditoría Interna | Auditor | Auditoría completa y verificación de la cadena |

### Recorrido sugerido: certificar como proveedor

1. En el ingreso, elegí el recorrido **“Certificar como proveedor”** (entra como Mariana López).
2. Abrí la tarea **T-AMBA-000014 · Reparación de empalme de fibra en cámara** (aparece en Mi bandeja → “Tareas ejecutadas pendientes de certificar”) y tocá **Certificar**.
3. Cargá la carátula (período y fechas), la mano de obra (por ejemplo `5900105` × 1, `5900103` × 48 y `5900104` × 48), el material `10200001` × 1 y el mismo código como recuperado, y traé las fotos de la bitácora.
4. Emití. Después ingresá como **Lucía Fernández** para validarlo y seguí el circuito.

Cada portal tiene un **Centro de ayuda** (`/i/ayuda` y `/c/ayuda`) con guías por perfil, el circuito, preguntas frecuentes y glosario, además de ayuda contextual en las pantallas principales.

## Pruebas

```bash
pnpm typecheck      # TypeScript estricto
pnpm test           # unitarias (dominio) + integración contra PostgreSQL (base sgt_test)
pnpm test:e2e       # recorrido por perfiles y circuito completo desde la interfaz (requiere la app corriendo y la base recién cargada)
```

- **Unitarias**: motor de flujo (permisos, delegaciones, suplencias, "nadie aprueba dos pasos", pools), dinero y política de precios, validaciones de emisión, reglas de CERCO, KML, cadena de auditoría, lectura y diferencia de la LPU.
- **Integración**: seguridad entre contratistas, alertas que bloquean la aprobación, concurrencia, rebote de materiales, comparación con el consumo SAP, reversa SAP al anular, revalorización al publicar una LPU (subas y bajas), cierre de período con ajustes y factura, inmutabilidad de la auditoría.
- **E2E**: todas las pantallas de 9 perfiles y el circuito completo pedido → certificado → aprobaciones → liquidación → factura, más rechazo del gerente y observación.

Para correr E2E con el Chromium del entorno: `CHROME_PATH=/ruta/a/chrome pnpm test:e2e`.

## Arquitectura

| Capa | Tecnología | Dónde |
|---|---|---|
| Interfaz | Next.js 16 (App Router), renderizado en servidor, Server Actions, React solo en islas (editor de certificado, alta de tarea) | `src/app`, `src/components` |
| Reglas de negocio puras | TypeScript sin dependencias de infraestructura | `src/domain` |
| Motor de flujo | Definiciones YAML versionadas + piezas en código | `flujos/`, `src/domain/flujo` |
| Servicios | Transacciones, efectos del flujo, auditoría, notificaciones | `src/server/servicios` |
| Datos | PostgreSQL 16 + Drizzle ORM, migraciones versionadas | `src/db`, `drizzle/` |
| Archivos | Almacenamiento direccionado por contenido (sha256) | `src/server/archivos.ts` |

Principios que el código respeta (ver `spec/01`):

- **Todas las reglas en el servidor.** La interfaz solo muestra las acciones que el motor habilita; cada acción se revalida al ejecutarse.
- **Una transacción por acción**: cambio de estado + efectos + evento de auditoría + notificaciones.
- **Auditoría inmutable**: tabla `eventos` de solo inserción (trigger que rechaza UPDATE/DELETE/TRUNCATE) con cadena de hashes verificable.
- **Versionado**: cada tarea y certificado queda anclado a la versión del flujo con la que nació; cada versión del certificado es inmutable al emitirse.
- **Dinero exacto**: aritmética decimal con BigInt; nunca punto flotante.

### Cambiar el circuito

Los circuitos están en `flujos/tarea.v1.yaml` y `flujos/certificado.v1.yaml`. Para cambiarlos se crea una versión nueva del archivo (por ejemplo `certificado.v2.yaml`), se valida con `pnpm test` (el motor rechaza estados inalcanzables, piezas inexistentes, etc.) y se publica. Las instancias existentes siguen en su versión.

## Estado del MVP

**Implementado**
- Tareas: pedido con subregión automática por polígono, urgencias, tarea múltiple secuencial o simultánea, aceptación con vencimiento a las 48 h, reasignación con liberación, espera con causal (tiempo muerto), desestimación con causal, avances, cambio de imputación y de tipo de trabajo (con conformidad del contratista), mensajes, bitácora de campo, alerta de posibles duplicados al supervisor.
- Certificados: editor con buscador por S4/alias, montos abiertos con justificación, recursos solicitados con factura, materiales y recuperados, documentos, validaciones bloqueantes y alertas (umbrales, reglas de CERCO, fotos y facturas repetidas, certificados tardíos), versiones con diferencias, retiro, observación por ítem, rechazos cruzados con reenvío, rebote de materiales, recuperar aprobación, tomar/soltar en pools, supervisor y delegados en lugar de otros, 2da aprobación por código, aprobación final CERCO / Adm. Obra, reversa SAP al anular.
- Precios: LPU con vigencias, importación del Excel de Compras con vista previa y reconversiones, revalorización automática según política configurable (subas/bajas, emisión/cierre), precio de emisión congelado por ítem.
- Liquidación: períodos con fecha de corte, congelamiento de precios, ajustes (débitos/créditos), factura con advertencia si no coincide.
- Materiales: reporte en formato SAP, registro del documento de consumo/ingreso con comparación automática, stock proyectado por contratista.
- Indicadores para personal y contratistas, auditoría con verificación de la cadena, impresión/PDF con huella de integridad, exportación a Excel.

**Pendiente para pasar de PoC a producción**
- Validar la integración OIDC con IDIRA (implementada según el estándar, no probada contra el IdP real).
- Driver de almacenamiento S3/GCS (hoy: disco local; la interfaz ya está aislada).
- Envío de mails de notificación (hoy: notificaciones dentro de la aplicación).
- Lectura automática de facturas y documentos SAP con IA (spec 12), editor visual de flujos, aprobación parcial con reclamos (el diseño y el parámetro existen).
- Importación periódica de materiales, PEP y OT desde SAP/Helix; sincronización de usuarios con el directorio.
- Decisiones pendientes con CERCO/Administración (spec 09: P1–P13).
