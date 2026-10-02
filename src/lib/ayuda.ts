/**
 * Contenido del centro de ayuda. Describe el funcionamiento vigente (spec/ y flujos/*.yaml):
 * si cambia una regla o un circuito, actualizar también este texto.
 */

export type Portal = 'i' | 'c'

export interface Guia { id: string; titulo: string; para: Portal[]; roles?: string[]; resumen: string; pasos: Array<{ titulo: string; texto: string }> }

export const GUIAS: Guia[] = [
  {
    id: 'certificar', titulo: 'Cómo certificar un trabajo', para: ['c'], roles: ['contratista_responsable'],
    resumen: 'Del trabajo terminado al certificado emitido, en 7 pasos.',
    pasos: [
      { titulo: 'Abrí la tarea', texto: 'Desde Mi bandeja → “Tareas ejecutadas pendientes de certificar”, o desde Tareas. La tarea tiene que estar aceptada e iniciada (en obras se puede certificar por avances).' },
      { titulo: 'Tocá “Certificar”', texto: 'Se crea un borrador. Si la tarea prevé varios certificados, el botón indica qué avance estás cargando.' },
      { titulo: 'Completá la carátula', texto: 'Período, fechas de ejecución (desde / hasta) y, si hay materiales, el centro y el almacén de donde salieron.' },
      { titulo: 'Agregá la mano de obra', texto: 'Buscá por código S4, alias o descripción y cargá la cantidad. El precio sale de la LPU vigente. Los montos abiertos (adicionales, costo mínimo diario) piden importe y justificación; “Recursos solicitados” pide además la factura del proveedor.' },
      { titulo: 'Cargá materiales y recuperados', texto: 'Materiales usados (salen del stock del contratista) y materiales recuperados con su estado. Administración los compara después con el documento de SAP.' },
      { titulo: 'Adjuntá la documentación', texto: 'Fotos del antes y después, planillas, remitos o planos. Podés reutilizar las fotos que la cuadrilla subió a la bitácora. La documentación es obligatoria.' },
      { titulo: 'Guardá y emití', texto: 'Podés guardar el borrador las veces que quieras. Al emitir, el sistema valida que esté completo y lo envía a validación técnica del solicitante. Cada emisión queda como una versión inmutable.' },
    ],
  },
  {
    id: 'corregir', titulo: 'Me observaron o rebotaron un certificado', para: ['c'], roles: ['contratista_responsable'],
    resumen: 'Qué hacer cuando el certificado vuelve a tu empresa.',
    pasos: [
      { titulo: 'Leé el motivo', texto: 'Aparece en Mi bandeja → “Certificados observados o rebotados”. Dentro del certificado se ven el comentario general y las observaciones por ítem, en rojo.' },
      { titulo: 'Corregí', texto: 'Si fue una observación, podés modificar todo el certificado. Si fue un rebote de materiales, solo la sección de materiales.' },
      { titulo: 'Volvé a emitir', texto: 'Se genera una nueva versión. Quien revisa ve resaltado qué cambió respecto de la versión anterior.' },
    ],
  },
  {
    id: 'facturar', titulo: 'Cómo cobrar: liquidación y factura', para: ['c'], roles: ['contratista_responsable'],
    resumen: 'Desde “aprobado para pago” hasta la factura.',
    pasos: [
      { titulo: 'Aprobado para pago', texto: 'Cuando la aprobación final lo aprueba, el certificado queda esperando el cierre del período.' },
      { titulo: 'Cierre del período', texto: 'En la fecha de corte, Administración genera una liquidación por empresa con los certificados aprobados, más los ajustes (débitos o créditos) pendientes. El precio se congela según la política vigente.' },
      { titulo: 'Subí la factura', texto: 'En Liquidaciones, abrí la liquidación, cargá número, importe y el archivo. Si el importe no coincide, se genera una advertencia, pero no se bloquea. Con la factura, los certificados quedan cerrados.' },
    ],
  },
  {
    id: 'campo', titulo: 'Cuadrillas: bitácora desde el celular', para: ['c'], roles: ['contratista_tecnico', 'contratista_responsable'],
    resumen: 'Fotos y avances desde el lugar del trabajo.',
    pasos: [
      { titulo: 'Entrá a /campo desde el celular', texto: 'Muestra las tareas asignadas a tu cuadrilla (o las de la empresa si no hay asignación).' },
      { titulo: 'Cargá avances y fotos', texto: 'Cada entrada queda con fecha y hora. El responsable después puede usar esas fotos en el certificado.' },
    ],
  },
  {
    id: 'pedir', titulo: 'Cómo pedir un trabajo', para: ['i'], roles: ['solicitante', 'supervisor'],
    resumen: 'Crear una tarea y asignarla a un contratista.',
    pasos: [
      { titulo: 'Nueva tarea', texto: 'Desde Mi bandeja o Tareas → “Nueva tarea”. Elegí tipo de trabajo (mantenimiento, obra o eventos) y subtipo.' },
      { titulo: 'Ubicación', texto: 'Con la dirección y las coordenadas el sistema detecta la subregión y muestra solo los contratistas habilitados en ella.' },
      { titulo: 'Imputación', texto: 'OT de Helix, PEP u orden de controlling. Se puede corregir hasta que Administración valide los materiales.' },
      { titulo: 'Urgencias', texto: 'Si el trabajo ya se pidió por teléfono o mensaje, marcá urgencia y dejá la justificación: queda en la auditoría.' },
      { titulo: 'Asignación', texto: 'El contratista tiene 48 h para aceptar. Si no responde, la tarea vuelve a vos para reasignarla.' },
    ],
  },
  {
    id: 'validar', titulo: 'Cómo validar un certificado (solicitante)', para: ['i'], roles: ['solicitante', 'supervisor'],
    resumen: 'Validación técnica: lo certificado coincide con lo ejecutado.',
    pasos: [
      { titulo: 'Abrí el certificado', texto: 'Desde Mi bandeja → “Validación técnica”. Revisá la carátula, los ítems, las fotos y las alertas automáticas (cantidades atípicas, fotos repetidas, etc.).' },
      { titulo: 'Resolvé las alertas', texto: 'Si hay alertas abiertas, dejá constancia de lo que verificaste. Sin eso no se puede aprobar.' },
      { titulo: 'Decidí', texto: '“Aprobar” lo pasa al siguiente paso (gerente, materiales o aprobación final, según corresponda). “Observar” lo devuelve al contratista con un motivo; podés marcar ítems puntuales.' },
    ],
  },
  {
    id: 'aprobar', titulo: 'Aprobaciones posteriores y rechazos', para: ['i'], roles: ['gerente', 'administracion', 'cerco', 'adm_obra'],
    resumen: 'Gerente, Administración, CERCO y Adm. de Obra.',
    pasos: [
      { titulo: 'Gerente', texto: 'Solo interviene si el certificado tiene códigos que requieren segunda aprobación (costo mínimo diario, adicionales, recursos solicitados). Si estás de licencia, lo resuelve tu suplente.' },
      { titulo: 'Administración', texto: 'Solo si hay materiales. Tomá el certificado, descargá el reporte en formato SAP, registrá el documento de consumo y el sistema compara. Si algo no coincide, rebotá los materiales al contratista.' },
      { titulo: 'CERCO / Adm. de Obra', texto: 'Aprobación final de la mano de obra: CERCO para mantenimiento y eventos, Adm. de Obra para obras.' },
      { titulo: 'Rechazos', texto: 'Los rechazos de gerente, Administración o aprobación final vuelven al solicitante, que decide si reenvía con una aclaración o lo devuelve al contratista.' },
      { titulo: 'Me equivoqué', texto: 'Mientras el paso siguiente no lo haya tomado, podés usar “Recuperar mi aprobación” dejando un comentario.' },
    ],
  },
  {
    id: 'liquidar', titulo: 'Cierre de período y liquidaciones', para: ['i'], roles: ['administracion', 'cerco', 'adm_obra'],
    resumen: 'Períodos, fecha de corte, ajustes y facturas.',
    pasos: [
      { titulo: 'Período', texto: 'Cada período (AAAA-MM) tiene una fecha de corte, que es la que se usa para el precio si la política es “al cierre”.' },
      { titulo: 'Ajustes', texto: 'Los débitos y créditos se cargan con motivo y se aplican en la próxima liquidación de esa empresa.' },
      { titulo: 'Cerrar', texto: 'Se genera una liquidación por contratista con los certificados aprobados. El contratista sube la factura desde su portal.' },
    ],
  },
  {
    id: 'lpu', titulo: 'Publicar una nueva LPU', para: ['i'], roles: ['compras', 'admin_sistema'],
    resumen: 'Importar el Excel de Compras y publicar precios.',
    pasos: [
      { titulo: 'Importar', texto: 'En Catálogos y LPU subí el Excel con la grilla de precios. El sistema muestra una vista previa con altas, bajas, cambios y reconversiones de códigos.' },
      { titulo: 'Revisar y publicar', texto: 'Al publicar, los certificados en curso se revalorizan según la política configurada (subas y/o bajas). El precio de emisión de cada ítem queda guardado.' },
    ],
  },
]

