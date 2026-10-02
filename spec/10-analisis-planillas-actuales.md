# 10 — Análisis de las planillas actuales

Análisis de los dos modelos de certificado en Excel que se usan hoy, para unificarlos en un solo certificado digital. Solo se relevó **estructura y datos maestros**; las macros no se analizaron. Las planillas no se versionan en este repo (contienen datos reales).

- **Obras**: `Certificado Modelo Proyecto (OC 01-07-2026).xlsx`
- **Mantenimiento**: `NUEVA PLANILLA APP LPU 010625 V7 - CABA.xlsb`

## Hojas y su equivalente en el sistema

| Obras | Mantenimiento | En el sistema |
|---|---|---|
| CARÁTULA | CARATULA (sección superior) | Carátula del certificado (05) |
| Mano de Obra, Facturacion | CARATULA (bloque MANO DE OBRA), VALORIZACION2 | Ítems de mano de obra |
| Materiales | CARATULA (bloque DESCARGA MATERIALES) | Ítems de materiales utilizados |
| Materiales Recuperados | — | Ítems de materiales recuperados |
| Formulario consumo y aceptacion | — | **Reporte de consumo para SAP** (paso de Administración) |
| Maestro | LPU010625 | **LPU** — catálogo de códigos de MO + precios (06) |
| Cod de mat. (~45.000 filas) | MATERIALES_SAP (~31.000 filas) | Catálogo de materiales + tabla de equivalencias de códigos viejos |
| Listas en la carátula | DATOS | Regiones, subregiones, bases, contratistas, tipos de tarea, tipos de red |
| — | ZCIE, conversion R | **Alias** de códigos de MO (códigos "R" de otro sistema) |
| — | PLANOS Y FOTOS | Documentación adjunta |
| Hoja1, Hoja2 | CABA | Subconjuntos de códigos / listas auxiliares — no se trasladan |

## Hallazgos que impactan el diseño

### 1. Los códigos de MO tienen varios identificadores
Cada código aparece con: `CÓDIGO` (99xxxxxxx), `Nuevo cod SAP exTeco`, `Nuevo cod SAP exCable`, **`S4`** (50xxxxx) y además un **código R** (ZCIE). El sistema usa **S4 como identificador canónico** y guarda los demás como **alias** buscables, para que el contratista encuentre el código como lo conoce.

### 2. La LPU tiene un precio por tipo de trabajo
Misma lista de códigos, dos columnas de precio: **$ MANTENIMIENTO** y **$ OBRAS** (en la LPU de obras 2026, ~390 de ~670 códigos tienen precios distintos). Precio **0** en una columna significa que el código **no aplica** a ese tipo. Los códigos de categoría "Eventos" se cotizan con alguna de las dos columnas (confirmar cuál, ver 09).
La LPU trae encabezado con **vigencia** y el **% de actualización** respecto de la anterior (ej.: 11,28% en 06/2025, 12,51% en 07/2026).

### 3. Ítems de "monto abierto" (unidad AD)
Hay códigos con unidad **AD** y precio unitario **1**: la cantidad es directamente el importe en pesos. Ejemplos: *Costo mínimo diario*, *Recursos solicitados*, *Adicional viáticos*, *Adicional fin de semana y feriado*, *Adicional categoría*. Son justamente los que requieren **2da aprobación**, y "Recursos solicitados" es por donde se pagan los materiales provistos por el contratista (con factura). El sistema los trata como tipo de ítem especial: importe libre, justificación y adjunto obligatorios.

### 4. Categorías de código
Mantenimiento, CIVIL, RD, FO, CAB, Adicional, Proyectos, Eventos, EVTS/MTO/OBRAS. Sirven para filtrar el buscador de códigos.

### 5. El certificado de mantenimiento agrupa varios trabajos
En la planilla de mantenimiento cada línea de MO lleva **Nº de acta, Nº de OT y fecha de ejecución**: un certificado junta varias actas del período. En obras, el certificado es por **proyecto y período** ("tareas realizadas entre…", "período de certificación: julio"). Esto se resuelve con **agrupación de tareas en un certificado** (ver 03 y 09).

### 6. Carátula: común + específica por tipo
| Común | Solo Obras | Solo Mantenimiento |
|---|---|---|
| Contratista, Nº certificado | Proyecto (ARATO-xxxxx) y nombre | Tipo de tarea: correctivo, preventivo, siniestro, edificios, edificios orden real |
| Región / subregión / base o nodo, dirección, ciudad | Etapa / tareas / ICD | Tipo de red: BBI, CU, FO, FTTH, HFC |
| Supervisor e inspector a cargo | PEP (imputación, obligatorio) | Nº de siniestro (12 caracteres) |
| Período de certificación, fechas de ejecución | Grafo | EHS |
| Centro y almacén de consumo de materiales (uno solo) | | ¿Aplica costo mínimo diario? (según acuerdo) |
| Firmas contratista / empresa | | |

→ Carátula con **campos comunes** + **campos adicionales configurables por tipo de trabajo** (06).

### 7. Consumo de materiales en SAP
El "Formulario de consumos" de obras define el formato que Administración necesita: código, descripción, cantidad, **centro, PEP, grafo, cuenta, CeBe**, observaciones, y el valorizado total. Mantenimiento: catálogo, descripción, unidad, cantidad, centro, almacén. El reporte de materiales del sistema debe reproducir estos formatos.

### 8. Datos de facturación
La hoja Facturacion de obras tiene **NPA, OE, HES, WE** (documentos de compras SAP). Son datos que completa personal propio en el tramo final; se agregan como campos del paso de CERCO/Adm. Obra o del cierre (ver 09).

### 9. Materiales valorizados
Aunque los materiales no se pagan al contratista, las planillas calculan un **valorizado de materiales** (precio de material). Útil para indicadores de costo total de la tarea; requiere precio de material en el catálogo (opcional, importado de SAP).

### 10. Maestros de organización (hoja DATOS)
4 regiones (AMBA, Litoral, Mediterránea, PBA y Patagonia), 16 subregiones, ~160 bases/localidades, ~260 contratistas. Sirven como carga inicial.

### 11. Materiales recuperados
Obras distingue para recuperados **Utilizado / No usado**: el estado del material recuperado es un atributo del ítem.
