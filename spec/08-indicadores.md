# 08 — Indicadores: finanzas, tiempos y SLA

Objetivo: que **personal propio y contratistas vean los mismos números**, calculados desde el registro de eventos, y que la relación se maneje con datos y no con percepciones.

## Para el contratista (su empresa)

**Financiero**
- Monto certificado por período (emitido).
- Monto **en aprobación**, desglosado por paso (cuánto está en el solicitante, en el gerente, en administración, en CERCO).
- Monto **aprobado para pago** por período.
- Monto observado/rechazado y retrabajo (versiones adicionales).
- Composición por código de MO, por tipo de tarea, por imputación.
- Antigüedad de lo pendiente (0–15, 15–30, 30–60, +60 días).

**Tiempos**
- Tiempo de aceptación, de ejecución, de fin de ejecución a emisión (lo que depende de él).
- Tiempo en cada paso de aprobación (lo que **no** depende de él): transparencia hacia el contratista.
- Ciclo total: pedido → aprobado para pago.

**Calidad**
- % de certificados aprobados sin observaciones (primera vez).
- Observaciones por motivo y por paso.
- Cumplimiento de fechas comprometidas.

## Para personal propio

- Todo lo anterior, por contratista, región, área, tipo de tarea, imputación.
- **Cuellos de botella**: tiempo promedio y pendientes por paso y por persona/pool.
- Ranking y comparación de contratistas (tiempos, calidad, montos).
- Gasto en MO por imputación/OT y período; materiales consumidos y recuperados.
- Evolución de precios del preciario y su impacto.
- Bandeja con semáforo de SLA.

## SLA

- Configurables por **paso**, **tipo de tarea** y **prioridad**, en horas hábiles (con calendario de feriados).
- Cada estado del flujo mide tiempo desde que entra hasta que sale; se atribuye al actor que tenía la pelota.
- Semáforo: en plazo / por vencer / vencido. Recordatorios y escalamiento al supervisor configurables.
- Para ser justos, el SLA del contratista se pausa mientras la pelota está del lado de personal propio, y viceversa.

## Consideraciones

- Montos en ARS nominales. Más adelante: vista a valores constantes (ajuste por índice) para comparar períodos.
- Los indicadores se precalculan periódicamente (no se recalculan en cada consulta) para responder rápido con volúmenes grandes.
- Exportables a Excel.
- Futuro: con la fecha de pago real (desde SAP) se agrega "días hasta el cobro".
