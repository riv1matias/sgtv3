# 02 — Actores y permisos

## Actores

| Actor | Quién es | Qué hace |
|---|---|---|
| **Solicitante** | Personal propio: técnico, inspector, supervisor, etc. | Pide la tarea, elige el contratista, hace la **validación técnica** del certificado, triagea rechazos posteriores |
| **Supervisor del solicitante** | Superior directo según la jerarquía | Figura en la carátula; puede reasignar/reemplazar al solicitante; ve todo lo de su equipo |
| **Contratista** | Empresa proveedora, con uno o más usuarios | Acepta, ejecuta, arma y emite el certificado, corrige lo observado |
| **Gerente** | Gerente del área/región | **2da aprobación** cuando el certificado contiene códigos de MO que la requieren |
| **Administración** | Pool de usuarios del sector | **Valida materiales**, descarga el reporte, registra el consumo en SAP |
| **CERCO** | Pool — Certificación de Contratistas | **Aprobación final** de mantenimiento y eventos |
| **Adm. de Obra** | Pool | **Aprobación final** de obras |
| **Compras / Catálogos** | Sector de compras | Mantiene códigos de MO, alcances, preciario y reglas asociadas |
| **Administrador del sistema** | TI / dueño funcional | Usuarios, roles, regiones, flujos, parámetros |
| **Auditor / Consulta** | Solo lectura | Ve todo y la auditoría, no actúa |

Un usuario puede tener varios roles. Al ejecutar una acción, el sistema registra **con qué rol actuó**.

## Contratista como empresa

La tarea se asigna a la **empresa**, no a una persona. Cualquier usuario de la empresa con el permiso correspondiente puede actuar (aceptar, certificar, corregir). La empresa puede tener roles internos:

- **Operador**: carga avance y arma borradores.
- **Certificador / Responsable**: emite certificados y responde observaciones.
- **Consulta**: ve tareas e indicadores de su empresa.

## Dos tipos de actor en el flujo

1. **Actor por relación** — se resuelve a partir de la tarea:
   - `solicitante` → quien creó la tarea (o su delegado vigente).
   - `supervisor_solicitante` → superior en la jerarquía al momento de crear la tarea.
   - `contratista` → usuarios de la empresa asignada.
   - `gerente_area` → gerente del área/región de la tarea.
2. **Actor por pool** — cualquier usuario con el rol en el ámbito (región/área): Administración, CERCO, Adm. de Obra.

En los pools, un usuario **toma** el certificado ("lo tengo yo") para evitar que dos personas trabajen el mismo. Puede **soltarlo**; un responsable del pool puede reasignarlo. Tomar/soltar queda auditado y cuenta para los tiempos por persona.

## Delegaciones y reemplazos

Para que una ausencia no trabe el circuito:

- Un usuario puede **delegar** sus bandejas a otro por un período (vacaciones, licencia). El delegado actúa "en nombre de", y la auditoría registra ambos.
- El supervisor puede **reasignar el solicitante** de una tarea (por ejemplo, si la persona deja la empresa).
- El administrador puede reasignar cualquier pendiente, con motivo obligatorio.

## Ámbito de visibilidad

| Actor | Ve |
|---|---|
| Contratista | Solo tareas y certificados de su empresa, y sus propios indicadores |
| Solicitante | Sus tareas; lo que tenga pendiente |
| Supervisor / Gerente | Lo de su equipo o área |
| Administración / CERCO / Adm. Obra | Lo de su región/ámbito |
| Auditor / Administrador | Todo |

## Permisos

Los permisos se definen en dos capas:

1. **Permisos de sistema** (por rol): administrar catálogos, usuarios, flujos, exportar, ver auditoría completa, etc.
2. **Permisos de flujo**: los define la propia definición del flujo (ver 04) — cada transición declara qué actor puede ejecutarla.
