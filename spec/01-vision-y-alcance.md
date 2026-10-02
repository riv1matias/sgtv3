# 01 — Visión y alcance

## Situación actual

| Paso | Hoy | Punto ciego |
|---|---|---|
| Pedido | Mail al contratista | Sin registro central, sin fecha comprometida, sin contexto técnico estructurado |
| Ejecución | Sin seguimiento | Nadie sabe si empezó, si terminó ni cuánto tardó |
| Certificación | Excel del contratista, posiblemente con precios o códigos desactualizados | Errores de precio, códigos inexistentes, materiales mal identificados |
| Envío | Mail con adjuntos a administración | Se pierde la trazabilidad; versiones múltiples del mismo Excel |
| Aprobaciones | Cadena de mails | No se sabe dónde está trabado ni quién aprobó qué |
| Consumo SAP | Carga manual desde el Excel | Sin vínculo entre certificado y documento SAP |
| Pago | Fuera del sistema | El contratista no sabe cuánto tiene por cobrar ni por qué se demora |

## Objetivos

1. **Un solo lugar** para el pedido, la ejecución, la certificación y las aprobaciones.
2. **Certificar sobre catálogos oficiales**: el contratista elige códigos de MO y materiales de listas vigentes; el precio lo pone el sistema, no el Excel.
3. **Saber siempre dónde está cada cosa y quién la tiene**, con tiempos medidos.
4. **Rechazos cruzados ordenados**: cada rechazo tiene motivo, destinatario y camino de vuelta.
5. **Auditoría inmutable**: todo cambio con fecha, hora, nombre y apellido, sin posibilidad de alterarlo.
6. **Profesionalizar la relación con el contratista**: que ambas partes vean montos, demoras, rechazos y SLA con los mismos números.
7. **Flexibilidad**: cambiar el circuito, las reglas de aprobación, precios y catálogos sin reprogramar.

## Principios de diseño

- **El contenido del certificado es del contratista.** Los aprobadores no editan: aprueban o rechazan con observaciones (a nivel general o por ítem). Cualquier corrección la hace el contratista generando una nueva versión. Esto elimina disputas del tipo "yo no cargué eso".
- **Las aprobaciones valen para una versión de contenido.** Si el contenido cambia, las aprobaciones anteriores quedan registradas pero se invalidan y el circuito se reinicia.
- **Los precios se rigen por la LPU vigente al cierre del período de pago.** Hasta entonces el certificado se revaloriza con cada LPU nueva, dejando registro de cada importe; al cerrar la liquidación se congela para siempre. Las reglas (ej. qué códigos requieren 2da aprobación) se evalúan al emitir y quedan registradas.
- **El circuito es dato, no código** (ver 04). El código implementa las *piezas* (condiciones, efectos, actores); la *forma* del circuito se configura y se versiona.
- **Nada se borra.** Se anula, se reemplaza o se desactiva, siempre con registro.
- **Una sola fuente de verdad para los tiempos**: los indicadores se calculan desde el registro de eventos, no desde campos que alguien puede editar.

## Volumetría estimada (para dimensionar)

| Dato | Estimación |
|---|---|
| Usuarios | ~5.000 internos en el pico, más usuarios de contratistas |
| Contratistas | ~500 |
| Certificados | ~1 por día por contratista → **~500/día, ~10–15 mil/mes, ~150 mil/año** |
| Catálogos | ~1.250 códigos de MO por LPU, ~31.000 materiales |
| Archivos | El volumen más grande: si un certificado lleva ~20 MB de fotos y documentos, son **~10 GB/día, ~3 TB/año** |

Consecuencias de diseño:
- La base de datos maneja estos volúmenes sin problema (cientos de miles de certificados y millones de ítems y eventos son habituales para PostgreSQL). Un **monolito modular** alcanza; no hacen falta microservicios.
- Los archivos van a **almacenamiento de objetos** (S3 / GCS), subidos directo desde el navegador, con compresión de imágenes, miniaturas y políticas de ciclo de vida (pasar a almacenamiento frío lo cerrado hace más de N meses).
- Listados y tableros paginados y con indicadores precalculados.

## Entorno

- Infraestructura **corporativa**: AWS o GCP según defina el sector responsable (se diseña sin depender de servicios propietarios de uno u otro: contenedores, PostgreSQL administrado, almacenamiento de objetos compatible).
- Inicio de sesión con el **IdP corporativo** definido por Ciberseguridad (OIDC/SAML).

## Alcance del MVP

Incluido:
- Pedido de tarea, asignación, aceptación, ejecución.
- Certificado completo (carátula, MO, materiales utilizados, recuperados, documentos) sobre catálogos.
- Circuito de aprobación estándar configurable (ver 03) con rechazos cruzados.
- Varios certificados por tarea (avances) y liquidación por período con revalorización por LPU y factura.
- Registro de consumo SAP por administración (manual, con nº de documento SAP).
- LPU, materiales e imputaciones con vigencias e importación desde los Excel actuales.
- Auditoría inmutable y línea de tiempo.
- Tablero para personal y para contratistas (montos, tiempos, rechazos, SLA).
- Notificaciones in-app y por email.
- Exportaciones (reporte de materiales para SAP, reportes de certificados).

Fuera del MVP (previsto en el diseño, no implementado):
- Integración automática con SAP (consumo, OT, estado de pago).
- Editor visual de flujos (en el MVP el flujo se define en archivo versionado).
- Firma digital con validez legal.
- App móvil offline (el MVP es web adaptable a celular).
- Registro de pago efectivo (orden de pago, fecha de cobro).
- Aprobación parcial con circuito de reclamos (diseñado en 03 §6; se habilita por parámetro en una etapa posterior del MVP si se prioriza).
