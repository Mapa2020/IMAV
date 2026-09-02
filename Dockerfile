# Multi-stage build para el Frontend de IMAV Motors
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar el código fuente
COPY . .

# Compilar en modo producción con target node-server
ENV NITRO_PRESET=node-server
RUN npm run build

# Etapa final de producción (ultraligera)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5173
ENV HOST=0.0.0.0

# Copiar únicamente el servidor y assets generados
COPY --from=builder /app/.output ./.output

EXPOSE 5173

CMD ["node", ".output/server/index.mjs"]
