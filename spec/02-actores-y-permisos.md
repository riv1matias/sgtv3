# 02 — Actores, organización y permisos

## Estructura geográfica

```
País
└── Región            (AMBA, Litoral, Mediterránea, PBA y Patagonia)
    └── Subregión     (Cap. Norte, Cap. Sur, Gran Córdoba, …)
        └── Base / Nodo / Localidad
```

- **Usuarios internos** y **contratistas** se asignan a **una o más subregiones** (hay personas que por geografía cubren más de una).
- La subregión define **qué se ve**: un contratista que trabaja en Córdoba no aparece en los listados de Capital; un solicitante solo ve contratistas habilitados en sus subregiones.
- Algunos sectores tienen alcance mayor: Administración puede estar por subregión, por región o no estar regionalizada; **CERCO es nacional**.
- Las **métricas** se agrupan según quién mira: su rango y sus subregiones.

## Actores

| Actor | Quién es | Qué hace |
|---|---|---|
| **Solicitante** | Personal propio: **técnicos, inspectores, supervisores, analistas** | Pide la tarea, elige contratista, **define la imputación**, hace la **validación técnica** del certificado y triagea los rechazos posteriores |
| **Supervisor** | Superior del solicitante | Figura en la carátula; ve todo lo de su equipo; puede reasignar al solicitante |
| **Contratista** | Empresa proveedora con uno o más usuarios | Acepta, ejecuta, arma y emite el certificado, corrige lo observado, adjunta factura |
| **Gerente** | Gerente de la **subregión donde se ejecuta** la tarea | **2da aprobación** cuando el certificado tiene códigos que la requieren |
| **Administración** | Pool, con alcance por subregión/región o global | **Valida materiales**, descarga el reporte, consume en SAP y registra el documento |
| **CERCO** | Pool nacional — Certificación de Contratistas | **Aprobación final** de Mantenimiento y Eventos |
| **Adm. de Obra** | Pool | **Aprobación final** de Obras |
| **Compras / Catálogos** | Sector que emite la LPU | Publica LPU, códigos, marcas de 2da aprobación |
| **Administrador del sistema** | TI / dueño funcional | Usuarios, roles, geografía, flujos, parámetros |
| **Auditor / Consulta** | Solo lectura | Ve todo y la auditoría |

Un usuario puede tener varios roles y varias subregiones. Al actuar, el sistema registra **con qué rol y en qué ámbito** actuó.

## Contratista como empresa

La tarea se asigna a la **empresa**. Cualquier usuario de la empresa con el permiso correspondiente puede actuar. Roles internos del contratista:

- **Operador**: carga avances y arma borradores.
- **Responsable / Certificador**: acepta tareas, emite certificados, responde observaciones, adjunta facturas.
- **Consulta**: ve tareas e indicadores de su empresa.

## Resolución de "a quién le toca"

1. **Por relación** (se resuelve desde la tarea):
   - `solicitante` → quien creó la tarea (o su delegado vigente).
   - `supervisor_solicitante` → superior en la jerarquía.
   - `contratista` → usuarios de la empresa asignada.
   - `gerente_subregion` → gerente de la subregión donde se ejecuta. **El solicitante puede elegir otro gerente** al crear la tarea o antes de que llegue a ese paso (queda auditado).
2. **Por pool** → cualquier usuario del rol con alcance sobre la subregión de la tarea (Administración, CERCO, Adm. de Obra). Un usuario **toma** el certificado para trabajarlo; puede soltarlo; un responsable del pool puede reasignarlo.

## Delegaciones y reemplazos

- Cualquier usuario puede **delegar** su bandeja por un período (vacaciones, licencia). El delegado actúa "en nombre de" y la auditoría registra a ambos.
- Si un gerente tiene delegación activa, sus aprobaciones pendientes aparecen automáticamente al delegado.
- El supervisor puede **reasignar el solicitante** de una tarea (por ejemplo, si la persona deja la empresa).
- El administrador puede reasignar cualquier pendiente, con motivo obligatorio.

## Visibilidad

| Actor | Ve |
|---|---|
| Contratista | Solo lo de su empresa, en las subregiones donde está habilitado |
| Solicitante | Sus tareas, las de sus subregiones en modo consulta, y lo que tenga pendiente |
| Supervisor / Gerente | Lo de su equipo y subregiones |
| Administración / Adm. Obra | Lo de su alcance geográfico |
| CERCO | Todo el país |
| Auditor / Administrador | Todo |

## Autenticación

- **Personal propio**: inicio de sesión con el **IdP corporativo** (lo define Ciberseguridad; el sistema soporta OIDC y SAML).
- **Contratistas**: a definir con Ciberseguridad si se dan de alta en el IdP corporativo como externos o si el sistema maneja su propio acceso (usuario + contraseña + segundo factor). Ver 09.

## Permisos

1. **Permisos de sistema** (por rol): administrar catálogos, usuarios, flujos, exportar, ver auditoría completa, etc.
2. **Permisos de flujo**: cada transición del flujo declara qué actor puede ejecutarla (ver 04).
