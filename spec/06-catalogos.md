# 06 — Catálogos

Todos los catálogos siguen la misma regla: **nada se sobrescribe**. Un cambio crea un registro nuevo con **vigencia desde**, y el anterior queda con su vigencia hasta. Así cualquier certificado se puede reconstruir con los datos que regían ese día.

## Códigos de mano de obra (dueño: Compras)

| Campo | Nota |
|---|---|
| Código | Único |
| Descripción corta | |
| **Alcance** | Texto largo: qué incluye y qué no. Se muestra al certificar y al aprobar |
| Unidad | Hora, unidad, metro, global, etc. |
| Categoría / especialidad | Eléctrico, civil, etc. |
| Tipos de tarea aplicables | Mantenimiento / Eventos / Obra |
| **Requiere 2da aprobación** | Sí/No — con vigencia |
| Activo | Dar de baja no afecta certificados existentes |

## Preciario (dueño: Compras)

- Una **lista de precios** tiene nombre, vigencia desde/hasta y estado (borrador → publicada).
- Contiene un precio por código de MO.
- Se publica completa: al publicar la nueva, la anterior se cierra automáticamente.
- Se puede preparar en borrador y programar su vigencia.
- Opcional (ver 09): precios diferenciados por contrato, contratista o zona.

## Materiales

| Campo | Nota |
|---|---|
| Código de material (SAP) | Único |
| Descripción | |
| Unidad de medida | |
| Recuperable | Si puede aparecer como recuperado |
| Activo | |

El **stock** vive en SAP. En el MVP el sistema no lleva stock propio; como mucho puede mostrar un stock informativo importado.

## Imputaciones (OT / códigos de imputación)

| Campo | Nota |
|---|---|
| Número | OT o código |
| Tipo | OT / código de imputación |
| Descripción | |
| Tipos de tarea permitidos | Opcional |
| Región / área | Opcional, para filtrar lo que ve el contratista |
| Vigente | Solo las vigentes pueden elegirse |

## Importación masiva

Compras y Administración trabajan en Excel. Para cada catálogo:

1. Subir Excel/CSV con formato definido (plantilla descargable).
2. El sistema muestra una **vista previa del cambio**: altas, bajas, modificaciones, errores.
3. Confirmar con fecha de vigencia.
4. Todo queda auditado (quién importó, archivo original guardado).

## Integración futura con SAP

Diseñado para que más adelante materiales, imputaciones/OT y consumos se sincronicen con SAP sin cambiar el modelo: cada catálogo guarda su **origen** (manual, importación, SAP) y el identificador externo.
