# 04 — Motor de flujo configurable

Objetivo: que cambios frecuentes del circuito **no requieran reprogramar**, sin convertir el sistema en algo imposible de probar.

## Tres niveles de flexibilidad

| Nivel | Ejemplos | Quién lo cambia | Cómo |
|---|---|---|---|
| **1. Datos de catálogo** | Precios, altas/bajas de códigos, materiales, imputaciones, marcar un código como "requiere 2da aprobación" | Compras / Administración | Pantallas de catálogo o importación Excel, con vigencia desde |
| **2. Parámetros de reglas** | Monto a partir del cual interviene el gerente, SLA por paso, tipos de tarea, quién es aprobador final por tipo | Administrador funcional | Pantalla de parámetros, versionada |
| **3. Forma del circuito** | Agregar un paso de aprobación, cambiar a dónde va un rechazo, sacar un paso | Administrador del sistema | Nueva **versión** de la definición de flujo |

La mayoría de los cambios reales ("este código ahora requiere gerente", "subió el preciario") son **nivel 1**, y no tocan el flujo.

## Definición de flujo

Un flujo es un documento versionado con estados y transiciones:

```yaml
flujo: certificacion
version: 1
vigente_desde: 2026-11-01

estados:
  - clave: BORRADOR
    tipo: inicial
    actor: contratista
  - clave: VAL_TECNICA
    actor: solicitante
    sla: { horas_habiles: 48 }
  - clave: APROB_GERENTE
    actor: gerente_area
    sla: { horas_habiles: 48 }
  - clave: VAL_MATERIALES
    actor: { pool: administracion }
    sla: { horas_habiles: 72 }
  - clave: APROB_FINAL_CERCO
    actor: { pool: cerco }
  - clave: APROB_FINAL_OBRA
    actor: { pool: adm_obra }
  - clave: OBSERVADO
    actor: contratista
  - clave: REVISION_RECHAZO
    actor: solicitante
  - clave: APROBADO_PAGO
    tipo: final
  - clave: ANULADO
    tipo: final

transiciones:
  - accion: emitir
    desde: [BORRADOR, OBSERVADO]
    hacia: VAL_TECNICA
    validaciones: [imputacion_asignada, al_menos_un_item, documentos_obligatorios]
    efectos: [congelar_precios_y_reglas, nueva_version_si_corresponde, invalidar_aprobaciones]

  - accion: aprobar
    desde: VAL_TECNICA
    hacia:
      - si: requiere_segunda_aprobacion
        ir_a: APROB_GERENTE
      - ir_a: VAL_MATERIALES

  - accion: aprobar
    desde: APROB_GERENTE
    hacia: VAL_MATERIALES

  - accion: aprobar
    desde: VAL_MATERIALES
    validaciones: [consumo_sap_registrado]
    hacia:
      - si: { tipo_tarea_en: [obra] }
        ir_a: APROB_FINAL_OBRA
      - ir_a: APROB_FINAL_CERCO

  - accion: aprobar
    desde: [APROB_FINAL_CERCO, APROB_FINAL_OBRA]
    hacia: APROBADO_PAGO

  - accion: observar
    desde: VAL_TECNICA
    hacia: OBSERVADO
    requiere: [comentario]

  - accion: rechazar
    desde: [APROB_GERENTE, VAL_MATERIALES, APROB_FINAL_CERCO, APROB_FINAL_OBRA]
    hacia: REVISION_RECHAZO
    requiere: [comentario]
    efectos: [recordar_paso_origen]

  - accion: reenviar
    desde: REVISION_RECHAZO
    hacia: $paso_origen          # vuelve a quien rechazó
    requiere: [comentario]

  - accion: devolver_al_contratista
    desde: REVISION_RECHAZO
    hacia: OBSERVADO
    requiere: [comentario]

  - accion: anular
    desde: [BORRADOR, OBSERVADO]
    hacia: ANULADO
    requiere: [comentario]
```

## Piezas que implementa el código

La definición solo **combina** piezas conocidas. No hay scripting libre: cada pieza está programada, probada y documentada.

| Pieza | Ejemplos |
|---|---|
| **Actores** | `solicitante`, `supervisor_solicitante`, `contratista`, `gerente_area`, `pool:<rol>` |
| **Condiciones** | `requiere_segunda_aprobacion`, `tipo_tarea_en`, `monto_total_mayor_a`, `tiene_materiales`, `tiene_recuperados` |
| **Validaciones** | `imputacion_asignada`, `al_menos_un_item`, `documentos_obligatorios`, `consumo_sap_registrado` |
| **Efectos** | `congelar_precios_y_reglas`, `invalidar_aprobaciones`, `recordar_paso_origen`, `notificar`, `generar_pdf` |
| **Requisitos** | `comentario`, `observaciones_por_item`, `adjunto` |

Si un cambio de negocio necesita una pieza nueva (ej.: "si la imputación es de tal centro de costo va a otro aprobador"), se programa la condición una vez y queda disponible para cualquier flujo.

## Versionado — lo más importante

- Cada certificado queda **anclado a la versión del flujo** vigente cuando se creó. Cambiar el flujo **no altera** los que están en curso.
- Opcionalmente, al publicar una versión nueva se puede **migrar** certificados en curso con un mapeo explícito de estados (auditado).
- Al publicar, el sistema **valida** la definición: todos los estados alcanzables, todo estado no final tiene salida, todas las piezas existen, no hay dos transiciones ambiguas para la misma acción.
- Cada versión se puede **simular** (recorrer con casos de prueba) antes de publicarla.

## Dónde vive la definición

- **MVP**: archivo YAML en el repo; al desplegar se carga a la base como nueva versión. Cambiar el circuito = editar YAML + tests automáticos + deploy.
- **Futuro**: editor en pantalla con validación y simulación, sin deploy.

## Cómo el motor decide una acción

Para cada pedido "usuario U quiere hacer la acción A sobre el certificado C":

1. Busca transiciones con `accion = A` y `desde` = estado actual de C (en la versión del flujo de C).
2. Verifica que U sea el actor del estado actual (directo, por pool tomado o por delegación).
3. Verifica requisitos (comentario, etc.) y validaciones.
4. Evalúa las condiciones de `hacia` en orden; la primera que se cumple define el destino.
5. En **una sola transacción**: cambia el estado, ejecuta efectos, escribe el evento de auditoría, encola notificaciones.

La misma función responde "¿qué acciones puede hacer U sobre C ahora?", que usa la interfaz para mostrar solo los botones válidos.
