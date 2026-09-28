# 11 — Casos borde y su resolución

Situaciones puntuales que el circuito "feliz" no cubre, con la **decisión tomada**. Lo que sigue pendiente está marcado **⏳**. Cada decisión se refleja en el documento indicado.

## A. Tarea y asignación

| # | Caso | Decisión | Ver |
|---|---|---|---|
| A1 | **Urgencias** pedidas por teléfono/WhatsApp, ejecutadas antes o durante la carga en el sistema | No importa si la ejecución fue antes: el solicitante **carga la tarea igual** (pide la imputación). Se marca **urgencia** al crearla, con justificación obligatoria (observación y/o documentación), porque el ítem de urgencia se paga con un diferencial. El código de urgencia solo es certificable si la tarea nació marcada como urgencia | 03 |
| A2 | **No se pudo ejecutar** / trabajo trabado | a) **Cierre sin certificado** con causal tipificada (no se pudo hacer, sin acceso, duplicada, etc.): lo propone el contratista o el solicitante, **requiere justificación aprobada por el solicitante**, y la tarea termina como DESESTIMADA. b) **En espera** (permisos, acceso, materiales): no cuenta tiempo al contratista, pero el **tiempo muerto se registra** para auditoría e indicadores | 03 |
| A3 | Contratista **no acepta ni rechaza** | A las **48 h** vuelve sola al solicitante. Antes de eso el solicitante puede reasignarla | 03 |
| A4 | **Trabajo adicional** detectado en campo | El contratista elige: a) certificarlo **en la misma tarea** como ampliación, con justificación y documentación, que el solicitante aprueba en la validación técnica; o b) **pedir una tarea nueva por ampliación de alcance**: si el solicitante la aprueba, se crea una tarea vinculada | 03 |
| A5 | Trabajo que requiere **varios contratistas** | **Tarea múltiple**: al pedirla, el solicitante define una subtarea por contratista y si son **secuenciales** (una espera que termine la otra) o **simultáneas** | 03 |
| A6 | **Tipo de trabajo mal cargado** | El solicitante lo puede cambiar antes o después de certificar. Si ya hay certificado, el cambio requiere **conformidad del contratista** (que queda anoticiado del cambio de precios) | 03 |
| A7 | Contratista **suspendido o deshabilitado** con trabajo en curso | Puede certificar lo ya ejecutado. ⏳ Plazo máximo entre ejecutada y certificada antes de desestimarla | 03 |
| A8 | **Solicitante ausente o que dejó la empresa** | Su supervisor puede **aprobar en su lugar** o **reasignar** a otro validador, con causal. La auditoría conserva el solicitante original y el cambio | 02 |
| A9 | **Posibles duplicados** | No se bloquea: se **alerta al supervisor** cuando dos personas piden tareas cercanas (misma zona, mismo tipo, fechas próximas) y él decide | 03 |
| A10 | **Cancelación con trabajo parcial** | Se permite certificar lo hecho; qué códigos usar lo acuerdan solicitante y contratista, y se resuelve en la validación | 03 |
| A11 | **Fechas compromiso** | **No hay fecha compromiso**. Las tareas no se agendan; como mucho una fecha tentativa opcional. Se miden tiempos, no incumplimientos de agenda | 03, 08 |
| A12 | **Subregión de la tarea** | Se define **automáticamente por la ubicación**, cruzando la coordenada con los polígonos (KML) de las subregiones operativas. Si no cae en ninguno, el solicitante elige | 02, 06 |

## B. Contenido del certificado

