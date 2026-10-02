# 13 — Frontend y experiencia de usuario

## 1. Arquitectura del frontend

### Qué evitamos

Una SPA clásica (el navegador descarga una aplicación JavaScript grande, arma las pantallas del lado del cliente y habla con una API) trae problemas que en este sistema pesan:
- Lógica de negocio y permisos replicados en el navegador, donde se pueden inspeccionar y manipular.
- Carga inicial pesada en PCs viejas y celulares de campo con 4G.
- URLs que no siempre representan el estado real; links de mails que no abren "exactamente eso".
- Dos aplicaciones (front y API) que mantener en sincronía.

### Qué proponemos: aplicación **multipágina renderizada en el servidor**, con islas interactivas

- **Cada pantalla es una URL real** (`/tareas/T-AMBA-004512`, `/certificados/CERT-2026-000123/revision`). El servidor arma el HTML **ya filtrado por permisos y alcance**; el navegador lo muestra. Atrás/adelante, favoritos, abrir en otra pestaña y links en mails funcionan siempre.
- **Toda regla vive en el servidor.** El navegador nunca decide qué acciones se pueden hacer: el servidor le manda solo los botones válidos (sale del motor de flujo, ver 04) y revalida cada acción al recibirla.
- **Formularios que funcionan como formularios**: se envían al servidor, se validan ahí y vuelven con errores o con el resultado. Funcionan incluso si falla el JavaScript.
- **Islas interactivas** solo donde la complejidad lo justifica: editor de ítems del certificado, buscador de códigos, mapa, visor de documentos, gráficos, comparador de versiones. Se cargan solo en la pantalla que las usa.
- **Actualización en vivo** mínima y dirigida: notificaciones y avisos de "lo está trabajando *Nombre Apellido*" por Server-Sent Events.

**Tecnología recomendada**: Next.js (App Router, React Server Components) en TypeScript, con renderizado en el servidor por defecto y acciones de servidor para los formularios. Mismo lenguaje que el backend, componentes reutilizables y React disponible para las islas complejas.
*Alternativa equivalente* si la organización exige Java o .NET: Spring (Thymeleaf) o ASP.NET (Razor) con htmx para las partes dinámicas. El diseño de pantallas de este documento no cambia.

### Tres espacios, una sola base de código

| Espacio | Para quién | Dónde se publica | Foco |
|---|---|---|---|
| **Portal interno** | Personal propio (todos los roles internos) | Dominio interno / red corporativa, login con IdP corporativo | Bandejas, revisión, control, indicadores, administración |
| **Portal de contratistas** | Usuarios administrativos y de consulta de los contratistas | Dominio propio, publicado a internet con WAF y segundo factor | Aceptar, certificar, corregir, facturar, gestionar cuadrillas y stock |
| **App de campo** | Técnicos y jefes de cuadrilla de los contratistas | Web instalable en el celular (PWA) | Ver tareas asignadas y cargar bitácora (fotos, notas); tolera falta de señal |

Separar portal interno y de contratistas (dominio, políticas de sesión, exposición a internet) reduce la superficie de ataque: los contratistas nunca llegan a una pantalla interna, ni siquiera por error de configuración.

### Sistema de diseño

- **Componentes propios** sobre una base accesible, con los colores y la tipografía corporativos.
- **Densidad**: modo compacto para back-office (CERCO y Administración procesan cientos de certificados) y modo cómodo para uso ocasional y celular.
- **Formato argentino**: `$ 1.234.567,89`, `28/09/2026 14:32`, horas hábiles con feriados nacionales.
- **Accesibilidad** WCAG 2.1 AA: contraste, navegación por teclado, lectores de pantalla.
- **Estados siempre con texto y color** (nunca solo color): cada estado tiene nombre, color e ícono fijos en todo el sistema.
- **Atajos de teclado** en las pantallas de revisión (aprobar, observar, siguiente de la cola).

---

## 2. Perfiles y navegación

### Un usuario, varios roles

- El menú y la bandeja muestran la **unión** de lo que permiten todos los roles del usuario. No hay que "cambiar de rol".
- Cada pendiente indica **con qué rol** le toca actuar ("como Solicitante", "como Supervisor en lugar de…", "como delegado de…").
- Un **selector de alcance** (subregiones) arriba filtra listados e indicadores; por defecto, todas las subregiones del usuario.
- Si el usuario tiene una **delegación activa** (recibida o dada), se ve un aviso permanente en la barra superior.

### Barra superior (común)

`[Logo]  [Buscar tarea, certificado, OT, PEP, contratista, dirección…]  [Alcance: Cap. Sur ▾]  [🔔 3]  [Nombre Apellido ▾]`

