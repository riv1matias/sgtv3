# SGT v3 — Especificación funcional (v2)

Sistema de gestión de tareas y certificación de contratistas: desde el pedido de una tarea por personal propio hasta que el certificado queda aprobado para pago, con trazabilidad total.

> La carpeta `.spec/` contiene la especificación anterior. Queda como referencia histórica; **esta carpeta la reemplaza** en lógica de negocio.

## Índice

| # | Documento | Contenido |
|---|---|---|
| 01 | [Visión y alcance](01-vision-y-alcance.md) | Problema actual, objetivos, principios de diseño, alcance del MVP |
| 02 | [Actores y permisos](02-actores-y-permisos.md) | Quién participa, cómo se resuelve "a quién le toca", delegaciones |
| 03 | [Ciclo de vida](03-ciclo-de-vida.md) | Tarea y certificado: estados, aprobaciones, rechazos cruzados |
| 04 | [Motor de flujo configurable](04-motor-de-flujo.md) | Cómo cambiar el circuito sin reprogramar |
| 05 | [Certificado](05-certificado.md) | Carátula, mano de obra, materiales, documentos, versiones, cálculo |
| 06 | [Catálogos](06-catalogos.md) | Códigos de MO, preciario, materiales, imputaciones — con vigencias |
| 07 | [Auditoría](07-auditoria.md) | Registro inmutable de todo cambio |
| 08 | [Indicadores](08-indicadores.md) | Información financiera, tiempos y SLA para personal y contratistas |
| 09 | [Preguntas abiertas](09-preguntas-abiertas.md) | Decisiones pendientes |

## Glosario

- **Tarea**: pedido de trabajo hecho por personal propio y asignado a un contratista.
- **Contratista / Proveedor**: empresa que ejecuta y certifica. Tiene uno o más usuarios.
- **Certificado**: documento con el que el contratista declara el trabajo realizado (MO + materiales) para cobrarlo.
- **Imputación**: Orden de Trabajo (OT) o código de imputación contra el cual se paga el certificado. Obligatoria para emitir.
- **Preciario**: lista de precios vigente para los códigos de mano de obra.
- **CERCO**: Certificación de Contratistas. Aprobación final para mantenimiento y eventos.
- **Adm. de Obra**: aprobación final para trabajos de obra.
- **Flujo**: definición versionada de estados y transiciones que recorre un certificado (ver 04).
