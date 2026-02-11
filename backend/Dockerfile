FROM node:20-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npm run build

FROM node:20-alpine
# Install PostgreSQL client for pg_isready
RUN apk add --no-cache postgresql-client

WORKDIR /app

# Copy package files and install production dependencies
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy migrations SQL files (needed for drizzle migrate to work)
COPY --from=builder /app/drizzle ./drizzle

# Copy OpenAPI spec for Swagger documentation
COPY docs/api ./docs/api

# Copy entrypoint script
COPY backend/scripts/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001

# Use entrypoint script instead of direct node command
CMD ["./docker-entrypoint.sh"]