La **búsqueda global** reconoce el formato de lo que se escribe (nº de tarea, de certificado, OT de Helix, PEP, CUIT, dirección) y va directo al resultado.

### Menú del portal interno

| Sección | Qué contiene | Visible para |
|---|---|---|
| **Inicio** | Mi bandeja + resumen | Todos |
| **Tareas** | Nueva tarea · Mis tareas · Todas (según alcance) · Mapa | Solicitantes, supervisores, gerentes, consulta |
| **Certificados** | En curso · Históricos · Buscador avanzado | Todos los internos |
| **Materiales** | Cola de validación · Rebotes · Reversas pendientes · Stock de contratistas · Cargas de stock | Administración |
| **Liquidaciones** | Períodos · Liquidaciones · Ajustes | Administración, CERCO, Adm. Obra |
| **Contratistas** | Directorio y ficha 360° | Todos los internos (según alcance) |
| **Indicadores** | Tableros por perfil | Todos (según alcance y rango) |
| **Catálogos** | LPU · Códigos y reglas · Materiales · Imputaciones · Campos por tipo | Compras, CERCO, Administración (lectura para el resto) |
| **Auditoría** | Búsqueda de eventos · Alertas · Expedientes | Auditor, CERCO, supervisores (lo suyo) |
| **Configuración** | Usuarios y roles · Organización y polígonos · Delegaciones · Flujos · Parámetros · Plantillas de notificación | Administrador del sistema |

### Menú del portal de contratistas

| Sección | Qué contiene |
|---|---|
| **Inicio** | Bandeja: tareas por aceptar, observados, rebotes, facturas pendientes, alertas de cierre de mes |
| **Tareas** | Por aceptar · En curso · En espera · Terminadas · Mapa |
| **Certificados** | Borradores · En aprobación (con quién está y desde cuándo) · Aprobados · Historial |
| **Liquidaciones** | Períodos, importes, facturas a subir, ajustes |
| **Cuadrillas** | Equipo · Subasignación de tareas · Bitácoras |
| **Stock** | Centro y almacenes: última carga, comprometido, proyectado |
| **Mis indicadores** | Montos, tiempos, calidad |
| **LPU** | Consulta de códigos, alcances y precios vigentes |
| **Mi empresa** | Usuarios, datos fiscales, subregiones habilitadas |

### App de campo (técnico)

Cuatro pantallas, pensadas para una mano y sol directo: **Hoy** (tareas asignadas) · **Tarea** (dirección, mapa, descripción, contacto) · **Bitácora** (cámara, notas, "terminé") · **Pendientes de subir** (fotos en cola sin señal).

---

## 3. Pantallas principales

### 3.1 Mi bandeja (inicio)

Responde "¿qué tengo que hacer hoy?". Agrupada por **acción requerida**, ordenada por urgencia y antigüedad.

```
┌─ Mi bandeja ────────────────────────────────────── Alcance: Cap. Sur, Cap. Norte ─┐
│  Validar certificados (12)   Revisar rechazos (2)   Aprobar cierres (1)   ...     │
├───────────────────────────────────────────────────────────────────────────────────┤
│ ● VENCIDO  CERT-2026-000123 · Contratista SA · $ 1.125.100 · hace 5 días          │
│            Tarea T-AMBA-004512 · Recambio CDO · como Solicitante   ⚠ 2 alertas    │
│ ● POR VENCER CERT-2026-000131 · Redes SRL · $ 312.400 · hace 2 días               │
│ ○ EN PLAZO  CERT-2026-000140 · ...                                                │
├───────────────────────────────────────────────────────────────────────────────────┤
│ Resumen: 15 pendientes · 3 vencidos · $ 4,2 M esperando mi acción                 │
└───────────────────────────────────────────────────────────────────────────────────┘
```

- Filtros guardables ("mis vistas"), columnas configurables, exportación.
- Para pools (Administración, CERCO): pestaña **Sin tomar** / **Tomados por mí** / **Del equipo**, y botón **Tomar siguiente**.
- Para supervisores: pestaña **Mi equipo** (pendientes de sus subordinados, con opción de actuar en su lugar).

### 3.2 Nueva tarea (asistente en pasos)

1. **Tipo de trabajo** (Mantenimiento / Eventos / Obra) y subtipo → define los campos siguientes.
2. **Ubicación**: dirección con autocompletado o punto en el mapa → la **subregión se calcula sola** (polígonos). Aviso si hay tareas abiertas cercanas.
3. **Contratista**: solo los habilitados en esa subregión, con sus indicadores resumidos (carga actual, tiempos promedio, calidad).
4. **Imputación**: OT de Helix, PEP u orden de controlling (con saldo del PEP si es obra).
5. **Detalle**: título, descripción, campos del tipo, documentos, **urgencia** (con justificación), cantidad prevista de certificados, fecha tentativa.
6. **Tarea múltiple** (opcional): agregar subtareas con otro contratista, simultáneas o secuenciales.
7. **Confirmar**.

