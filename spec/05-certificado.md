# 05 — Certificado

Un único modelo de certificado para **Obras, Mantenimiento y Eventos**, que reemplaza las dos planillas actuales (ver 10).

## Estructura

```
Certificado CERT-2026-000123 · versión 2 · certificado 2 de 4 (tarea T-AMBA-004512)
├── Carátula                (comunes + campos adicionales del tipo de trabajo)
├── Mano de obra            (códigos de la LPU) — OBLIGATORIA
│   └── Ítems de monto abierto (AD): costo mínimo diario, adicionales, recursos solicitados
├── Materiales utilizados   (catálogo de materiales SAP) — opcional
├── Materiales recuperados  (catálogo de materiales SAP + estado) — opcional
├── Documentación           (obligatoria, cualquier formato)
└── Totales                 (subtotal neto, IVA 21%, total — a la emisión / actual / final pagado)
```

## Carátula

### Campos comunes

| Campo | Origen |
|---|---|
| Nº de certificado, versión, "n de N", ¿es final? | Automático |
| Nº de tarea, título | Tarea |
| Tipo de trabajo: Mantenimiento / Eventos / Obra | Tarea |
| Región, subregión, base/nodo, dirección, ciudad | Tarea |
| Contratista (razón social, CUIT) y usuario que emite | Automático |
| Solicitante, supervisor e inspector a cargo | Tarea |
| **Imputación** (WO / PEP / orden de controlling) | **Tarea — definida por el solicitante**; el contratista la ve pero no la cambia |
| Período de certificación | Contratista (por defecto, el período en curso) |
| Fechas reales de ejecución (desde – hasta) | Contratista |
| Centro y almacén de consumo de materiales (uno de cada uno) | Contratista, de la lista habilitada |
| Urgencia (sí/no) y su justificación | Tarea |
| Comentario del contratista | Contratista |

### Campos adicionales por tipo de trabajo (configurables)

| Obras | Mantenimiento | Eventos |
|---|---|---|
| Proyecto (código y nombre) | Subtipo: correctivo, preventivo, siniestro, edificios, edificios orden real | A definir |
| Etapa / tareas / ICD | Tipo de red: BBI, CU, FO, FTTH, HFC | |
| Grafo | Nº de acta | |
| | Nº de siniestro (12 caracteres, si es siniestro) | |
| | EHS | |
| | ¿Aplica costo mínimo diario? | |

Se definen como **datos**: un administrador puede agregar, quitar o volver obligatorio un campo por tipo sin programar.

## Mano de obra

| Campo | Nota |
|---|---|
| Código | Buscador por **S4 o cualquier alias** (código viejo, ex-Teco, ex-Cable, código R), descripción o categoría. Solo muestra códigos **aplicables al tipo de trabajo** (precio > 0 en esa columna de la LPU) |
| Descripción, unidad, alcance | Del catálogo |
| Cantidad | |
| Precio unitario | **Lo pone el sistema** desde la LPU vigente; nunca lo carga el contratista |
| Subtotal | Calculado |
| Requiere 2da aprobación | Del catálogo |
| Observación | Opcional |

### Ítems de monto abierto (unidad AD)

Códigos como *Costo mínimo diario*, *Recursos solicitados*, *Adicional viáticos*, *Adicional fin de semana y feriado*:

- El contratista carga **el importe** (no cantidad × precio).
- **Justificación obligatoria**.
- **Recursos solicitados** (materiales o insumos provistos por el contratista): **factura del proveedor adjunta obligatoria**, con nº, fecha, CUIT e importe (cargados a mano en el MVP; leídos automáticamente más adelante, ver 12). No se cargan como materiales. Alerta si el importe difiere de la factura o si la factura ya se usó en otro certificado.
- **Costo mínimo diario**: como máximo **uno por certificado** (no por día).
- **Código de urgencia**: solo si la tarea está marcada como urgencia.
- Normalmente disparan la **2da aprobación**.
- **No se revalorizan** al cambiar la LPU (el importe es el que se cargó).

