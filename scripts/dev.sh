#!/bin/bash

# ==========================================
# dCMMS Local Development Script
# Infrastructure in Docker, Apps run locally
# ==========================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   dCMMS Local Development Mode        ║${NC}"
echo -e "${BLUE}║   Infra in Docker · Apps run locally  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# ── Preflight checks ──────────────────────────────────────────
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
  exit 1
fi

if docker compose version &> /dev/null; then
  DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
  DOCKER_COMPOSE="docker-compose"
else
  echo -e "${RED}❌ Docker Compose is not installed.${NC}"
  exit 1
fi

if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js is not installed.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Preflight checks passed (Node $(node --version))${NC}"
echo ""

# ── Stop any running backend/frontend containers ───────────────
echo -e "${YELLOW}🛑 Stopping backend/frontend Docker containers (if running)...${NC}"
$DOCKER_COMPOSE stop backend frontend ml-inference 2>/dev/null || true
$DOCKER_COMPOSE rm -f backend frontend ml-inference 2>/dev/null || true

# ── Start infrastructure services ─────────────────────────────
echo ""
echo -e "${YELLOW}📦 Starting infrastructure in Docker...${NC}"
echo -e "   • Databases: PostgreSQL, QuestDB, TimescaleDB, ClickHouse"
echo -e "   • Cache & Queue: Redis, Kafka, EMQX"
echo -e "   • Storage: MinIO · Secrets: Vault"
echo -e "   • Monitoring: Prometheus, Grafana, Loki"
echo ""

$DOCKER_COMPOSE up -d \
  postgres questdb timescaledb clickhouse \
  redis kafka emqx \
  minio vault \
  prometheus grafana loki

# ── Wait for critical services ─────────────────────────────────
echo ""
echo -e "${YELLOW}⏳ Waiting for critical services to be ready...${NC}"

TIMEOUT=60
ELAPSED=0
echo -n "   PostgreSQL... "
until docker exec dcmms-postgres pg_isready -U dcmms_user -d dcmms > /dev/null 2>&1; do
  if [ $ELAPSED -ge $TIMEOUT ]; then echo -e "${RED}timeout${NC}"; exit 1; fi
  sleep 2; ELAPSED=$((ELAPSED + 2))
done
echo -e "${GREEN}ready${NC}"

ELAPSED=0
echo -n "   Redis... "
until docker exec dcmms-redis redis-cli --raw incr ping > /dev/null 2>&1; do
  if [ $ELAPSED -ge $TIMEOUT ]; then echo -e "${RED}timeout${NC}"; exit 1; fi
  sleep 2; ELAPSED=$((ELAPSED + 2))
done
echo -e "${GREEN}ready${NC}"

ELAPSED=0
echo -n "   Kafka... "
until docker exec dcmms-kafka kafka-topics.sh --bootstrap-server localhost:9092 --list > /dev/null 2>&1; do
  if [ $ELAPSED -ge $TIMEOUT ]; then echo -e "${YELLOW}still starting (continuing anyway)${NC}"; break; fi
  sleep 2; ELAPSED=$((ELAPSED + 2))
done
echo -e "${GREEN}ready${NC}"

echo ""
echo -e "${GREEN}✅ Infrastructure is ready${NC}"
echo ""

# ── Install dependencies if needed ────────────────────────────
if [ ! -d "$ROOT_DIR/backend/node_modules" ]; then
  echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
  npm --prefix "$ROOT_DIR/backend" ci
fi

if [ ! -d "$ROOT_DIR/frontend/node_modules" ]; then
  echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
  npm --prefix "$ROOT_DIR/frontend" ci
fi

# ── Run database migrations ────────────────────────────────────
echo -e "${YELLOW}🔄 Running database migrations...${NC}"
npm --prefix "$ROOT_DIR/backend" run db:migrate
echo -e "${GREEN}✅ Migrations complete${NC}"
echo ""

# ── Start apps locally ─────────────────────────────────────────
echo -e "${YELLOW}🚀 Starting backend and frontend locally...${NC}"
echo ""

# Track PIDs for cleanup
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo -e "${YELLOW}🛑 Shutting down local apps...${NC}"
  [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null || true
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true
  echo -e "${GREEN}✅ Local apps stopped. Docker infra is still running.${NC}"
  echo -e "   To stop infra: docker compose stop"
  exit 0
}
trap cleanup SIGINT SIGTERM

# Start backend
npm --prefix "$ROOT_DIR/backend" run dev > /tmp/dcmms-backend.log 2>&1 &
BACKEND_PID=$!
echo -e "   ${GREEN}• Backend started${NC} (PID $BACKEND_PID) → logs: /tmp/dcmms-backend.log"

# Give backend a moment before starting frontend
sleep 2

# Start frontend
npm --prefix "$ROOT_DIR/frontend" run dev > /tmp/dcmms-frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "   ${GREEN}• Frontend started${NC} (PID $FRONTEND_PID) → logs: /tmp/dcmms-frontend.log"

# Wait for backend health
echo ""
echo -n "   Waiting for backend to be ready..."
ELAPSED=0
until curl -s http://localhost:3001/health > /dev/null 2>&1; do
  if [ $ELAPSED -ge 30 ]; then
    echo -e " ${RED}timeout — check /tmp/dcmms-backend.log${NC}"
    break
  fi
  sleep 2; ELAPSED=$((ELAPSED + 2)); echo -n "."
done
echo -e " ${GREEN}ready${NC}"

# ── Summary ────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🖥  Application (running locally)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "   ${GREEN}• Frontend:${NC}    http://localhost:3000"
echo -e "   ${GREEN}• Backend API:${NC} http://localhost:3001"
echo -e "   ${GREEN}• API Docs:${NC}    http://localhost:3001/docs"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Infrastructure (Docker)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "   ${GREEN}• PostgreSQL:${NC}  localhost:5434"
echo -e "   ${GREEN}• Redis:${NC}       localhost:6379"
echo -e "   ${GREEN}• Kafka:${NC}       localhost:9094"
echo -e "   ${GREEN}• Grafana:${NC}     http://localhost:3002 (admin/admin)"
echo -e "   ${GREEN}• MinIO:${NC}       http://localhost:9001 (minioadmin/minioadmin)"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔐 Default Credentials${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "   ${GREEN}• Admin:${NC}       admin@example.com / Password123!"
echo -e "   ${GREEN}• Manager:${NC}     manager@example.com / Password123!"
echo -e "   ${GREEN}• Technician:${NC}  technician@example.com / Password123!"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}📋 Logs: tail -f /tmp/dcmms-backend.log /tmp/dcmms-frontend.log${NC}"
echo -e "${YELLOW}   Press Ctrl+C to stop local apps (infra keeps running)${NC}"
echo ""

# Tail both logs interactively
tail -f /tmp/dcmms-backend.log /tmp/dcmms-frontend.log &
TAIL_PID=$!

# Wait for either app to exit unexpectedly
wait $BACKEND_PID 2>/dev/null || true
wait $FRONTEND_PID 2>/dev/null || true
kill $TAIL_PID 2>/dev/null || true
