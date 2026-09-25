# 07 — Auditoría inmutable

Objetivo: ante cualquier controversia, poder reconstruir **quién hizo qué, cuándo, sobre qué, y cómo estaba antes**, y demostrar que el registro no fue alterado.

## Qué se registra

**Todo cambio**, sin excepción:

- Tareas: alta, cada campo modificado, asignaciones, reasignaciones, cambios de estado, comentarios.
- Certificados: cada ítem agregado/modificado/quitado en borrador, emisión, cada aprobación, observación, rechazo, reenvío, anulación.
- Documentos: subida, reemplazo (con hash de ambos archivos), descarga de documentos sensibles.
- Catálogos y preciarios: cada alta, cambio y publicación.
- Flujos y parámetros: cada versión publicada.
- Usuarios, roles, delegaciones, reasignaciones de pools.
- Accesos: inicio de sesión, intentos fallidos, exportaciones.

## Estructura de cada evento

| Campo | Nota |
|---|---|
| Fecha y hora | Del servidor, con zona horaria. Nunca del cliente |
| Usuario | ID + **nombre y apellido congelados** en el evento (si luego cambia el nombre, el evento conserva el original) |
| Rol con el que actuó | Y empresa si es contratista |
| En nombre de | Si actuó por delegación |
| Entidad | Tipo e ID (tarea, certificado, ítem, documento, catálogo…) |
| Acción | Emitir, aprobar, modificar campo, etc. |
| Estado anterior / nuevo | Si aplica |
| Cambios | Campo por campo: valor anterior → valor nuevo |
| Comentario / motivo | |
| Origen | IP, navegador |
| Hash | Encadenado con el evento anterior |

## Cómo se garantiza la inmutabilidad

1. **Solo inserción**: la aplicación no tiene permiso de modificar ni borrar eventos en la base; además, un trigger rechaza cualquier UPDATE/DELETE.
2. **Cadena de hashes**: cada evento incluye el hash del anterior. Alterar o borrar uno rompe la cadena y se detecta con una verificación automática diaria.
3. **Anclaje externo** (opcional): el hash del último evento del día se envía fuera del sistema (email a auditoría, almacenamiento de solo escritura). Así ni siquiera un administrador de base puede reescribir el pasado sin que se note.
4. **Archivos**: almacenamiento con versionado; nunca se borran; se guarda su hash.
5. Los datos del negocio (ítems, estados) nunca se borran físicamente: se anulan o reemplazan.

## Cómo se consulta

- **Línea de tiempo** de cada tarea y certificado: todos los eventos en orden, legibles ("Juan Pérez (Administración) aprobó la validación de materiales — 12/10/2026 14:32 — Doc. SAP 4900123456").
- **Comparación** entre versiones del certificado.
- **Exportar el expediente** completo (PDF) para una controversia: certificado, versiones, documentos, línea de tiempo y verificación de integridad.
- Búsqueda global de auditoría para usuarios con permiso.
