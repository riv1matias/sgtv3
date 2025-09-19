# Explicación del Modelo de Datos del Sistema de Gestión

Este documento explica la lógica y las relaciones clave de la base de datos para el Sistema de Gestión de Tareas de Mantenimiento. Sirve como una guía en lenguaje natural para entender cómo las tablas interactúan para implementar las reglas de negocio.

---

##  núcleo del Flujo de Trabajo

El corazón del sistema gira en torno a tres tablas que gestionan el ciclo de vida de cada tarea.

### 📋 `tareas`
Es la **tabla central y maestra** de todo el sistema. Cada fila representa una única orden de trabajo desde su creación hasta su finalización.

* **Clave de Negocio:** `numero_tarea` es el identificador único que ven los usuarios.
* **Estado Actual:** El campo `estado_id` es fundamental, ya que dicta qué acciones son posibles en un momento dado, conectándose directamente con la tabla `estados_tarea`.
* **Asignaciones:** `proveedor_asignado_id` vincula la tarea con el usuario responsable de ejecutarla.
* **Work Order (WO):** Los campos `wo_*` son cruciales. Una tarea no puede ser certificada sin un `wo_numero`. Este número solo puede ser asignado por un rol de `administracion`.
* **Control de Concurrencia:** Los campos `bloqueada_por_usuario_id` y `bloqueada_at` implementan el sistema de bloqueo para evitar que dos usuarios editen la misma tarea simultáneamente.

### 📄 `certificados`
Esta es posiblemente la tabla **más importante y con la lógica más compleja**. No solo almacena los detalles del trabajo realizado, sino que gestiona la regla de negocio crítica de la certificación dual.

* **Inmutabilidad del Original:** `datos_certificado` y `emitido_por` almacenan el certificado **original e intacto** tal como lo emitió el **Proveedor**. Este registro nunca debe ser modificado después de su creación.
* **Ediciones del Inspector:** Si un `Inspector` o `Supervisor` modifica el certificado, los cambios se guardan en `datos_editados` y `campos_editados`. El original se mantiene intacto para fines de auditoría y comparación.
* **Flujo de Validación:** El campo `validado_por_proveedor` gestiona el paso extra donde el Proveedor debe aceptar o rechazar las ediciones del Inspector.
* **Versionado:** `version` y `certificado_padre_id` permiten un historial completo de los certificados si uno es rechazado y rehecho.

### 🗂️ `certificado_mano_obra` y `certificado_materiales`
Estas tablas desglosan el contenido de los certificados. Siguen la misma lógica que la tabla `certificados`:

* **Valores Originales vs. Editados:** Contienen campos separados para `cantidad_original` y `cantidad_editada` (o similar). Esto mantiene un registro claro de lo que el proveedor informó versus lo que el inspector aprobó.
* **Costos Calculados:** Utilizan columnas generadas (`GENERATED ALWAYS AS ... STORED`) para calcular automáticamente los costos totales, asegurando la consistencia de los datos.

---

## 👤 Usuarios, Roles y Permisos

Esta sección define quién puede hacer qué y dónde.

* **`usuarios`**: Contiene la información básica de cada usuario del sistema.
* **`roles`**: Define los roles disponibles (`proveedor`, `inspector`, `administracion`, etc.) y su `nivel_jerarquico`.
* **`usuarios_roles`**: Es la tabla pivot que asigna un `rol` a un `usuario` en una `region` específica.
* **`jerarquias`**: Implementa la estructura de reporte. Define explícitamente qué usuario supervisa a otro, lo cual es clave para el flujo de aprobación (por ejemplo, de `Inspector` a `Supervisor Mantenimiento`).
* **`permisos_rol_accion_estado`**: Es el **motor de permisos** del sistema. Define de manera granular qué `rol` puede ejecutar qué `accion` para mover una tarea de un `estado_origen` a un `estado_destino`. Reglas como `requiere_wo` se definen aquí.

---

## 📊 Auditoría, Notificaciones y Configuración

Estas tablas aseguran la trazabilidad, comunicación y flexibilidad del sistema.

### 🕵️ Auditoría
* **`historial_tareas`**: Es la bitácora inmutable de todo lo que ocurre con una tarea. Guarda un "snapshot" completo del registro (`datos_anteriores` y `datos_nuevos`) antes y después de cada cambio significativo. Esto es vital para la trazabilidad y la resolución de disputas.
* **`historial_certificados`**: Hace lo mismo que la tabla anterior, pero específicamente para el ciclo de vida de un certificado (emisión, edición, validación, rechazo).
* **`log_exportaciones`**: Registra cada vez que un usuario exporta datos, ayudando a hacer cumplir los límites definidos.

### 🔔 Notificaciones
* **`notificaciones`**: Almacena los mensajes enviados a los usuarios sobre eventos importantes (reasignaciones, observaciones, ediciones).
* **`plantillas_notificaciones`**: Permite estandarizar los mensajes de notificación, haciendo que el sistema sea más fácil de mantener.

### ⚙️ Configuración
* **`configuracion_sistema`**: Permite a los administradores modificar el comportamiento del sistema sin cambiar el código. Parámetros como `tiempo_bloqueo_tarea_minutos` o `requiere_wo_para_certificar` se gestionan aquí.