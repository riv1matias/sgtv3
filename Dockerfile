# Imagen de producción (Next.js standalone). Base de datos y almacenamiento son servicios administrados externos.
FROM node:22-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S sgt && adduser -S sgt -G sgt
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
# Migraciones, flujos y scripts para ejecutar "migrar" como tarea previa al despliegue
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/flujos ./flujos
USER sgt
EXPOSE 3000
CMD ["node", "server.js"]