## Validaciones y alertas

- **Bloqueantes** (no deja emitir): al menos un ítem de **mano de obra**, al menos un documento, imputación asignada, montos abiertos justificados, facturas de recursos solicitados adjuntas, campos obligatorios del tipo de trabajo.
- **Alertas** (no bloquean; las ve el validador): cantidades por encima del umbral del código, reglas de CERCO incumplidas ("B solo con A"), fotos repetidas en otro certificado, mismo código + cantidad + dirección + fecha en otro certificado, fotos cuyos metadatos (fecha/GPS) no coinciden, códigos dados de baja, certificado tardío.
- Cada alerta queda registrada junto con quién la vio y cómo se resolvió.

## Materiales utilizados

| Campo | Nota |
|---|---|
| Código de material SAP | Buscador por código nuevo, código viejo, texto breve o descripción |
| Descripción, UM, grupo/tipo | Del catálogo |
| Cantidad | |
| Observación | |

Los materiales **no se pagan** al contratista: se consumen de stock propio en SAP. Si el catálogo tiene precio de material, el sistema muestra el **valorizado** a modo informativo (costo total de la tarea).

## Materiales recuperados

Igual que utilizados, más el **estado**: utilizable / no utilizable / chatarra (lista configurable) y almacén de destino.

## Documentación

- **Obligatoria**: no se puede emitir sin al menos un documento.
- **Cualquier formato**: imágenes, PDF, Excel, Word, **.dwg** y otros. Tamaño máximo por archivo configurable.
- Clasificación opcional: fotos antes/después, conforme a obra, remitos, facturas, planos, actas, otros.
- **Quien decide si alcanza es el solicitante** en la validación técnica; no hay una lista fija por tipo de tarea.
- Se pueden reutilizar los avances cargados durante la ejecución.
- Cada archivo guarda hash SHA-256, quién lo subió y cuándo. **No se borran**: un reemplazo deja el anterior en el historial.
- Vista previa de imágenes y PDF en el sistema; el resto se descarga.

## Antigüedad

Si el trabajo se certifica más tarde que la **antigüedad máxima** configurable (desde la fecha de ejecución), la emisión requiere **autorización**, y quien autoriza elige si se paga a **precio de emisión o actualizado** (por si la demora fue interna).

## Versiones

Se ve **cómo mutó el certificado desde la primera emisión hasta el pago**: versiones de contenido, retiros, rebotes, revalorizaciones y ajustes, en una sola línea de tiempo.

- Emitir congela el **contenido** de la versión: ítems, cantidades y documentos no se modifican nunca más.
- Corregir crea la versión siguiente, precargada con la anterior.
- **Diferencias campo a campo** entre versiones.
- Aprobaciones y observaciones quedan asociadas a la versión sobre la que se hicieron.
- La **revalorización por LPU** no es una nueva versión: cambia importes, no contenido, y queda registrada aparte (ver 03 §5).

## Importes

- Moneda ARS, precisión decimal exacta. Redondeo a 2 decimales por línea (⏳ confirmar contra el Excel actual).
- La LPU es **neta**. Subtotal = Σ (cantidad × precio unitario LPU) + Σ montos abiertos; **IVA 21%** (alícuota configurable); **Total** = subtotal + IVA.
- Se guardan tres importes: **a la emisión**, **actual** (con la última LPU) y **final pagado** (congelado al cierre de la liquidación), más la diferencia entre emisión y final.

## Salidas

- **PDF del certificado**: carátula, ítems, totales, historial de aprobaciones con nombre y fecha, hash de integridad. Reemplaza la firma manuscrita.
- **Reporte de consumo de materiales para SAP** con el formato actual: código, descripción, cantidad, centro, almacén, PEP, grafo, cuenta, CeBe, observaciones.
- **Reporte de recuperados** para ingreso en almacén.
