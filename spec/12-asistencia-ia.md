# 12 — Asistencia con IA

La IA se usa para **leer documentos y detectar incongruencias**. Nunca aprueba, rechaza ni modifica nada: **genera alertas** que una persona resuelve, y tanto la alerta como su resolución quedan auditadas.

## Principios

1. **Asiste, no decide.** Toda salida de IA es una sugerencia o alerta que no bloquea el flujo.
2. **Explicable.** Cada alerta dice qué comparó, qué encontró y con qué evidencia ("la factura dice $ 120.000, el ítem Recursos solicitados dice $ 150.000").
3. **Auditada.** Se registra la alerta, quién la vio, cómo la resolvió y el motivo.
4. **Reglas visibles.** Lo que la IA "aprende" se convierte en **reglas explícitas** que una persona de CERCO revisa y activa. No hay caja negra que cambie criterios sola.
5. **Datos dentro del entorno corporativo.** Se usan los servicios de IA de la misma nube (AWS Bedrock o Google Vertex AI), con aprobación de Ciberseguridad, sin enviar datos a servicios no autorizados.
6. **Degradación segura.** Si la IA no está disponible, el circuito sigue funcionando igual, sin las alertas.

## Casos de uso

| # | Caso | Quién lo usa | Qué hace | Etapa |
|---|---|---|---|---|
| IA1 | **Lectura de facturas** de terceros (recursos solicitados) y de la factura de la liquidación | Solicitante, CERCO | Extrae nº, fecha, CUIT, razón social, neto, IVA y total. Alerta si el importe difiere del ítem, si la factura ya se usó, si la fecha está fuera del período o si el CUIT no es válido | Post-MVP (en el MVP, carga manual de esos datos) |
| IA2 | **Consumo SAP vs. lo declarado** | Administración | Lee el documento de consumo (o el de ingreso de recuperados) que sube Administración y lo compara ítem por ítem con el certificado: faltantes, sobrantes, cantidades distintas, códigos cambiados | MVP: comparación exacta si el documento viene en Excel/CSV. Post-MVP: IA para PDF o imagen |
| IA3 | **Asistente de reglas de CERCO** | CERCO | a) CERCO describe reglas en lenguaje natural ("el adicional X solo se paga con el código base Y") y el asistente propone la regla formal para activarla. b) A partir de las observaciones históricas de CERCO, sugiere reglas candidatas ("el 80% de las observaciones sobre el código Z fue por falta de…") | Post-MVP |
| IA4 | **Pre-revisión del certificado** | Solicitante, CERCO | Antes de aprobar, resume el certificado y marca incongruencias: códigos que no suelen ir juntos, cantidades atípicas para la unidad, documentación que no se corresponde con los ítems (ej. no hay foto de la cámara que se certifica) | Post-MVP |
| IA5 | **Ayuda al contratista al certificar** | Contratista | Sugiere códigos de MO a partir de la descripción del trabajo y el alcance de cada código, y avisa antes de emitir lo que probablemente será observado | Post-MVP |

## Qué hay que dejar preparado desde el MVP

- Guardar **todas las observaciones y rechazos con su motivo tipificado y el ítem al que refieren**: es el material con el que después se entrenan y validan las reglas.
- El motor de **reglas por código** (06) debe existir desde el MVP, aunque al principio lo carguen personas; la IA solo propone reglas nuevas.
- Documentos guardados con su tipo (factura, consumo SAP, foto, etc.) para poder procesarlos.
- El registro de **alertas** (origen, evidencia, resolución) como entidad propia, compartida por las reglas manuales y la IA.