### 3.3 Detalle de tarea

```
┌ T-AMBA-004512 · Recambio CDO · Mantenimiento correctivo · ⚡ Urgencia ──────────────┐
│ Estado: EN EJECUCIÓN   La pelota: Contratista SA (desde hace 2 días)              │
│ [Pedir reasignación] [Cambiar imputación] [Cancelar]      ← solo acciones válidas │
├──────────────┬────────────────────────────────────────────────────────────────────┤
│ Resumen      │ Ubicación (mapa) · Solicitante · Supervisor · Gerente · Imputación │
│ Certificados │ 1 de 2 · CERT-…123 APROBADO · CERT-…140 en VAL_TECNICA            │
│ Bitácora     │ Fotos y notas de la cuadrilla                                      │
│ Mensajes     │ Hilo con el contratista                                            │
│ Documentos   │ Todos los archivos de la tarea y sus certificados                  │
│ Línea de     │ Todos los eventos, con nombre, rol, fecha y hora                   │
│ tiempo       │                                                                    │
└──────────────┴────────────────────────────────────────────────────────────────────┘
```

El contratista ve la misma pantalla **sin** presupuesto, sin alertas internas y sin información de otros contratistas.

### 3.4 Editor de certificado (contratista)

La pantalla más usada por los contratistas. Tiene que ser **más rápida que el Excel**.

```
┌ CERT-2026-000140 · Borrador v1 · Tarea T-AMBA-004512 · 2 de 2 (final) ────────────┐
│ Carátula ▸  MO (6) ▸  Materiales (4) ▸  Recuperados (1) ▸  Documentos (9) ▸  Emitir │
├───────────────────────────────────────────────────────────────┬───────────────────┤
│ Mano de obra                                                  │ Totales           │
│ [Buscar código: "linga", 5022316, 993300122, R131…      ]     │ Subtotal $ 812.300│
│ Código   Descripción                 UM  Cant.  Precio  Total │ IVA 21%  $ 170.583│
│ 5022316  TEND. D/LINGA 3MM P/PSTE.   M   120   625,34  75.041 │ Total    $ 982.883│
│ 5020982  Costo mínimo diario         AD   —    importe 150.000│───────────────────│
│          └ Justificación: …                                   │ Validaciones      │
│ + Agregar ítem   ⓘ Alcance del código al pasar el mouse       │ ✔ MO cargada      │
│                                                               │ ✖ Falta documento │
│                                                               │ ⚠ Cant. atípica   │
└───────────────────────────────────────────────────────────────┴───────────────────┘
```

- Buscador de códigos por **S4, cualquier alias, descripción o categoría**, solo con códigos aplicables al tipo de trabajo; muestra el **alcance** antes de elegir.
- Carga rápida por teclado (código → Enter → cantidad → Enter).
- **Guardado automático** del borrador.
- Panel de **validaciones** en vivo: bloqueantes y alertas, con explicación.
- Documentos: arrastrar y soltar, varios a la vez, o **importar desde la bitácora** de la cuadrilla.
- Transición: **importar desde el Excel actual** para contratistas que todavía trabajan con la planilla.

### 3.5 Revisión de certificado (solicitante, gerente, Administración, CERCO)

Diseñada para revisar rápido y con evidencia a la vista.

```
┌ Revisión · CERT-2026-000140 v2 · como Solicitante ─────── [◀ anterior] [siguiente ▶]┐
│ ⚠ 2 alertas  ·  Cambios respecto de v1: 1 ítem modificado, 2 documentos nuevos    │
├─────────────────────────────────────────┬─────────────────────────────────────────┤
│ Carátula / MO / Materiales / Recup.     │ Documentos (visor)                      │
│ ~ 5022316  120 → 100 M   (cambió)       │ [foto_antes.jpg] [foto_despues.jpg]     │
│   5020982  CMD $ 150.000  ⚠ regla CERCO │ ◀ ▶  zoom · metadatos: 27/09 · GPS ✔    │
│   [Observar este ítem]                  │                                         │
├─────────────────────────────────────────┴─────────────────────────────────────────┤
│ Alertas: ⚠ Cantidad atípica en 5022316 · ⚠ CMD sin código base      [Resolver]   │
│ [Aprobar (A)]  [Observar (O)]  [Rechazar]        Motivo tipificado + comentario    │
└───────────────────────────────────────────────────────────────────────────────────┘
```

