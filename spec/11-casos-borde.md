# 11 — Casos borde

Situaciones puntuales que el circuito "feliz" no cubre. Para cada una: qué puede pasar, propuesta de tratamiento y si requiere decisión del negocio (**❓**). Las marcadas **★** son las de mayor impacto en el modelo.

## A. Tarea y asignación

| # | Caso | Riesgo | Propuesta |
|---|---|---|---|
| A1 ★❓ | **Trabajo de emergencia ejecutado antes de cargar la tarea** (siniestro, urgencia nocturna, pedido telefónico) | El circuito exige tarea → aceptación → ejecución; en la realidad el trabajo ya se hizo | Tarea de **regularización**: el solicitante la crea con fechas pasadas y queda marcada; ¿puede también el contratista proponerla y el solicitante confirmarla? Indicador de % regularizadas por solicitante/contratista |
| A2 ★ | **No se puede ejecutar**: sin acceso, falta permiso municipal, clima, espera de materiales, cliente ausente | La tarea queda "en ejecución" eternamente y ensucia los SLA | Estado **EN_ESPERA** con motivo tipificado y fecha estimada de reanudación; **pausa el SLA** del contratista. ¿Aplica costo mínimo diario si la cuadrilla fue y no pudo trabajar? ❓ |
| A3 | El contratista **no acepta ni rechaza** | Tarea en limbo | SLA de aceptación + recordatorio; vencido un plazo configurable, vuelve al solicitante como DEVUELTA (motivo "sin respuesta") |
| A4 ❓ | **Trabajo adicional detectado en campo**, fuera del alcance pedido | Se certifica algo que nadie pidió o se deja sin hacer | a) se certifica en la misma tarea como ítem adicional con justificación (lo valida el solicitante), o b) se abre tarea nueva vinculada. ¿Cuál es la práctica? |
| A5 | Trabajo que necesita **dos contratistas** (civil + fibra) | Una tarea = un contratista | Tareas separadas vinculadas bajo una **tarea padre / obra**, con costo consolidado |
| A6 ★❓ | **Tipo de trabajo mal cargado** (era obra y se cargó mantenimiento) | Cambia columna de precio y aprobador final | Editable por el solicitante hasta la primera emisión; después, solo anulando el certificado en curso. ¿Alguien más puede corregirlo? |
| A7 | **Contratista suspendido, dado de baja o deshabilitado en la subregión** con trabajo en curso | Trabajo hecho que no se puede cobrar | No recibe tareas nuevas, pero **puede certificar lo ya ejecutado**; alerta al solicitante sobre tareas no iniciadas para reasignar |
| A8 | **Solicitante deja la empresa / cambia de área / licencia larga** | Certificados sin validador | Reasignación **masiva** de sus pendientes por el supervisor; alerta automática si un usuario desactivado tiene pendientes |
| A9 | **Tareas duplicadas** (dos personas piden lo mismo) | Doble pago | Aviso al crear si hay tarea abierta en la misma dirección/base y tipo en los últimos N días |
| A10 | **Cancelación con trabajo parcial** o con cuadrilla ya movilizada | Conflicto por lo ya gastado | Se permite certificar lo ejecutado (y un eventual cargo de movilización con código AD) |
| A11 | **Reprogramaciones** de la fecha compromiso | Se pierde el historial de incumplimientos | Cada cambio de fecha compromiso con motivo; indicador de reprogramaciones |
| A12 | La base/dirección está en el **límite entre subregiones** | Gerente y administración equivocados | Manda la subregión **de ejecución**; el solicitante la elige y queda auditada |

## B. Contenido del certificado

