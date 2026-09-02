# Multi-stage build para el Backend de IMAV Motors
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependencias para la compilación
COPY package*.json ./
RUN npm ci

# Copiar archivos fuente y compilar TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Imagen final de producción
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Instalar únicamente dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar el código compilado desde la etapa anterior
COPY --from=builder /app/dist ./dist

# Crear directorio para respaldos de la base de datos
RUN mkdir -p backups

EXPOSE 5000

CMD ["node", "dist/server.js"]