| # | Caso | Decisión | Ver |
|---|---|---|---|
| B1 | **Doble certificación** | Alertas no bloqueantes para el validador: fotos repetidas (hash), mismo código + cantidad + dirección + fecha, factura de terceros repetida | 05 |
| B2 | **Cantidades atípicas** | Umbrales de alerta **configurables por código** de MO y de material, según su unidad. Solo alertan, no bloquean | 06 |
| B3 | **Reglas de negocio por código** | Las define **CERCO** y se cargan como reglas configurables ("B solo se paga junto con A", "máximo X por certificado", etc.). **Costo mínimo diario: uno por certificado** (no por día; tres cuadrillas en tres tareas pueden llevar uno cada una). Alertan, no bloquean. A futuro, **asistente de IA** para CERCO | 06, 12 |
| B4 | **Evidencia desde el campo** | Si las fotos traen metadatos (fecha, GPS) se usan para validar; si no, no pasa nada. Se agrega el **módulo de cuadrillas del contratista** (ver B4+) | 05 |
| B4+ | **Gestión interna del contratista** | El contratista **subasigna** tareas a sus técnicos/cuadrillas; los técnicos cargan observaciones y fotos en una bitácora; cuando terminan, el administrativo del contratista arma y emite el certificado | 02, 03 |
| B5 | **Certificado muy tardío** | Antigüedad máxima configurable. Pasado el plazo requiere **autorización**, y quien autoriza elige si se paga a **precio de emisión o actualizado** (por si la demora fue interna) | 05 |
| B6 | **Retirar un certificado emitido** | Si nadie lo tomó, el contratista lo retira solo. Si el solicitante ya lo tomó, el contratista **pide el retiro** y el solicitante lo aprueba. **Versionado completo**: se ve cómo mutó desde la primera emisión hasta el pago | 03, 05 |
| B7 | **Aprobación por error** | Se puede **recuperar**, escalonadamente, con observación. Si el paso siguiente ya lo tomó, hace falta su conformidad | 03 |
| B8 | **¿Certificado sin MO?** | **No.** La mano de obra es obligatoria; materiales y recuperados son opcionales | 05 |
| B9 | **Avances que exceden lo previsto** | Se puede aumentar la cantidad de certificados y reabrir, con motivo. El **presupuesto y el avance económico son internos**: el contratista nunca los ve. Solo las obras tienen presupuesto; mantenimiento y eventos no | 03, 08 |
| B10 | **Decimales y redondeo** | Unidad predefinida por código. ⏳ Redondeo: 2 decimales por línea hasta confirmar cómo lo hace hoy el Excel | 05 |
| B11 | **IVA** | La LPU es **neta**. El certificado muestra **subtotal, IVA (21%) y total**, igual que la planilla actual. Alícuota configurable | 05 |
| B12 | **Facturas de terceros** (recursos solicitados) | Lectura automática de la factura (**OCR/IA**) para extraer nº, fecha, CUIT e importe. Alerta si el importe difiere del ítem cargado o si la factura ya se usó | 05, 12 |

## C. Materiales y SAP

| # | Caso | Decisión | Ver |
|---|---|---|---|
| C1 | **Diferencias entre lo declarado y lo consumido** | **CERCO no mira materiales**: solo Administración los observa o corrige. Administración **sube el documento de consumo SAP** (con el detalle, si es posible) y el sistema lo **compara** con lo declarado por el contratista (en el MVP, comparando un Excel exportado; a futuro con IA sobre el documento). Cada alerta se resuelve con motivo, y queda auditado qué material, qué error y cómo se resolvió | 03, 12 |
| C2 | **Anulación con materiales consumidos** | Si el certificado se anula y tenía materiales consumidos, se dispara un estado final para Administración: **"pendiente de reversa en SAP"**, que se cierra subiendo el documento de reversa | 03 |
| C3 | **Rebotes** (material consumido que no está en stock SAP) | Administración **rebota** el certificado: el contratista corrige los materiales o justifica su origen. Es un ida y vuelta entre Administración y contratista | 03 |
| C4 | **Recuperados** | Igual que el consumo: Administración sube el **documento de ingreso** de recuperados y se compara | 03 |
| C5 | **Stock en poder del contratista** | **Módulo de stock**: cada contratista tiene un **centro** y **dos almacenes** (proyecto y mantenimiento). Administración sube el stock de SAP cuando quiere (queda la fecha). El sistema muestra ese stock menos lo **certificado y aún no consumido**, para que el contratista vea su stock proyectado | 06 |
| C6 | **Cambio de imputación** | Lo pueden cambiar el solicitante o Administración en su paso; si hace falta, vuelve al contratista. La imputación define dónde se paga la MO y **de qué almacén se consume** (proyecto o mantenimiento) | 03 |

## D. Precios y LPU

| # | Caso | Decisión | Ver |
|---|---|---|---|
| D1 | **Fecha de publicación vs. vigencia** | Son fechas distintas y **manda la vigencia**. Lo que se emite a partir de la fecha de vigencia toma el precio nuevo | 03, 06 |
| D2 | **Qué hacer con certificados en curso si la LPU sube o baja** | **Política de precios configurable** (ver 03 §5): fecha de referencia (emisión o cierre) y, por separado, si se aplica la variación cuando **sube** y cuando **baja**. ⏳ Valores por defecto a definir con CERCO | 03 |
| D3 | **Código dado de baja** con certificados en curso | Se mantiene el último precio, con un **aviso** en el certificado. La LPU nueva puede declarar **reconversiones**: el código viejo se reemplaza o se fusiona con otro | 06 |
| D4 | **LPU con error** | "Rectificar LPU": reemplaza la versión y recalcula; si algo ya cerró, genera un ajuste | 06 |
| D5 | **Dos LPU en el mismo período** | Rige la que corresponda según la política de precios; queda la traza de todas | 06 |

