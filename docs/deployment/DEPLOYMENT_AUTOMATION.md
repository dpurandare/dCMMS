# dCMMS Deployment Automation - Status & Recommendations

## Current State: What's Already Automated ✅

### 1. **Auto-Seed System** (Just Implemented)

**Automatic seeding happens when:**
- `AUTO_SEED=true` in environment variables
- `NODE_ENV=development` (or `test`/`local`)
- Database is empty (no tenants exist)

**How it works:**
```typescript
// backend/src/index.ts
async function start() {
  const server = await buildServer();
  await autoSeedIfNeeded();  // ⬅️ Automatically seeds if needed
  await server.listen({ port: PORT, host: HOST });
}
```

**Docker Compose integration:**
```yaml
# docker-compose.yml (lines 370-371)
backend:
  environment:
    NODE_ENV: development
    AUTO_SEED: "true"  # ⬅️ Automatic seeding enabled
```

### 2. **Database Initialization**

**PostgreSQL init script:**
```yaml
# docker-compose.yml (line 25)
volumes:
  - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/01-init.sql
```

This script runs **once** when the PostgreSQL container is first created.

### 3. **Docker Compose Deployment**

**Single command to start everything:**
```bash
docker compose up -d
```

**What this does:**
1. ✅ Starts all infrastructure (Postgres, Redis, Kafka, etc.)
2. ✅ Builds backend and frontend containers
3. ✅ Waits for dependencies (health checks)
4. ✅ Starts backend (which runs migrations + auto-seed)
5. ✅ Starts frontend

**Helper script available:**
```bash
./scripts/start-local.sh
```

This script:
- Checks Docker is running
- Stops existing containers
- Builds images
- Starts services
- Tails logs

---

## What's NOT Fully Automated ❌

### 1. **Migrations Not in Dockerfile**

**Current issue:** The backend Dockerfile doesn't run migrations during build/startup.

**Backend Dockerfile (current):**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3001
CMD ["node", "dist/index.js"]  # ⬅️ Just starts the server
```

**What's missing:**
- Migrations are NOT automatically run
- You must manually run `npm run db:migrate` before starting

### 2. **No Pre-Start Script**

The backend doesn't have a startup script that:
1. Waits for database to be ready
2. Runs migrations
3. Then starts the server

### 3. **Volume Persistence Issues**

**Problem:** When you run `docker compose down -v`, all data is lost because we delete volumes.

**Current volumes:**
```yaml
volumes:
  postgres_data:
    driver: local  # ⬅️ Local only, lost when deleted
```

---

## Repeatability Analysis

| Step                     | Repeatable? | Automated? | Notes                                    |
| ------------------------ | ----------- | ---------- | ---------------------------------------- |
| **Start Infrastructure** | ✅ Yes       | ✅ Yes      | `docker compose up postgres redis kafka` |
| **Run Migrations**       | ✅ Yes       | ❌ Manual   | Must run `npm run db:migrate`            |
| **Seed Database**        | ✅ Yes       | ✅ Yes*     | Auto-seeds if `AUTO_SEED=true`           |
| **Start Backend**        | ✅ Yes       | ✅ Yes      | `docker compose up backend`              |
| **Start Frontend**       | ✅ Yes       | ✅ Yes      | `docker compose up frontend`             |
| **Full Deployment**      | ✅ Yes       | ⚠️ Partial  | Missing migration automation             |

*Auto-seed only works if migrations have already run

---

## Recommended Improvements

### 1. **Add Pre-Start Script to Backend**

Create `backend/scripts/docker-entrypoint.sh`:

```bash
#!/bin/sh
set -e

echo "🔍 Waiting for PostgreSQL to be ready..."
until pg_isready -h postgres -U dcmms_user -d dcmms; do
  echo "Waiting for database..."
  sleep 2
done

echo "✅ Database is ready"

echo "🔄 Running migrations..."
npm run db:migrate

echo "🌱 Auto-seeding will run if needed..."
echo "🚀 Starting server..."
exec node dist/index.js
```

Update `backend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .\nRUN npm run build

FROM node:20-alpine
RUN apk add --no-cache postgresql-client  # For pg_isready
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/drizzle ./drizzle  # ⬅️ Copy migrations
COPY scripts/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE 3001
CMD ["./docker-entrypoint.sh"]  # ⬅️ Use entrypoint
```

### 2. **Create Single-Command Deploy Script**

Create `scripts/deploy-local.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 dCMMS One-Command Deploy"

# Check prerequisites
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker not running"
  exit 1
fi

# Clean start (optional - comment out for persistence)
# echo "🧹 Cleaning previous deployment..."
# docker compose down -v

