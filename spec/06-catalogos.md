# 06 — Catálogos y datos maestros

Regla general: **nada se sobrescribe**. Cada cambio queda con **vigencia desde** y el anterior se conserva, para reconstruir cualquier certificado con los datos de su momento.

## LPU — Lista de Precios Unitarios (dueño: Compras)

Es el catálogo de **códigos de mano de obra y sus precios**. Hoy llega como Excel "cada tanto", sin frecuencia fija.

### Código de mano de obra

| Campo | Nota |
|---|---|
| **Código S4** | Identificador canónico (ej. 5022316) |
| Alias | Código (99xxxxxxx), ex-Teco, ex-Cable, código R (ZCIE). Todos buscables |
| Descripción | |
| **Alcance** | Qué incluye y qué no. Se muestra al certificar y al aprobar |
| Unidad | UN, M, M2, M3, KM, MZA, H, **AD** (monto abierto), etc. |
| Categoría | Mantenimiento, Civil, RD, FO, CAB, Adicional, Proyectos, Eventos… |
| **Requiere 2da aprobación** | Sí/No, con vigencia |
| **Monto abierto** | Si la unidad es AD: el importe lo carga el contratista |
| **Requiere factura adjunta** | Ej. Recursos solicitados |
| **Umbral de alerta** | Cantidad (o importe, si es AD) a partir de la cual se alerta; según la unidad |
| Solo urgencias | Si el código solo es certificable en tareas marcadas como urgencia |
| Activo | Dar de baja no afecta certificados existentes |

### Versión de LPU

- Nombre, **fecha de publicación** (cuando se carga), **fecha de vigencia** (desde cuándo rige; puede ser anterior o posterior a la publicación), % de actualización informado, archivo original.
- Un precio por código y por **lista de precio**: hoy **Mantenimiento** y **Obras** (y Eventos, a confirmar). El modelo admite más listas (ej. por zona) sin cambios.
- Precio 0 o vacío = **el código no aplica** a ese tipo de trabajo.
- Ciclo: **borrador → publicada**. Al publicarla:
  1. Se cierra la anterior.
  2. Se **revalorizan** los certificados no cerrados, según la **política de precios** (ver 03 §5).
  3. Se notifica a contratistas y aprobadores con un resumen del impacto.

### Importación de la LPU

Se importa **el mismo Excel que manda Compras** (hoja Maestro/LPU: categoría, código, alias, S4, descripción, unidad, $ Mantenimiento, $ Obras, vigencia):

1. Subir el archivo.
2. **Vista previa del cambio**: códigos nuevos, dados de baja, cambios de descripción y de unidad, variación de precio por código (y promedio contra el % informado), errores (códigos duplicados, unidades desconocidas).
3. Declarar **reconversiones** de códigos dados de baja (reemplazo o fusión con otro código). Los certificados en curso con un código dado de baja sin reconversión mantienen el último precio y muestran un aviso.
4. Confirmar y publicar (o dejar en borrador con vigencia futura).

Si una LPU publicada tenía errores, se **rectifica**: la versión se reemplaza, se recalcula lo no cerrado y lo cerrado genera un ajuste.

## Reglas de negocio por código (dueño: CERCO)

CERCO define reglas sobre cómo se combinan y se pagan los códigos. Se cargan como **datos**, generan **alertas** (no bloquean) y quedan versionadas:

| Tipo de regla | Ejemplo |
|---|---|
| Requiere código base | "El adicional X solo se paga junto con el código Y" |
| Incompatibilidad | "Z no puede ir en el mismo certificado que W" |
| Máximo por certificado | "Costo mínimo diario: 1 por certificado" |
| Condición de tarea | "Código de urgencia solo si la tarea es urgencia", "solo en obras" |
| Proporción | "La cantidad de A no puede superar la de B" |

Más adelante, un asistente de IA ayuda a CERCO a proponer reglas nuevas (ver 12).

## Materiales (SAP)

| Campo | Nota |
|---|---|
| **Código SAP (ID nuevo)** | Canónico |
| Códigos anteriores | Tabla de equivalencias (el Excel de obras trae ~45.000) |
| Texto breve, descripción | |
| Marca, grupo de artículo, tipo, subtipo | Para filtrar |
| Unidad de medida | |
| Recuperable | |
| Precio de referencia | Opcional, para el valorizado |
| Umbral de alerta | Cantidad a partir de la cual se alerta |
| Activo | |

~31.000 materiales. Carga inicial desde la planilla actual; después, importación periódica desde SAP.

### Stock del contratista

- Cada contratista tiene un **centro** SAP y **dos almacenes**: **proyecto** y **mantenimiento**. La imputación de la tarea define de cuál se consume.
- Administración sube el **stock de SAP** cuando lo considera necesario (Excel exportado de SAP); queda registrada la **fecha de la foto**.
- El sistema muestra al contratista y a Administración:
  - stock a la fecha de la última carga;
  - menos lo **certificado y aún no consumido** en SAP;
  - = **stock proyectado**, para anticipar faltantes y rebotes.
- El stock real sigue siendo el de SAP; el sistema solo lo refleja.

## Imputaciones

Tres tipos, todos elegibles por el solicitante:

| Tipo | Origen | Particularidad |
|---|---|---|
| **OT / WO de Helix** | Sistema **Helix** | Mantenimiento. Se asigna manualmente a cada tarea |
| **PEP (proyecto ARATO)** | SAP | Obras. Partida con **presupuesto** que se va consumiendo |
| **Orden de controlling (OC)** | SAP | Similar al PEP, sin presupuesto conocido |

No se modelan contratos ni órdenes de compra marco: al contratista solo se le indica la imputación.

- Las de SAP se importan periódicamente (Excel/CSV al inicio, integración más adelante).
- Para los PEP, si se importa el **presupuesto**, el sistema muestra **consumido / comprometido / disponible** según los certificados (ver 08). Ese dato es **interno**: el contratista no ve presupuestos.
- Las WO de Helix se cargan a mano en la tarea (validando el formato) o se importan si Helix lo permite.
- Los proyectos de obra (ARATO-xxxxx) se relacionan con su PEP.

## Organización

| Catálogo | Contenido inicial |
|---|---|
| Regiones | AMBA, Litoral, Mediterránea, PBA y Patagonia |
| Subregiones | ~16, cada una con su **polígono KML** operativo |
| Bases / nodos / localidades | ~160, cada una en una subregión |
| Contratistas | ~260 (razón social, CUIT, subregiones habilitadas, usuarios) |
| Centros y almacenes SAP | Por contratista: 1 centro + almacén de proyecto + almacén de mantenimiento |
| Tipos de trabajo y subtipos | Obra / Mantenimiento (correctivo, preventivo, siniestro, edificios, edificios orden real) / Eventos |
| Tipos de red | BBI, CU, FO, FTTH, HFC |
| Proyectos de obra | Código + nombre + PEP |

## Campos adicionales por tipo de trabajo

Definibles por un administrador: nombre, tipo (texto, número, fecha, lista), obligatoriedad, validación (ej. siniestro = 12 caracteres), en qué tipo/subtipo aplica. Así la carátula se adapta sin programar.

## Importación genérica

Todos los catálogos se pueden importar desde Excel/CSV con plantilla descargable, **vista previa del cambio**, confirmación con vigencia y auditoría (se guarda el archivo original).

## Integraciones futuras

Cada registro guarda su **origen** (manual, importación, SAP, Helix) y su ID externo, para sincronizar más adelante sin cambiar el modelo.
