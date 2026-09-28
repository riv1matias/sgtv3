# 09 — Decisiones y preguntas abiertas

## Decisiones tomadas

| # | Tema | Decisión | Dónde |
|---|---|---|---|
| D1 | Aceptación de la tarea | Explícita, **sin fecha compromiso**. 48 h sin respuesta → vuelve al solicitante. Antes de aceptar se reasigna libremente; aceptada, requiere que el contratista la libere; en ejecución no se reasigna | 03 §1 |
| D2 | Quién pide tareas | Técnicos, inspectores, supervisores, analistas | 02 |
| D3 | Elección de contratista | Libre, entre los habilitados en la subregión. Usuarios y contratistas en una o más subregiones; visibilidad y métricas por subregión y rango | 02 |
| D4 | Varios certificados por tarea | Sí. La tarea declara la cantidad prevista (editable siempre) y cada certificado es "n de N" | 03 §2 |
| D5 | Precio | Manda la **fecha de vigencia** de la LPU. **Política de precios configurable** (fecha de referencia, qué hacer si sube o baja). Se guarda importe a la emisión, revalorizaciones, final y diferencia (revisado en D1/D2) | 03 §5 |
| D6 | Materiales del contratista | Se pagan como MO con el código "Recursos solicitados" + factura adjunta. No van en materiales | 05 |
| D7 | Imputación | La define el solicitante al pedir la tarea; editable hasta Administración inclusive; el contratista no la cambia | 03 §3 |
| D8 | Carátula | Unificada: campos comunes + campos adicionales configurables por tipo de trabajo | 05, 10 |
| D9 | Documentación | Obligatoria, cualquier formato; la suficiencia la valida el solicitante | 05 |
| D10 | Gerente de 2da aprobación | Siempre el de la subregión; solo cambia si está marcado de vacaciones o no disponible (revisado en E7) | 02 |
| D11 | Disparador de 2da aprobación | Solo códigos marcados (costo mínimo diario, adicionales, recursos solicitados…). No el monto | 03 §3 |
| D12 | Rechazo de Administración o CERCO | Va al solicitante, que decide | 03 §4 |
| D13 | Aprobación final | Todo o nada por defecto; modalidad parcial configurable con circuito de reclamos y certificado de ajuste | 03 §6 |
| D14 | Fin del ciclo | Por ahora cierra con la factura adjunta; lo posterior (orden de pago, pago) queda a definir | 03 §5 |
| D15 | LPU | Precio por tipo de trabajo (Mantenimiento / Obras); se importa el mismo Excel que manda Compras | 06 |
| D16 | Imputaciones | WO (Helix, manual por tarea), PEP y orden de controlling (SAP, con presupuesto) | 06 |
| D18 | Casos borde | Todas las resoluciones de casos puntuales están en **11** | 11 |
| D17 | Infraestructura | Nube corporativa (AWS o GCP) sin dependencias propietarias; login por IdP corporativo | 01 |

## Preguntas abiertas

### Respondidas en la ronda de casos borde (ver 11)

Q1 (agrupación en mantenimiento), Q3 (período), Q5 (LPU por región), Q7 (montos abiertos y revalorización), Q8 (revalorización sin reaprobar): se adopta la propuesta por defecto salvo que se indique lo contrario. Q6 (datos de compras): no se piden al contratista.

### Pendientes

| # | Tema | Con quién |
|---|---|---|
| P1 | **Política de precios**: fecha de referencia (emisión o cierre) y qué hacer si un precio **baja** | CERCO |
| P2 | **Unidad de liquidación** (por contratista, por imputación) y si la factura es por certificado o por período | CERCO / Administración |
| P3 | Fecha de corte y frecuencia del período de pago | CERCO / Administración |
| P4 | Plazo máximo entre tarea ejecutada y certificada; antigüedad máxima para certificar | CERCO |
| P5 | Reglas de negocio por código (combinaciones, máximos) para cargar en el motor de reglas | CERCO |
| P6 | Tras un **rebote de materiales**, ¿el solicitante vuelve a ver los materiales corregidos o va directo a Administración? | Administración |
| P7 | Redondeo usado hoy (¿2 decimales por línea?) | CERCO |
| P8 | Eventos: ¿qué columna de precio usa? | Compras |
| P9 | Acceso de contratistas: ¿IdP corporativo como externos o acceso propio? | Ciberseguridad |
| P10 | Política de retención documental | Legales |
| P11 | Fuentes de datos: SAP (materiales, PEP con presupuesto, stock) y Helix (OT); formatos de exportación disponibles | Sistemas / Administración |
| P12 | Formato del documento de consumo SAP que subiría Administración (¿Excel exportable con detalle?) | Administración |
| P13 | KML de subregiones operativas | Operaciones |