## E. Aprobaciones y personas

| # | Caso | Decisión | Ver |
|---|---|---|---|
| E1 | **Misma persona en dos pasos** | Nadie aprueba dos pasos del mismo certificado: se deriva al **siguiente en la jerarquía**. Si el supervisor del solicitante aprueba en su lugar, sigue al gerente (si corresponde) o a Administración | 02 |
| E2 | **Delegaciones** | La delegación de una aprobación **se puede traspasar** las veces que haga falta (de solicitante en solicitante hasta que alguien apruebe). Lo que no se delega es el rol en sí | 02 |
| E3 | **Alguien toma algo y se traba** | **Todo usuario tiene un supervisor** (el del solicitante, el de Administración, el de CERCO…), que puede aprobar donde quedó o reasignar. **Entre gerentes** se pueden tomar pendientes sin pedir permiso. Administración y CERCO trabajan como pool | 02 |
| E4 | **Gerente ausente** | Nunca está vacante: siempre lo suplanta otro gerente o un subordinado designado | 02 |
| E5 | **Ping-pong** de reenvíos | Después de N idas y vueltas (configurable) se escala al supervisor | 03 |
| E6 | **Observados sin corregir** | Alertas que escalan en criticidad a medida que se acerca el **cierre del mes** | 03, 08 |
| E7 | **Cambio de gerente** | El gerente es siempre **el de la subregión**. Solo se cambia si está marcado **de vacaciones o no disponible** | 02 |
| E8 | **Flujo nuevo con certificados en curso** | Siguen en su versión; migrar exige un mapeo explícito y validado | 04 |
| E9 | **Dos personas a la vez** | La segunda acción falla con el aviso: "El certificado cambió mientras lo revisabas" / "Lo está trabajando *Nombre Apellido*" | 04 |

## F. Liquidación, facturación y pago

| # | Caso | Decisión | Ver |
|---|---|---|---|
| F1 | **Contratos / OC marco** | **No se modelan.** Al contratista se le indica la imputación: **PEP** de proyecto (ARATO), **orden de controlling** u **OT de Helix** (mantenimiento). Las variantes internas las manejan solicitante, supervisor o Administración | 06 |
| F2 | **Descuentos** por pagos mal hechos o incumplimientos detectados después del pago | Se registran como **nota de débito / ajuste negativo** en una liquidación siguiente, con motivo y documentación | 03 |
| F3 | **Factura que no coincide** | Sin validaciones bloqueantes por ahora. Si se exige la factura, se lee y se compara, y solo se **advierte** | 03, 12 |
| F4 | **Error después del cierre** | Ajuste negativo (débito) en la próxima liquidación; nota de crédito del contratista | 03 |
| F5 | **No sube la factura** | Recordatorios y antigüedad; el precio ya está congelado | 03 |
| F6 | **Aprobado después del corte** | Queda para el próximo período | 03 |
| F7 | **Unidad de liquidación** | ⏳ A definir con CERCO/Administración (¿por contratista, por imputación?) | 03 |

## G. Sistema, datos y transición

| # | Caso | Decisión | Ver |
|---|---|---|---|
| G1 | **Puesta en marcha** | Fecha de corte: lo emitido antes termina por el circuito viejo | — |
| G2 | **Carga de muchos trabajos chicos** | Carga rápida desde celular (bitácora de cuadrillas, B4+) y, en la transición, importar el Excel actual | 05 |
| G3 | **Sin señal en campo** | Carga diferida de fotos; la app offline completa queda fuera del MVP | — |
| G4 | **Credenciales compartidas** | Cuentas personales obligatorias, segundo factor, alerta por sesiones simultáneas | 02 |
| G5 | **Datos personales** | Clasificación de documentos sensibles, acceso restringido, retención definida | 07 |
| G6 | **Retención** | ⏳ La que fije Legales por normativa; configurable | 07 |
| G7 | **Cuenta interna y de contratista** | No puede ser ambas a la vez; se conserva el historial | 02 |
| G8 | **Exportaciones de contratistas** | Solo lo propio, auditadas y con campos limitados | 08 |