| # | Caso | Riesgo | Propuesta |
|---|---|---|---|
| B1 ★ | **Doble certificación** del mismo trabajo (en dos certificados o dos tareas) | Pago duplicado | Alertas: mismas fotos (**hash repetido** en otro certificado), mismo código + cantidad + dirección + fecha, misma factura de terceros. No bloquean, marcan para el validador |
| B2 | **Cantidades atípicas** (tipeo 1000 en vez de 10) | Sobrepago | Tope por código y alerta si supera N veces el promedio histórico del código/contratista |
| B3 ❓ | **Reglas por código**: costo mínimo diario solo una vez por día, incompatible con ciertos códigos; adicionales solo junto a su código base | Montos abiertos mal usados | Validaciones configurables por código: máximo por día/certificado, incompatibilidades, "requiere código base". Necesitamos que Compras/CERCO nos pasen estas reglas |
| B4 | Fotos con **fecha o ubicación** que no coinciden con lo declarado | Evidencia débil | Leer metadatos (fecha, GPS) y mostrar alerta si están fuera del rango de ejecución o lejos de la dirección |
| B5 | **Trabajo viejo** certificado muy tarde (meses después) | Precio actualizado sobre trabajo antiguo, pérdida de control | Antigüedad máxima configurable; pasado el plazo requiere autorización extra ❓ |
| B6 | El contratista **se equivoca y quiere retirar** un certificado ya emitido | Tiene que esperar la observación | Acción **retirar** mientras el solicitante no lo haya tomado: vuelve a borrador (auditado) |
| B7 | Un aprobador **aprueba por error** | Sin vuelta atrás | **Revertir aprobación** mientras el paso siguiente no lo haya tomado |
| B8 | Certificado **solo con materiales** o solo recuperados, sin MO | ¿Es válido? | Permitido; la validación exige al menos un ítem de cualquier tipo |
| B9 | **Avances**: la suma de parciales supera lo previsto, o después del "final" aparece más trabajo | Tarea cerrada con trabajo pendiente | Se puede aumentar N y reabrir con motivo; alerta si el acumulado supera la estimación de la tarea |
| B10 | Unidades y **redondeo**: cantidades decimales en UN, redondeo por línea vs total | Diferencias de centavos con la factura | Decimales permitidos por unidad; redondeo por línea a 2 decimales, total = suma de líneas |
| B11 ❓ | **IVA**: ¿la LPU es neta? ¿los montos abiertos y facturas de recursos se cargan con o sin IVA? | Totales que no cierran contra la factura | Todo neto de IVA en el certificado; el IVA aparece solo en la liquidación/factura |
| B12 | **Recursos solicitados**: factura de terceros ya usada en otro certificado, de fecha fuera del período o de CUIT inválido | Doble cobro | Registrar nº, fecha, CUIT e importe de la factura de terceros; detectar repetidas |

## C. Materiales y SAP

| # | Caso | Riesgo | Propuesta |
|---|---|---|---|
| C1 ★ | **Rechazo o corrección después de consumir en SAP** (CERCO rechaza, el contratista corrige materiales en una nueva versión) | Consumo duplicado o incorrecto en SAP | Los **consumos registrados** son un registro aparte del certificado. En la nueva versión, Administración ve solo el **diferencial** a consumir o reversar |
| C2 ★ | **Certificado anulado** con materiales ya consumidos | Stock inconsistente | La anulación genera una **tarea de reversa** para Administración (documento SAP de anulación) |
| C3 | SAP no permite el consumo (sin stock en el almacén, centro mal elegido) | Certificado trabado | Administración puede corregir **centro/almacén** (datos logísticos, no cantidades), auditado |
| C4 | **Recuperados declarados que no llegan** al almacén, o llegan menos | Faltante de material | Confirmación de recepción de recuperados (futuro: por almacén); alerta si no se confirma en N días |
| C5 ❓ | **Stock en poder del contratista** (material entregado en custodia) | Sin control de lo entregado vs consumido | ¿Existe esta práctica? Si sí, módulo futuro de cuenta corriente de materiales por contratista |
| C6 | La **imputación cambia después** del consumo en SAP | Consumo imputado a otro PEP | La imputación se fija en el momento en que se registra el consumo, no al aprobar el paso |

## D. Precios y LPU

| # | Caso | Riesgo | Propuesta |
|---|---|---|---|
| D1 ★❓ | **LPU con vigencia retroactiva** (se publica el 25 con vigencia desde el 1°) y hay liquidaciones ya cerradas en ese rango | Diferencias sin pagar | ¿Se pagan diferencias retroactivas? Si sí: **certificado de ajuste por redeterminación** automático por contratista, en la próxima liquidación |
| D2 ★❓ | Un precio **baja** en la LPU nueva | El contratista cobra menos de lo que emitió | ¿Se aplica igual la LPU del cierre, o se paga el mayor entre emisión y cierre? |
| D3 | Un código **se da de baja** en la LPU nueva con certificados en curso | No hay precio para revalorizar | Se mantiene el último precio vigente y se marca para revisión |
| D4 | **LPU publicada con error** y corregida | Revalorizaciones mal hechas | "Rectificar LPU": reemplaza la versión y recalcula; si algo ya cerró, genera ajuste |
| D5 | Dos LPU publicadas en el mismo período | Confusión | Siempre rige la vigente a la fecha de corte; queda la traza de todas |

## E. Aprobaciones y personas

