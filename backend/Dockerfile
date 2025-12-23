FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
# Install PostgreSQL client for pg_isready
RUN apk add --no-cache postgresql-client

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist

# Copy migrations (needed for db:migrate to work)
COPY --from=builder /app/drizzle ./drizzle

# Copy migration script
COPY --from=builder /app/src/db/migrate.ts ./src/db/migrate.ts

# Copy entrypoint script
COPY scripts/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001

# Use entrypoint script instead of direct node command
CMD ["./docker-entrypoint.sh"]
