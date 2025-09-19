## ESTADOS DE LAS TAREAS Y FLUJO COMPLETO

### **Estado 1: ASIGNADA**

- **Descripción**: Tarea creada y asignada a un proveedor
- **Estado inicial**: ✅ Sí
- **Acciones disponibles**:

- **Administración**: Asignar/modificar WO, exportar materiales
- **Inspector/Supervisor Mant**: Reasignar proveedor
- **Supervisores Disp/Sop/Prov**: Reasignar entre supervisores
- **Proveedor**: Ver tarea, iniciar trabajo
- **Cualquier rol**: Cancelar tarea





### **Estado 2: EN PROGRESO**

- **Descripción**: Proveedor ejecutando el trabajo
- **Requisitos**: Proveedor debe haber iniciado el trabajo
- **Acciones disponibles**:

- **Administración**: Modificar WO, exportar materiales
- **Inspector/Supervisor Mant**: Reasignar proveedor
- **Supervisores**: Reasignar entre supervisores
- **Proveedor**: Terminar trabajo y certificar (requiere WO)





### **Estado 3: PENDIENTE CERTIFICACIÓN INSPECTOR/SUPERVISOR**

- **Descripción**: Certificado emitido por proveedor, esperando revisión
- **Requisitos**: Proveedor debe haber emitido certificado con WO asignado
- **Acciones disponibles**:

- **Inspector/Supervisor**: Aprobar, editar, observar certificado
- **Supervisor Mant**: Actuar por inspector (override)
- **Administración**: Exportar materiales
- **Cualquier rol**: Reasignar certificación





### **Estado 4: PENDIENTE APROBACIÓN ADMINISTRACIÓN (CON EDICIÓN)**

- **Descripción**: Inspector editó certificado, proveedor debe validar cambios
- **Requisitos**: Inspector debe haber editado el certificado original
- **Acciones disponibles**:

- **Proveedor ÚNICAMENTE**: Validar o rechazar ediciones del inspector
- **Sistema**: Notificación automática al proveedor





### **Estado 5: OBSERVADO**

- **Descripción**: Certificado devuelto al proveedor con observaciones
- **Requisitos**: Inspector/Supervisor debe haber observado el certificado
- **Acciones disponibles**:

- **Proveedor**: Corregir y recertificar, cancelar tarea, rehacer certificado completo
- **Sistema**: Mantener observaciones visibles





### **Estado 6: PENDIENTE SUPERVISOR MANTENIMIENTO**

- **Descripción**: Certificado aprobado por inspector, requiere autorización superior
- **Requisitos**: Solo aplica cuando un Inspector aprobó el certificado
- **Acciones disponibles**:

- **Supervisor Mantenimiento**: Aprobar u observar
- **Administración**: Exportar materiales





### **Estado 7: PENDIENTE ADMINISTRACIÓN**

- **Descripción**: Revisión administrativa antes de aprobaciones finales
- **Requisitos**: Certificado aprobado por supervisor o inspector autorizado
- **Acciones disponibles**:

- **Administración**: Aprobar, observar, exportar materiales y costos
- **Sistema**: Determinar si requiere autorización gerencial





### **Estado 8: PENDIENTE AUTORIZACIÓN GERENTE**

- **Descripción**: Tareas de alto valor o criticidad requieren aprobación gerencial
- **Requisitos**: Configuración del sistema o monto/tipo de trabajo específico
- **Acciones disponibles**:

- **Gerente**: Aprobar u observar
- **Administración**: Exportar reportes





### **Estado 9: PENDIENTE APROBACIÓN CERCO**

- **Descripción**: Aprobación final de costos y cierre definitivo
- **Requisitos**: Todas las aprobaciones anteriores completadas
- **Acciones disponibles**:

- **CERCO**: Aprobar (finalizar), observar
- **CERCO**: Exportar mano de obra, materiales, reporte completo





### **Estado 10: FINALIZADA (Estado Final)**

- **Descripción**: Tarea completamente aprobada y cerrada
- **Características**:

- Cronología completa inmutable
- Costos finales calculados y aprobados
- Documentación archivada
- Visible para auditoría





### **Estado 11: CANCELADA (Estado Final)**

- **Descripción**: Tarea cancelada en cualquier punto del proceso
- **Características**:

- Motivo de cancelación registrado
- Cronología hasta cancelación inmutable
- Recursos utilizados documentados