| # | Caso | Riesgo | Propuesta |
|---|---|---|---|
| E1 ★ | **Misma persona en dos pasos** (el solicitante es también gerente o su delegado) | Autoaprobación | Regla: nadie aprueba dos pasos del mismo certificado; se deriva al siguiente en la jerarquía o a un delegado |
| E2 | Delegaciones **en cadena o circulares** | Nadie actúa | Una delegación no se puede redelegar; se valida al crearla |
| E3 | Alguien de un pool **toma** un certificado y se va | Queda trabado | Se libera solo tras N horas sin actividad |
| E4 | Gerente de la subregión **vacante** | Nadie aprueba | Fallback configurable: gerente regional, u otro designado |
| E5 | **Ping-pong** entre solicitante y quien rechaza (reenviar sin cambios una y otra vez) | Ciclo infinito | Después de N idas y vueltas, escalamiento automático al supervisor/gerente |
| E6 | El contratista **nunca corrige** un OBSERVADO | Pendientes eternos | Recordatorios; anulación automática opcional tras N días ❓ |
| E7 | Cambian el **gerente elegido** con el certificado ya en ese paso | Pérdida de trazabilidad | Permitido solo con motivo; el certificado se mueve de bandeja |
| E8 | Se publica un **flujo nuevo** y un certificado tiene como "paso de origen" un estado que ya no existe | Estado huérfano | Los certificados siguen en su versión de flujo; migrar exige un mapeo explícito validado |
| E9 | Dos personas actúan **a la vez** sobre el mismo certificado | Acciones pisadas | Control de concurrencia: la segunda acción falla con aviso "el certificado cambió" |

## F. Liquidación, facturación y pago

| # | Caso | Riesgo | Propuesta |
|---|---|---|---|
| F1 ★❓ | **Contratos / órdenes de compra marco**: el contratista trabaja bajo una o varias OC con monto y vigencia | Hoy no está modelado: se podría certificar sin OC vigente o sin saldo | Agregar **contrato/OC** como dato maestro: vigencia, monto, saldo consumido; liquidación por OC; alerta de saldo |
| F2 ★❓ | **Fondo de reparo / retención de garantía** (típico de obra), **multas** por incumplimiento, **anticipos** | La liquidación no refleja lo que realmente se paga | ¿Existen? Si sí, conceptos de descuento en la liquidación, configurables por contrato |
| F3 | La **factura no coincide** con la liquidación | Pago incorrecto | Tolerancia configurable; si no coincide se rechaza la factura con motivo y se pide otra |
| F4 | Error detectado **después del cierre** | Sin mecanismo de corrección | **Ajustes negativos** (débito) en la próxima liquidación; nota de crédito del contratista |
| F5 | El contratista **no sube la factura** | Liquidación abierta indefinidamente | Recordatorios y aging; el precio ya está congelado |
| F6 | Certificado aprobado **un día después del corte** | Queda para el próximo período | Correcto por regla; indicador de cuántos quedan fuera por pocos días (mide cuellos de botella) |
| F7 | La liquidación debe separarse por **imputación o por OC** para cargar en SAP | Una factura para varias OC | Definir la unidad de liquidación junto con F1 |

## G. Sistema, datos y transición

| # | Caso | Riesgo | Propuesta |
|---|---|---|---|
| G1 ★❓ | **Puesta en marcha**: certificados en curso en Excel el día del arranque | Doble circuito | Fecha de corte: lo emitido antes termina por el circuito viejo; se pueden cargar tareas abiertas como "legado". Arranque por **piloto** en una subregión |
| G2 | Contratista con **muchos trabajos chicos** por día | Carga lenta en web | Carga rápida desde celular y, en transición, **importar el certificado desde el Excel actual** |
| G3 | **Sin señal en campo** | Fotos que no suben | Carga diferida: se toman offline y se suben después (la app offline completa queda fuera del MVP) |
| G4 | Usuarios de contratista **compartiendo credenciales** | La auditoría pierde valor | Cuentas personales obligatorias, segundo factor, alerta por sesiones simultáneas |
| G5 | **Datos personales** en fotos/documentos (DNI, rostros, domicilios de clientes) | Ley 25.326 | Clasificación de documentos sensibles, acceso restringido, retención definida |
| G6 | **Retención legal** de documentación | Borrar antes de tiempo o guardar para siempre | Política de retención (ej. 10 años) con paso a almacenamiento frío |
| G7 | Un ex-empleado pasa a trabajar para un contratista (o al revés) | Mezcla de accesos | Una cuenta no puede ser interna y de contratista a la vez; historial conservado |
| G8 | **Exportación masiva** de datos por contratistas | Fuga de información | Exportaciones limitadas a lo propio y auditadas |