- **Comparador de versiones**: solo lo que cambió, resaltado.
- **Observación por ítem**: se hace clic en la línea, se elige el motivo y se escribe el comentario.
- Las alertas se deben **resolver** (tomar conocimiento con un comentario) antes de aprobar, aunque no bloquean.
- **Siguiente de la cola** sin volver a la bandeja.
- Cada rol ve lo que le toca: CERCO ve MO y documentación; Administración ve materiales.

### 3.6 Materiales (Administración)

- **Cola de validación** con filtro por centro/almacén.
- En cada certificado: **descargar reporte** en formato SAP → **subir documento de consumo** (y de ingreso de recuperados) → **comparación** automática ítem por ítem → aprobar o **rebotar**.
- Listas propias de **Rebotes** (esperando al contratista) y **Reversas pendientes**.
- **Stock**: subir la foto de SAP por contratista; ver comprometido y proyectado.

### 3.7 Liquidaciones

- **Período**: fecha de corte, certificados incluidos, totales por contratista, estado de facturas.
- **Liquidación**: detalle de certificados con importe a la emisión / final / diferencia, ajustes (+/−), factura adjunta y advertencias de la lectura de la factura.
- **Ajustes**: alta de débitos y créditos con motivo y documentación.

### 3.8 Catálogos y LPU

- **Importar LPU**: subir el Excel de Compras → **vista previa del cambio** (altas, bajas, cambios de precio por código con % de variación, errores) → reconversiones de códigos → elegir vigencia → publicar. Muestra el **impacto** en certificados no cerrados antes de confirmar.
- Ficha de código: aliases, alcance, precios históricos (gráfico), reglas de CERCO que lo involucran, marca de 2da aprobación.
- **Reglas de CERCO**: listado, alta y edición con vista previa de a qué certificados recientes habría afectado.

### 3.9 Contratista 360°

Una ficha por contratista: datos, subregiones, usuarios, tareas y certificados en curso, montos por estado, tiempos, calidad, rebotes, stock proyectado, alertas recientes. Es la base de las reuniones de seguimiento.

### 3.10 Indicadores

Tableros por perfil, todos con el mismo filtro de período, alcance, tipo de trabajo y contratista:
- **Contratista**: cuánto certifiqué, cuánto está en aprobación y dónde, cuánto cobré, diferencia por LPU, tiempos propios y ajenos, observaciones.
- **Solicitante / Supervisor**: pendientes del equipo, tiempos por paso, urgencias, desestimaciones.
- **Gerente**: gasto por subregión e imputación, PEP (presupuesto vs. consumido), comparación de contratistas, cuellos de botella.
- **Administración**: cola de materiales, rebotes, reversas, diferencias de consumo, stock.
- **CERCO**: montos por período, observaciones por motivo y código, reglas más disparadas, liquidaciones.

Desde cada número se puede **bajar al detalle** (la lista de certificados que lo componen).

### 3.11 Línea de tiempo y expediente

En tareas y certificados: todos los eventos legibles, con filtro por tipo, y el botón **Exportar expediente (PDF)** con certificado, versiones, documentos, línea de tiempo y verificación de integridad.

### 3.12 Configuración

Usuarios y roles (con alcance y supervisor), organización (regiones, subregiones con carga de KML, bases), delegaciones, **flujos** (diagrama de solo lectura de cada versión, validación y simulación), parámetros (plazos, SLA, política de precios, modalidad de aprobación final), plantillas de notificación.

---

## 4. Patrones comunes

| Patrón | Regla |
|---|---|
| Acciones | Solo se muestran las válidas para ese usuario en ese estado; las acciones críticas piden confirmación y motivo tipificado |
| "¿Quién tiene la pelota?" | Visible en todo listado y detalle: actor, rol y desde cuándo |
| Motivos | Siempre de una lista tipificada + comentario libre (base para indicadores e IA) |
| Concurrencia | Si otro usuario cambió el registro: "El certificado cambió mientras lo revisabas" o "Lo está trabajando *Nombre Apellido*" |
| Notificaciones | En la app (campana) y por mail con **link directo** a la pantalla exacta; resumen diario opcional |
| Listados | Paginados en el servidor, filtros y orden por URL (se pueden compartir), vistas guardadas, exportación auditada |
| Errores | Mensajes en lenguaje de negocio ("Falta al menos un ítem de mano de obra"), nunca técnicos |
| Impresión | Todo detalle tiene versión imprimible/PDF |

## 5. Rendimiento y calidad

- Primera pantalla útil en menos de 2 segundos con 4G.
- Listados de 50 filas en menos de 1 segundo con millones de registros.
- Pruebas automáticas de punta a punta **por perfil** (cada rol recorre su circuito) antes de cada publicación.
- Navegadores soportados: los dos últimos años de Chrome, Edge, Firefox y Safari; en celular, Chrome Android y Safari iOS.