export const GLOSARIO: Array<[string, string]> = [
  ['LPU', 'Lista de Precios Unitarios. Hay una lista para Mantenimiento y otra para Obras, con fecha de vigencia.'],
  ['Código S4', 'Código de mano de obra de la LPU (por ejemplo 5900101). También se puede buscar por alias o descripción.'],
  ['Carátula', 'Encabezado del certificado: período, fechas de ejecución, centro y almacén.'],
  ['MO', 'Mano de obra: los códigos de la LPU que se certifican con cantidad × precio.'],
  ['Monto abierto', 'Código sin precio fijo (adicionales, costo mínimo diario): se carga el importe con una justificación.'],
  ['Recursos solicitados', 'Materiales o servicios que el contratista provee a pedido. Se certifican como MO con la factura del proveedor.'],
  ['Costo mínimo diario (CMD)', 'Adicional cuando la producción del día no alcanza el mínimo por causas ajenas al contratista. Uno por certificado.'],
  ['Recuperados', 'Materiales retirados de la red que vuelven al almacén, con su estado (utilizable, no utilizable, chatarra).'],
  ['OT Helix / PEP / Orden de controlling', 'Imputación del gasto: OT de Helix para mantenimiento, PEP de SAP para obras (ARATO) y orden de controlling para otros casos.'],
  ['Segunda aprobación', 'Aprobación del gerente de la subregión, requerida solo por ciertos códigos.'],
  ['CERCO', 'Área que hace la aprobación final de la mano de obra en mantenimiento y eventos.'],
  ['Adm. de Obra', 'Área que hace la aprobación final en obras.'],
  ['Pool', 'Bandeja compartida de un área (Administración, CERCO). Se “toma” un certificado para trabajarlo y se “libera” si no se termina.'],
  ['Delegación', 'Traspaso temporal de la bandeja a otra persona (vacaciones, licencia). Todo queda registrado como “en nombre de”.'],
  ['SLA', 'Plazo objetivo de cada paso. El punto de color indica si está en plazo (verde), por vencer (amarillo) o vencido (rojo).'],
  ['Versión', 'Cada emisión del certificado genera una versión inmutable. Se pueden comparar versiones.'],
  ['Revalorización', 'Recalculo del certificado cuando se publica una LPU nueva, según la política de precios.'],
  ['Fecha de corte', 'Fecha que cierra el período y congela los precios de los certificados que se liquidan.'],
  ['Ajuste', 'Débito o crédito sobre una empresa, con motivo, que se aplica en su próxima liquidación.'],
  ['Auditoría', 'Registro inmutable de cada acción (quién, cuándo, en nombre de quién, qué cambió), encadenado con huellas para detectar alteraciones.'],
]