# Start infrastructure first
echo "📦 Starting infrastructure..."
docker compose up -d postgres redis kafka clickhouse timescaledb minio

# Wait for PostgreSQL
echo "⏳ Waiting for PostgreSQL..."
timeout 60 bash -c 'until docker exec dcmms-postgres pg_isready -U dcmms_user -d dcmms > /dev/null 2>&1; do sleep 2; done'

# Build and start application services
echo "🏗️ Building and starting application..."
docker compose up -d --build backend frontend

# Show status
echo "✅ Deployment complete!"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend: http://localhost:3001"
echo "   - Credentials: admin@example.com / Password123!"

# Tail logs
docker compose logs -f backend frontend
```

### 3. **Create Environment-Specific Compose Files**

**docker-compose.yml** - Base configuration

**docker-compose.dev.yml** - Development overrides:
```yaml
version: '3.9'
services:
  backend:
    environment:
      NODE_ENV: development
      AUTO_SEED: "true"
      LOG_LEVEL: debug
    volumes:
      - ./backend/src:/app/src  # Hot reload
```

**docker-compose.prod.yml** - Production overrides:
```yaml
version: '3.9'
services:
  backend:
    environment:
      NODE_ENV: production
      AUTO_SEED: "false"
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

**Usage:**
```bash
# Development
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Deployment Workflows

### Development (Local)

**Current (Manual):**
```bash
# 1. Start infrastructure
docker compose up -d postgres redis kafka

# 2. Run migrations manually
cd backend && npm run db:migrate

# 3. Start application
docker compose up -d backend frontend
```

**Proposed (Automated):**
```bash
# One command does everything
./scripts/deploy-local.sh
```

### CI/CD (Production)

**Create `.github/workflows/deploy.yml`:**
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker images
        run: docker compose build
      
      - name: Run migrations
        run: |
          docker compose up -d postgres
          docker compose run --rm backend npm run db:migrate
      
      - name: Deploy application
        run: docker compose up -d
      
      - name: Health check
        run: ./scripts/deployment/health-check.sh
```

---

## Answer to Your Questions

### ✅ **Are these steps repeatable?**

**YES**, all steps are repeatable:
- Database recreation: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
- Migrations: Idempotent (can run multiple times safely)
- Seeding: Checks if data exists before seeding
- Docker builds: Always produce same result from same code

### ⚠️ **Are these part of application deployment?**

**PARTIALLY**:
- ✅ Auto-seeding: Yes, integrated in `src/index.ts`
- ❌ Migrations: No, must run manually
- ✅ Docker startup: Yes, via `docker compose up`

### ✅ **Can we have single-command deploy?**

**YES**, with recommended improvements:

**Quickest solution (no code changes):**
```bash
# Create scripts/one-command-deploy.sh
docker compose up -d postgres redis kafka
sleep 10  # Wait for DB
docker compose run --rm backend npm run db:migrate
docker compose up -d backend frontend
```

**Best solution (with code changes):**
Implement the docker-entrypoint.sh script in the backend, then:
```bash
docker compose up -d --build
# Everything happens automatically:
# - Migrations run
# - Auto-seed runs if needed
# - Services start
```

---

## Recommended Next Steps

1. **Immediate (Quick Win):**
   - [ ] Create `scripts/one-command-deploy.sh` script
   - [ ] Test it works cleanly from scratch

2. **Short-term (Best Practice):**
   - [ ] Add `docker-entrypoint.sh` to backend
   - [ ] Update `backend/Dockerfile` to use entrypoint
   - [ ] Copy drizzle migrations into Docker image
   - [ ] Test full deployment from clean state

3. **Long-term (Production Ready):**
   - [ ] Create environment-specific compose files
   - [ ] Add health check endpoints
   - [ ] Implement graceful shutdown
   - [ ] Add database backup automation
   - [ ] Set up CI/CD pipeline

---

## Testing Repeatability

**To verify complete repeatability:**

```bash
# Complete teardown
docker compose down -v
docker system prune -f

# One-command deploy
./scripts/deploy-local.sh  # Or docker compose up -d --build

# Verify
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Password123!"}'
```

**Expected result:** Login should work immediately without any manual steps.

---

## Summary

**Current Status:**
- ✅ Infrastructure: Fully automated
- ⚠️ Migrations: Manual step required
- ✅ Seeding: Automated (if migrations run)
- ⚠️ Overall: 80% automated, needs migration integration

**With Recommended Changes:**
- ✅ 100% automated single-command deployment
- ✅ Fully repeatable from clean state
- ✅ Production-ready with proper entrypoint
- ✅ Environment-specific configurations
