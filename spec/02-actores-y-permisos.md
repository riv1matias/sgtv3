# 02 — Actores, organización y permisos

## Estructura geográfica

```
País
└── Región            (AMBA, Litoral, Mediterránea, PBA y Patagonia)
    └── Subregión     (Cap. Norte, Cap. Sur, Gran Córdoba, …)
        └── Base / Nodo / Localidad
```

- Cada subregión tiene su **polígono (KML)**: la subregión de una tarea se calcula sola a partir de su ubicación.
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
| **Gerente** | Gerente de la **subregión donde se ejecuta** la tarea (nunca vacante: si no está, lo reemplaza otro gerente o un subordinado designado) | **2da aprobación** cuando el certificado tiene códigos que la requieren |
| **Administración** | Pool, con alcance por subregión/región o global | **Valida materiales**, descarga el reporte, consume en SAP y registra el documento |
| **CERCO** | Pool nacional — Certificación de Contratistas | **Aprobación final** de Mantenimiento y Eventos |
| **Adm. de Obra** | Pool | **Aprobación final** de Obras |
| **Compras / Catálogos** | Sector que emite la LPU | Publica LPU, códigos, marcas de 2da aprobación |
| **Administrador del sistema** | TI / dueño funcional | Usuarios, roles, geografía, flujos, parámetros |
| **Auditor / Consulta** | Solo lectura | Ve todo y la auditoría |

Un usuario puede tener varios roles y varias subregiones. Al actuar, el sistema registra **con qué rol y en qué ámbito** actuó.

## Contratista como empresa

La tarea se asigna a la **empresa**. Cualquier usuario de la empresa con el permiso correspondiente puede actuar. Roles internos del contratista:

- **Responsable / Administrativo**: acepta tareas, subasigna a cuadrillas, arma y emite certificados, responde observaciones, adjunta facturas.
- **Técnico / Jefe de cuadrilla**: ve las tareas que le subasignaron y carga en la **bitácora** avances, fotos y observaciones (pensado para el celular). No certifica.
- **Consulta**: ve tareas, stock proyectado e indicadores de su empresa.

### Módulo de gestión del contratista

- **Cuadrillas**: el contratista da de alta sus técnicos y cuadrillas.
- **Subasignación**: reparte las tareas aceptadas entre sus cuadrillas y ve el estado de cada una.
- **Bitácora**: los técnicos cargan fotos y observaciones desde el campo; al terminar, el administrativo usa ese material para armar el certificado.
- **Stock**: ve el stock de su centro y sus dos almacenes (proyecto y mantenimiento) según la última carga de Administración, menos lo certificado y aún no consumido (ver 06).

Todo lo que carga un técnico queda a su nombre en la auditoría.

## Resolución de "a quién le toca"

1. **Por relación** (se resuelve desde la tarea):
   - `solicitante` → quien creó la tarea (o su delegado vigente).
   - `supervisor_solicitante` → superior en la jerarquía.
   - `contratista` → usuarios de la empresa asignada.
   - `gerente_subregion` → gerente de la subregión donde se ejecuta. Solo cambia si está marcado **de vacaciones o no disponible**; entre gerentes pueden tomarse pendientes sin pedir permiso.
2. **Por pool** → cualquier usuario del rol con alcance sobre la subregión de la tarea (Administración, CERCO, Adm. de Obra). Un usuario **toma** el certificado para trabajarlo; puede soltarlo; un responsable del pool puede reasignarlo.

## Supervisión, delegaciones y reemplazos

- **Todo usuario tiene un supervisor**: el del solicitante, el de Administración, el de CERCO, etc. El supervisor puede **aprobar en lugar** de su subordinado o **reasignar** el pendiente, con causal. La auditoría conserva quién debía actuar, quién actuó y por qué.
- Cualquier usuario puede **delegar** su bandeja por un período (vacaciones, licencia). El delegado actúa "en nombre de".
- Una aprobación pendiente se puede **traspasar** a otro usuario del mismo rol las veces que haga falta, hasta que alguien actúe. Lo que no se delega es el rol en sí.
- **Nadie aprueba dos pasos del mismo certificado**: si le toca a alguien que ya aprobó un paso anterior, se deriva al siguiente en la jerarquía.
- El administrador puede reasignar cualquier pendiente, con motivo obligatorio.
- Si se desactiva un usuario con pendientes, se alerta a su supervisor.

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
- **Contratistas**: a definir con Ciberseguridad si se dan de alta en el IdP corporativo como externos o si el sistema maneja su propio acceso. En cualquier caso: **cuentas personales** (nunca compartidas), **segundo factor** y alerta por sesiones simultáneas.
- Una cuenta no puede ser interna y de contratista a la vez; si una persona cambia de lado, se crea otra cuenta y se conserva el historial de la anterior.

## Permisos

1. **Permisos de sistema** (por rol): administrar catálogos, usuarios, flujos, exportar, ver auditoría completa, etc.
2. **Permisos de flujo**: cada transición del flujo declara qué actor puede ejecutarla (ver 04).
