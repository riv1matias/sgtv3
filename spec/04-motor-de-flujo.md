# 04 — Motor de flujo configurable

Objetivo: que cambios frecuentes del circuito **no requieran reprogramar**, sin convertir el sistema en algo imposible de probar.

## Tres niveles de flexibilidad

| Nivel | Ejemplos | Quién lo cambia | Cómo |
|---|---|---|---|
| **1. Datos de catálogo** | Nueva LPU, altas/bajas de códigos, materiales, imputaciones, marcar un código como "requiere 2da aprobación", campos adicionales de carátula | Compras / Administración | Pantallas de catálogo o importación Excel, con vigencia desde |
| **2. Parámetros de reglas** | SLA por paso, aprobación final todo-o-nada vs. parcial, plazo para reclamar, fecha de corte del período de pago, quién es aprobador final por tipo | Administrador funcional | Pantalla de parámetros, versionada |
| **3. Forma del circuito** | Agregar un paso de aprobación, cambiar a dónde va un rechazo, sacar un paso | Administrador del sistema | Nueva **versión** de la definición de flujo |

La mayoría de los cambios reales ("este código ahora requiere gerente", "salió una LPU nueva") son **nivel 1**, y no tocan el flujo.

## Definición de flujo

El mismo motor gobierna los cuatro ciclos: **tarea**, **certificado**, **reclamo** y **liquidación**. Cada uno es un flujo versionado con estados y transiciones. Ejemplo **simplificado** del certificado (el circuito completo, con retiro, rebote de materiales y reversa SAP, está en 03):

```yaml
flujo: certificacion
version: 1
vigente_desde: 2026-11-01
parametros:
  aprobacion_final_modalidad: todo_o_nada   # o: parcial (habilita reclamos)

estados:
  - clave: BORRADOR
    tipo: inicial
    actor: contratista
  - clave: VAL_TECNICA
    actor: solicitante
    sla: { horas_habiles: 48 }
  - clave: APROB_GERENTE
    actor: gerente_elegido          # por defecto el de la subregión
    sla: { horas_habiles: 48 }
  - clave: VAL_MATERIALES
    actor: { pool: administracion }
    sla: { horas_habiles: 72 }
  - clave: APROB_FINAL
    actor:
      - si: { tipo_trabajo_en: [obra] }
        pool: adm_obra
      - pool: cerco
  - clave: OBSERVADO
    actor: contratista
  - clave: REVISION_RECHAZO
    actor: solicitante
  - clave: APROBADO
  - clave: EN_LIQUIDACION
    actor: contratista              # debe adjuntar factura
  - clave: CERRADO
    tipo: final
  - clave: ANULADO
    tipo: final

transiciones:
  - accion: emitir
    desde: [BORRADOR, OBSERVADO]
    hacia: VAL_TECNICA
    validaciones: [imputacion_asignada, al_menos_un_item, al_menos_un_documento,
                   montos_abiertos_justificados, facturas_de_recursos_adjuntas]
    efectos: [valorizar_con_lpu_vigente, nueva_version_si_corresponde, invalidar_aprobaciones]

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
    efectos: [fijar_imputacion]
    hacia: APROB_FINAL

  - accion: aprobar
    desde: APROB_FINAL
    hacia: APROBADO

  - accion: aprobar_parcial
    desde: APROB_FINAL
    habilitada_si: { parametro: aprobacion_final_modalidad, igual: parcial }
    requiere: [observaciones_por_item]
    efectos: [abrir_disputa_por_items]
    hacia: APROBADO

  - accion: observar
    desde: VAL_TECNICA
    hacia: OBSERVADO
    requiere: [comentario]

  - accion: rechazar
    desde: [APROB_GERENTE, VAL_MATERIALES, APROB_FINAL]
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

  - accion: incluir_en_liquidacion   # la dispara el cierre del período
    desde: APROBADO
    hacia: EN_LIQUIDACION
    efectos: [congelar_precios]

  - accion: adjuntar_factura
    desde: EN_LIQUIDACION
    hacia: CERRADO
    requiere: [adjunto]

  - accion: anular
    desde: [BORRADOR, OBSERVADO]
    hacia: ANULADO
    requiere: [comentario]
```

## Piezas que implementa el código

La definición solo **combina** piezas conocidas. No hay scripting libre: cada pieza está programada, probada y documentada.

| Pieza | Ejemplos |
|---|---|
| **Actores** | `solicitante`, `supervisor_solicitante`, `contratista`, `gerente_elegido`, `pool:<rol>` (acotado a la subregión de la tarea) |
| **Condiciones** | `requiere_segunda_aprobacion`, `tipo_trabajo_en`, `subtipo_en`, `subregion_en`, `tiene_materiales`, `tiene_recuperados`, `tiene_montos_abiertos`, `parametro` |
| **Validaciones** | `imputacion_asignada`, `al_menos_un_item`, `al_menos_un_documento`, `montos_abiertos_justificados`, `facturas_de_recursos_adjuntas`, `consumo_sap_registrado`, `campos_obligatorios_del_tipo` |
| **Efectos** | `valorizar_con_lpu_vigente`, `congelar_precios`, `fijar_imputacion`, `invalidar_aprobaciones`, `recordar_paso_origen`, `abrir_disputa_por_items`, `notificar`, `generar_pdf` |
| **Requisitos** | `comentario`, `observaciones_por_item`, `adjunto` |

Si un cambio de negocio necesita una pieza nueva (ej.: "si la imputación es un PEP sin saldo, pasa por un aprobador extra"), se programa la condición una vez y queda disponible para cualquier flujo.

## Versionado — lo más importante

- Cada certificado queda **anclado a la versión del flujo** vigente cuando se creó. Cambiar el flujo **no altera** los que están en curso.
- Al publicar una versión nueva se pueden **migrar** certificados en curso solo con un **mapeo explícito y validado** de estados (auditado).
- Concurrencia: si dos personas actúan a la vez, la segunda acción se rechaza con el aviso "El certificado cambió mientras lo revisabas" o "Lo está trabajando *Nombre Apellido*".
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
