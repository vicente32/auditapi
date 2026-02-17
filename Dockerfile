# ETAPA 1: Dependencias de Producción (Cacheable)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Instalamos SOLO producción y limpiamos caché en la misma capa para ahorrar espacio
RUN npm ci --omit=dev && npm cache clean --force

# ETAPA 2: Builder (Necesita devDependencies para compilar TS)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
# Instalamos todo (incluyendo dev)
RUN npm ci
# Copiamos código fuente
COPY src ./src
COPY config ./config
# Compilamos
RUN npm run build

# ETAPA 3: Imagen Final (Distroless approach - lo más ligero posible)
FROM node:20-alpine AS runner
WORKDIR /app

# Instalamos jq para procesar JSON en el entrypoint (GitHub Actions)
RUN apk add --no-cache jq

# Variable de entorno crítica
ENV NODE_ENV=production

# Copiamos SOLO lo necesario de las etapas anteriores
# 1. Los node_modules limpios de producción
COPY --from=deps /app/node_modules ./node_modules
# 2. El código compilado
COPY --from=builder /app/dist ./dist
# 3. La configuración
COPY --from=builder /app/config ./config
# 4. El package.json (por si el CLI lee la versión)
COPY --from=builder /app/package.json ./package.json
# 5. Las funciones personalizadas (no se compilan con TypeScript)
COPY --from=builder /app/src/functions ./dist/functions

# Copiamos el entrypoint para GitHub Actions
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Usuario no-root
USER node

ENTRYPOINT ["/entrypoint.sh"]
