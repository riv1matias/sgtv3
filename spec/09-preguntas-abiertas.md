# 09 — Decisiones y preguntas abiertas

## Decisiones tomadas

| # | Tema | Decisión | Dónde |
|---|---|---|---|
| D1 | Aceptación de la tarea | Explícita. Antes de aceptar se puede reasignar libremente; si el contratista rechaza vuelve al solicitante; una vez aceptada, reasignar requiere que el contratista la libere; en ejecución no se reasigna | 03 §1 |
| D2 | Quién pide tareas | Técnicos, inspectores, supervisores, analistas | 02 |
| D3 | Elección de contratista | Libre, entre los habilitados en la subregión. Usuarios y contratistas en una o más subregiones; visibilidad y métricas por subregión y rango | 02 |
| D4 | Varios certificados por tarea | Sí. La tarea declara la cantidad prevista (editable siempre) y cada certificado es "n de N" | 03 §2 |
| D5 | Precio | LPU vigente **al cierre del período de pago**. Se revaloriza hasta entonces; al cerrar se congela. Se guarda importe a la emisión, final y diferencia | 03 §5 |
| D6 | Materiales del contratista | Se pagan como MO con el código "Recursos solicitados" + factura adjunta. No van en materiales | 05 |
| D7 | Imputación | La define el solicitante al pedir la tarea; editable hasta Administración inclusive; el contratista no la cambia | 03 §3 |
| D8 | Carátula | Unificada: campos comunes + campos adicionales configurables por tipo de trabajo | 05, 10 |
| D9 | Documentación | Obligatoria, cualquier formato; la suficiencia la valida el solicitante | 05 |
| D10 | Gerente de 2da aprobación | El de la subregión donde se ejecuta; el solicitante puede elegir otro; delegaciones por ausencia | 02 |
| D11 | Disparador de 2da aprobación | Solo códigos marcados (costo mínimo diario, adicionales, recursos solicitados…). No el monto | 03 §3 |
| D12 | Rechazo de Administración o CERCO | Va al solicitante, que decide | 03 §4 |
| D13 | Aprobación final | Todo o nada por defecto; modalidad parcial configurable con circuito de reclamos y certificado de ajuste | 03 §6 |
| D14 | Fin del ciclo | Por ahora cierra con la factura adjunta; lo posterior (orden de pago, pago) queda a definir | 03 §5 |
| D15 | LPU | Precio por tipo de trabajo (Mantenimiento / Obras); se importa el mismo Excel que manda Compras | 06 |
| D16 | Imputaciones | WO (Helix, manual por tarea), PEP y orden de controlling (SAP, con presupuesto) | 06 |
| D17 | Infraestructura | Nube corporativa (AWS o GCP) sin dependencias propietarias; login por IdP corporativo | 01 |

## Preguntas abiertas

### Surgidas del análisis de las planillas

1. **Agrupación en mantenimiento.** La planilla de mantenimiento junta varias actas/OT en un certificado. Propuesta: **cada acta u OT es una tarea** con su certificado, y la agrupación se hace en la **liquidación** del período (una factura por liquidación). ¿Funciona así, o el contratista necesita emitir un certificado que agrupe varias tareas?
2. **Factura**: ¿el contratista factura **por certificado** o **una factura por período** que cubre varios certificados?
3. **Período de pago**: ¿es mensual? ¿La fecha de corte es fija (ej. el 20) y es la misma para todos los contratistas y regiones?
4. **Eventos**: ¿se cotiza con la columna de Mantenimiento, con la de Obras o tiene su propia lista?
5. ¿La LPU es **nacional** o hay una por región? (el archivo de mantenimiento es "CABA").
6. **Datos de compras** (NPA, OE, HES, WE): ¿quién los carga y en qué paso? ¿Son necesarios para cerrar?
7. **Revalorización y montos abiertos**: los ítems AD (costo mínimo diario, adicionales) se dejan con el importe cargado y no se actualizan con la LPU. ¿Correcto?
8. **Revalorización y aprobaciones**: una revalorización cambia el importe sin volver a pedir aprobaciones (las cantidades no cambian). ¿Correcto?

### Organización y acceso

9. **Contratistas y el IdP**: ¿Ciberseguridad los va a dar de alta como externos en el IdP corporativo, o el sistema maneja su propio acceso con segundo factor?
10. ¿Quién mantiene la estructura (subregiones, jerarquías, habilitación de contratistas por subregión)? ¿Hay alguna fuente (RRHH, directorio) para sincronizarla?
11. ¿Administración de Obra tiene alcance nacional como CERCO o regional?

### Datos

12. ¿Se puede obtener periódicamente de SAP: materiales, PEP/órdenes CO con su **presupuesto**, centros y almacenes? ¿Y de Helix las WO?
13. ¿Los materiales tienen un precio de referencia que podamos importar para el valorizado?
14. Tamaño máximo razonable por archivo adjunto (los .dwg y videos pueden ser grandes).
