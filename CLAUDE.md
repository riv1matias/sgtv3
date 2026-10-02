@AGENTS.md

# SGT — guía para trabajar en el repositorio

- Idioma: todo el dominio, la interfaz, los mensajes y los commits en español (Argentina).
- Especificación funcional en `spec/` (fuente de verdad de las reglas de negocio). `.spec/` es histórica.
- Capas: `src/domain` (reglas puras, sin I/O, con pruebas unitarias) → `src/server` (servicios con transacciones y auditoría) → `src/app` (páginas y Server Actions). Las páginas nunca contienen reglas de negocio.
- Toda mutación pasa por un servicio que: valida permisos con el motor de flujo, corre en una transacción y registra un evento con `registrarEvento`.
- Los errores de negocio se lanzan como `ErrorNegocio` (mensaje para el usuario); las acciones de servidor los convierten con `ejecutar()`.
- Dinero: usar `src/domain/dinero.ts` (decimal exacto). Nunca `Number` para importes que se guardan.
- Circuitos: `flujos/*.yaml`. Para agregar una condición/validación/efecto nuevo, implementarlo en el servicio y registrarlo en `PIEZAS` (`src/domain/flujo/definiciones.ts`).
- Base: `pnpm db:generate` para crear migraciones después de cambiar `src/db/schema.ts`. La tabla `eventos` es inmutable: no escribir migraciones que la modifiquen.
- Verificación antes de subir: `pnpm typecheck && pnpm test` (y `pnpm test:e2e` con la app corriendo sobre una base recién cargada).
- Los datos de demo son ficticios. No versionar planillas ni datos reales de la empresa.
