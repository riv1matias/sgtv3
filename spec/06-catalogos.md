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
| Activo | Dar de baja no afecta certificados existentes |

### Versión de LPU

- Nombre, **fecha de vigencia**, % de actualización informado, archivo original.
- Un precio por código y por **lista de precio**: hoy **Mantenimiento** y **Obras** (y Eventos, a confirmar). El modelo admite más listas (ej. por zona) sin cambios.
- Precio 0 o vacío = **el código no aplica** a ese tipo de trabajo.
- Ciclo: **borrador → publicada**. Al publicarla:
  1. Se cierra la anterior.
  2. Se **revalorizan** los certificados no cerrados (ver 03 §5).
  3. Se notifica a contratistas y aprobadores con un resumen del impacto.

### Importación de la LPU

Se importa **el mismo Excel que manda Compras** (hoja Maestro/LPU: categoría, código, alias, S4, descripción, unidad, $ Mantenimiento, $ Obras, vigencia):

1. Subir el archivo.
2. **Vista previa del cambio**: códigos nuevos, dados de baja, cambios de descripción y de unidad, variación de precio por código (y promedio contra el % informado), errores (códigos duplicados, unidades desconocidas).
3. Confirmar y publicar (o dejar en borrador con vigencia futura).

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
| Activo | |

~31.000 materiales. Carga inicial desde la planilla actual; después, importación periódica desde SAP. El **stock** sigue en SAP.

## Imputaciones

Tres tipos, todos elegibles por el solicitante:

| Tipo | Origen | Particularidad |
|---|---|---|
| **WO (Work Order)** | Sistema **Helix** | Se asigna manualmente a cada tarea |
| **PEP / elemento de imputación** | SAP | Partida con **presupuesto** asignado a una obra, que se va consumiendo |
| **Orden de controlling (CO)** | SAP | Similar a la anterior |

- Las de SAP se importan periódicamente (Excel/CSV al inicio, integración más adelante).
- Para los PEP, si se importa el **presupuesto**, el sistema muestra **consumido / comprometido / disponible** según los certificados (ver 08).
- Las WO de Helix se cargan a mano en la tarea (validando el formato) o se importan si Helix lo permite.
- Los proyectos de obra (ARATO-xxxxx) se relacionan con su PEP.

## Organización

| Catálogo | Contenido inicial |
|---|---|
| Regiones | AMBA, Litoral, Mediterránea, PBA y Patagonia |
| Subregiones | ~16 |
| Bases / nodos / localidades | ~160, cada una en una subregión |
| Contratistas | ~260 (razón social, CUIT, subregiones habilitadas, usuarios) |
| Centros y almacenes SAP | Por subregión |
| Tipos de trabajo y subtipos | Obra / Mantenimiento (correctivo, preventivo, siniestro, edificios, edificios orden real) / Eventos |
| Tipos de red | BBI, CU, FO, FTTH, HFC |
| Proyectos de obra | Código + nombre + PEP |

## Campos adicionales por tipo de trabajo

Definibles por un administrador: nombre, tipo (texto, número, fecha, lista), obligatoriedad, validación (ej. siniestro = 12 caracteres), en qué tipo/subtipo aplica. Así la carátula se adapta sin programar.

## Importación genérica

Todos los catálogos se pueden importar desde Excel/CSV con plantilla descargable, **vista previa del cambio**, confirmación con vigencia y auditoría (se guarda el archivo original).

## Integraciones futuras

Cada registro guarda su **origen** (manual, importación, SAP, Helix) y su ID externo, para sincronizar más adelante sin cambiar el modelo.