export interface Pregunta { p: string; r: string; para: Portal[]; tema: string }

export const PREGUNTAS: Pregunta[] = [
  // Generales
  { tema: 'General', para: ['i', 'c'], p: '¿Cómo ingreso al sistema?', r: 'Con tu usuario de IDIRA. El personal propio usa su cuenta corporativa y los contratistas el usuario externo que les da Personal. Si no podés entrar, contactá a la Mesa de Ayuda.' },
  { tema: 'General', para: ['i', 'c'], p: '¿Qué significa el punto de color al lado de cada certificado?', r: 'Es el semáforo del plazo (SLA) del paso actual: verde en plazo, amarillo por vencer (más del 75% del plazo) y rojo vencido. Gris significa que ese paso no tiene plazo.' },
  { tema: 'General', para: ['i', 'c'], p: '¿Qué hago si me aparece “cambió mientras lo revisabas”?', r: 'Otra persona hizo un cambio al mismo tiempo. Recargá la página para ver la versión actual y repetí tu acción si sigue correspondiendo. Así nadie pisa el trabajo de otro.' },
  { tema: 'General', para: ['i', 'c'], p: '¿Dónde veo la historia de una tarea o un certificado?', r: 'En la pestaña o sección “Historial”. Muestra cada acción con fecha, persona, rol y comentario. Esa información sale de la auditoría y no se puede modificar.' },
  { tema: 'General', para: ['i', 'c'], p: '¿Dónde están opciones como anular, poner en espera o pedir el cierre?', r: 'En el botón “Más acciones” de cada tarea o certificado. Ahí están las acciones para casos especiales, para que no se confundan con la decisión habitual del paso.' },
  { tema: 'General', para: ['i', 'c'], p: '¿Cómo busco algo rápido?', r: 'Usá el buscador de arriba: acepta número de tarea, certificado, OT, PEP, CUIT, contratista o parte de la dirección. Si hay una sola coincidencia, te lleva directo.' },
  { tema: 'General', para: ['i', 'c'], p: '¿Puedo imprimir un certificado?', r: 'Sí: “Imprimir / PDF” dentro del certificado. La impresión incluye una huella de integridad para verificar que no fue alterado.' },
  // Contratistas
  { tema: 'Tareas', para: ['c'], p: '¿Cuánto tiempo tengo para aceptar una tarea?', r: '48 horas. Si no la aceptás ni la devolvés, vuelve al solicitante para que la reasigne.' },
  { tema: 'Tareas', para: ['c'], p: 'No puedo hacer el trabajo, ¿qué hago?', r: 'Si todavía no la aceptaste, devolvela indicando el motivo. Si ya la aceptaste, pedí la reasignación: el solicitante decide.' },
  { tema: 'Tareas', para: ['c'], p: 'El trabajo está frenado por un permiso o por el cliente, ¿qué hago?', r: 'Poné la tarea “en espera” con la causa. El tiempo en espera no cuenta en tus indicadores. Cuando se destrabe, reanudala.' },
  { tema: 'Certificados', para: ['c'], p: 'No encuentro el código que necesito', r: 'Buscá por código S4, alias o palabras de la descripción. Si el código no está en la LPU de tu tipo de trabajo (mantenimiento u obras), consultá al solicitante: puede que corresponda otro código o un adicional.' },
  { tema: 'Certificados', para: ['c'], p: '¿Qué precio se usa en mi certificado?', r: 'El de la LPU vigente. Si se publica una LPU nueva, el certificado se revaloriza según la política de la empresa; al cierre del período se congela el precio. Siempre se guarda también el precio al momento de emitir.' },
  { tema: 'Certificados', para: ['c'], p: 'Ya emití y me di cuenta de un error', r: 'Si el solicitante todavía no lo tomó, usá “Retirar para corregir”. Si ya lo está revisando, usá “Pedir retiro” con un comentario y el solicitante lo aprueba o lo rechaza.' },
  { tema: 'Certificados', para: ['c'], p: '¿Puedo hacer más de un certificado por tarea?', r: 'Sí, si la tarea prevé varios certificados (por ejemplo, avances de obra). El botón “Certificar” indica qué avance estás cargando. No puede haber dos borradores a la vez.' },
  { tema: 'Certificados', para: ['c'], p: '¿Qué documentación tengo que adjuntar?', r: 'Fotos del antes y después como mínimo, y lo que corresponda al trabajo: planillas, remitos, planos o conforme a obra. Para “recursos solicitados” también se necesita la factura del proveedor.' },
  { tema: 'Cobro', para: ['c'], p: '¿Cuándo cobro?', r: 'Los certificados aprobados para pago entran en la liquidación del período cuando Administración lo cierra. Con la liquidación generada, subís la factura y sigue el circuito de pago habitual.' },
  { tema: 'Cobro', para: ['c'], p: 'Me descontaron un importe, ¿por qué?', r: 'Es un ajuste (débito) que Administración carga con un motivo y, si corresponde, una referencia al certificado. Lo ves en el detalle de la liquidación.' },
  { tema: 'Cobro', para: ['c'], p: 'La factura no coincide con la liquidación', r: 'El sistema la acepta igual, pero genera una advertencia para Administración. Conviene facturar exactamente el total de la liquidación.' },
  // Personal propio
  { tema: 'Tareas', para: ['i'], p: 'El contratista no acepta la tarea', r: 'A las 48 h vuelve a vos automáticamente. Desde la tarea podés reasignarla a otro contratista habilitado en la subregión.' },
  { tema: 'Tareas', para: ['i'], p: '¿Por qué me avisan de una “posible tarea duplicada”?', r: 'Hay otra tarea abierta de otro solicitante muy cerca de la misma ubicación. Es solo un aviso para el supervisor: revisá si no se está pidiendo dos veces el mismo trabajo.' },
  { tema: 'Aprobaciones', para: ['i'], p: '¿Por qué no me deja aprobar?', r: 'Las razones más comunes son que hay alertas abiertas (resolvelas dejando constancia), que ya aprobaste un paso anterior de este certificado (nadie aprueba dos pasos) o que otra persona lo tomó en el pool. Pasá el mouse sobre el botón deshabilitado para ver el motivo.' },
  { tema: 'Aprobaciones', para: ['i'], p: '¿Cuándo interviene el gerente?', r: 'Solo cuando el certificado tiene códigos marcados como de segunda aprobación (costo mínimo diario, adicionales, recursos solicitados, etc.).' },
  { tema: 'Aprobaciones', para: ['i'], p: 'Me voy de vacaciones, ¿quién aprueba lo mío?', r: 'Configurá una delegación en “Mis delegaciones” (menú de tu usuario). La persona elegida ve tu bandeja durante esas fechas y todo queda registrado “en nombre de”. Tu supervisor también puede aprobar en tu lugar.' },
  { tema: 'Aprobaciones', para: ['i'], p: 'Aprobé por error', r: '“Recuperar mi aprobación” (con comentario) lo vuelve a tu paso, siempre que el siguiente responsable todavía no lo haya tomado.' },
  { tema: 'Aprobaciones', para: ['i'], p: '¿Qué diferencia hay entre observar y rechazar?', r: 'Observar (en validación técnica) lo devuelve directamente al contratista para que corrija. Rechazar (en pasos posteriores) lo devuelve al solicitante, que decide si lo reenvía con una aclaración o lo devuelve al contratista.' },
  { tema: 'Materiales', para: ['i'], p: '¿Cómo se valida el consumo en SAP?', r: 'Administración descarga el reporte en formato SAP, registra el número y archivo del documento de consumo (e ingreso de recuperados) y el sistema compara cantidades. Si no coinciden, se genera una alerta o se rebota al contratista.' },
  { tema: 'Materiales', para: ['i'], p: 'Se anuló un certificado con consumo ya registrado', r: 'Queda “pendiente de reversa SAP” hasta que Administración registra el documento de reversa.' },
  { tema: 'Liquidación', para: ['i'], p: '¿Qué precio se liquida?', r: 'Depende de la política de precios configurada: al emitir o al cierre del período, aplicando o no las subas y bajas de una LPU nueva. El detalle muestra el precio de emisión y el final.' },
]

export const CONTACTO = {
  titulo: 'Mesa de Ayuda',
  texto: 'Para problemas de acceso, errores del sistema o dudas que no estén acá. Indicá el número de tarea o certificado y, si podés, una captura de pantalla.',
  canales: ['Canal de soporte: a definir por Personal S.A.', 'Horario: a definir'],
}
