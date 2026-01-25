#!/bin/sh
set -e

# ==========================================
# dCMMS Backend Docker Entrypoint
# Handles migrations and startup
# ==========================================

echo "🔍 Waiting for PostgreSQL to be ready..."

# Wait for PostgreSQL to be ready (with timeout)
TIMEOUT=60
ELAPSED=0
until pg_isready -h postgres -U dcmms_user -d dcmms > /dev/null 2>&1; do
  if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "❌ Timeout waiting for PostgreSQL"
    exit 1
  fi
  echo "⏳ Waiting for database... ($ELAPSED/$TIMEOUT seconds)"
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

echo "✅ PostgreSQL is ready"

# Run migrations
echo "🔄 Running database migrations..."
npm run db:migrate:prod

if [ $? -ne 0 ]; then
  echo "❌ Migration failed"
  exit 1
fi

echo "✅ Migrations completed successfully"

# Auto-seeding will happen automatically in index.ts if AUTO_SEED=true
echo "🌱 Auto-seed will run if enabled (AUTO_SEED=${AUTO_SEED})"

# Start the application
echo "🚀 Starting dCMMS Backend..."
exec node dist/index.js
