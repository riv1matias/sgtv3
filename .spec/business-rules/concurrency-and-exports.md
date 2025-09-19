## CONTROL DE CONCURRENCIA

### **Sistema de Bloqueo de Tareas:**

#### **Funcionamiento**:

1. **Verificación**: Antes de cualquier acción, verificar si la tarea está bloqueada
2. **Bloqueo**: Al acceder, la tarea se bloquea para el usuario actual
3. **Timeout**: Bloqueo automático se libera después de 30 minutos
4. **Liberación**: Al completar la acción, se desbloquea automáticamente


#### **Reglas de Bloqueo**:

- Solo un usuario puede trabajar en una tarea a la vez
- El bloqueo incluye timestamp y ID del usuario
- Si otro usuario intenta acceder, debe esperar o intentar más tarde
- Administradores pueden forzar liberación de bloqueos (funcionalidad futura)


#### **Estados que Requieren Bloqueo**:

- ASIGNADA (para todas las acciones)
- EN PROGRESO (para todas las acciones)
- PENDIENTE CERTIFICACIÓN (para revisión)
- PENDIENTE APROBACIÓN CON EDICIÓN (solo proveedor)
- Todos los estados de aprobación (SUPERVISOR, ADMINISTRACIÓN, GERENTE, CERCO)


---

## LÍMITES DE EXPORTACIÓN

### **Sistema de Control**:

- **Límite por defecto**: 5 exportaciones cada 10 minutos por usuario
- **Tipos de exportación**: Materiales, mano de obra, reportes completos
- **Reset automático**: Contador se reinicia cada 10 minutos
- **Bloqueo temporal**: Si se supera el límite, usuario debe esperar


### **Exportaciones Disponibles por Rol**:

- **Administración**: Materiales, costos, reportes administrativos
- **CERCO**: Mano de obra, materiales, reportes completos finales
- **Gerente**: Reportes con análisis gerencial
- **Supervisores**: Materiales de sus tareas
- **Inspector**: Materiales de tareas en certificación
