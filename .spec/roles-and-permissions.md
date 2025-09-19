## ROLES Y JERARQUÍAS DEL SISTEMA

### **1. SUPERADMIN**

- **Nivel jerárquico**: 10 (máximo)
- **Permisos**: Acceso total al sistema
- **Funciones**: Configuración global, gestión de usuarios, auditoría completa


### **2. ADMINISTRACIÓN**

- **Nivel jerárquico**: 8
- **Permisos**: Gestión de Work Orders, exportaciones, revisión administrativa
- **Funciones**:

- Asignar y modificar números de Work Order (WO)
- Exportar reportes de materiales (límite: 5 cada 10 minutos)
- Revisar tareas antes de aprobación final
- Observar tareas y devolverlas a estados anteriores
- Crear tareas en cualquier región





### **3. GERENTE REGIONAL**

- **Nivel jerárquico**: 7
- **Permisos**: Autorización de tareas de alto valor o criticidad
- **Funciones**:

- Aprobar tareas que requieren autorización gerencial
- Observar y devolver tareas a administración
- Exportar reportes con análisis gerencial
- Crear tareas en su región





### **4. CERCO (Control de Costos)**

- **Nivel jerárquico**: 6
- **Permisos**: Aprobación final de costos
- **Funciones**:

- Aprobación definitiva de todas las tareas
- Exportar reportes de mano de obra y materiales
- Análisis final de costos vs presupuesto
- Observar tareas por problemas de costos





### **5. SUPERVISORES (Nivel 5)**

#### **5.1 Supervisor de Mantenimiento**

- **Funciones especiales**:

- Autorizar certificados aprobados por inspectores
- Actuar en lugar de inspectores (override)
- Reasignar tareas entre proveedores
- Crear y gestionar tareas de mantenimiento





#### **5.2 Supervisor de Disponibilidad**

- **Funciones**:

- Certificar directamente (sin pasar por Supervisor Mantenimiento)
- Crear tareas relacionadas con disponibilidad
- Reasignar entre supervisores del mismo nivel





#### **5.3 Supervisor de Soporte**

- **Funciones**:

- Certificar directamente (sin pasar por Supervisor Mantenimiento)
- Crear tareas de soporte técnico
- Gestionar proveedores de soporte





#### **5.4 Supervisor de Provisión**

- **Funciones**:

- Certificar directamente (sin pasar por Supervisor Mantenimiento)
- Crear tareas de provisión de materiales
- Gestionar proveedores de suministros





### **6. INSPECTOR**

- **Nivel jerárquico**: 3
- **Permisos**: Certificación con autorización superior requerida
- **Funciones**:

- Revisar y editar certificados emitidos por proveedores
- Aprobar certificados (requiere autorización de Supervisor Mantenimiento)
- Observar certificados y devolverlos al proveedor
- Crear tareas en su región
- Reasignar tareas entre proveedores





### **7. PROVEEDOR**

- **Nivel jerárquico**: 1 (mínimo)
- **Permisos**: Ejecución de trabajo y emisión de certificados
- **Funciones**:

- **EMITIR CERTIFICADOS ORIGINALES** (función exclusiva)
- Iniciar trabajo (pasar de ASIGNADA a EN PROGRESO)
- Validar o rechazar ediciones de inspectores
- Corregir certificados observados
- Ver información completa de sus tareas asignadas
