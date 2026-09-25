# 05 — Certificado

## Estructura

```
Certificado N° CERT-2026-000123  (versión 2)
├── Carátula
├── Mano de obra        (ítems sobre catálogo de códigos MO + preciario)
├── Materiales utilizados   (ítems sobre catálogo de materiales)
├── Materiales recuperados  (ítems sobre catálogo de materiales)
├── Documentación       (fotos, remitos, planillas, planos)
└── Totales
```

### Carátula

| Campo | Origen |
|---|---|
| N° de certificado y versión | Automático |
| N° de tarea, título, ubicación | De la tarea |
| Tipo: Mantenimiento / Eventos / Obra | De la tarea |
| **Imputación (OT o código de imputación)** | **Elegida por el contratista — obligatoria** |
| Solicitante y su supervisor | De la tarea (congelado) |
| Contratista (empresa, CUIT) y usuario que emite | Automático |
| Fechas: pedido, inicio y fin de ejecución, emisión | Tarea + contratista |
| Preciario aplicado (lista y vigencia) | Automático al emitir |
| Comentario del contratista sobre el trabajo | Contratista |

### Ítem de mano de obra

| Campo | Nota |
|---|---|
| Código MO | Del catálogo vigente. El sistema muestra descripción y **alcance** para que el contratista elija bien |
| Cantidad | En la unidad del código |
| Precio unitario | **Lo pone el sistema** desde el preciario; no editable por el contratista |
| Subtotal | Calculado |
| Requiere 2da aprobación | Congelado desde el catálogo |
| Observación | Opcional |

### Ítem de material (utilizado o recuperado)

| Campo | Nota |
|---|---|
| Código de material (SAP) | Del catálogo |
| Descripción, UM | Del catálogo |
| Cantidad | |
| Estado (solo recuperados) | Reutilizable / chatarra / otro, configurable |
| Observación | Opcional |

Los materiales **no llevan precio** en el certificado (se consumen de stock propio vía SAP). Si algún caso requiriera materiales provistos por el contratista con precio, se agrega como tipo de ítem aparte (ver 09).

### Documentación

- Archivos adjuntos con **tipo** (foto antes/después, remito, planilla, plano, otro).
- Se pueden reutilizar los avances y fotos cargados durante la ejecución.
- Cada archivo guarda hash SHA-256, quién lo subió y cuándo. **No se borran**: un reemplazo deja el anterior en el historial.
- Documentos obligatorios configurables por tipo de tarea (ej.: fotos antes/después para mantenimiento).

## Versiones

- Emitir congela la versión. Una versión emitida **no se modifica nunca**.
- Corregir tras una observación crea la versión siguiente, precargada con la anterior.
- El sistema muestra **diferencias campo a campo** entre versiones (ítems agregados, quitados, cantidades cambiadas, documentos nuevos).
- Las aprobaciones y observaciones quedan asociadas a la versión sobre la que se hicieron.

## Cálculo y dinero

- Moneda: ARS. Montos con precisión decimal exacta (nunca punto flotante).
- Total MO = Σ cantidad × precio unitario congelado.
- **Precio aplicable**: el del preciario vigente a la fecha de referencia. Por defecto, **fecha de emisión**; alternativa configurable: fecha de fin de ejecución (ver 09).
- Si el preciario cambia mientras el certificado está en BORRADOR, se recalcula y se avisa al contratista. Una vez emitido, queda congelado.
- Una nueva versión (por corrección) **mantiene la fecha de referencia** de la primera emisión, para que corregir no cambie el precio (configurable).

## Salidas

- **PDF del certificado** con carátula, ítems, totales, historial de aprobaciones (quién, cuándo) y hash de integridad.
- **Reporte de materiales** para SAP (Excel/CSV) con el formato que usa Administración.
