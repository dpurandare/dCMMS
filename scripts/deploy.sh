#!/bin/bash
set -e

# ==========================================
# dCMMS Full Stack Deployment Script
# One-Command Complete Application Deployment
# ==========================================

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   dCMMS Full Stack Deployment         ║${NC}"
echo -e "${BLUE}║   Complete Application + Infrastructure║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check for docker compose command
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    echo -e "${RED}❌ Docker Compose is not installed.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker Compose detected${NC}"
echo ""

# Optional: Clean previous deployment (uncomment for fresh start)
# echo -e "${YELLOW}🧹 Cleaning previous deployment...${NC}"
# $DOCKER_COMPOSE down -v

echo -e "${YELLOW}📦 Starting Complete Infrastructure Stack...${NC}"
echo -e "   This includes:"
echo -e "   • Databases: PostgreSQL, QuestDB, TimescaleDB, ClickHouse"
echo -e "   • Cache & Queue: Redis, Kafka, EMQX"
echo -e "   • Storage: MinIO (S3-compatible)"
echo -e "   • Secrets: HashiCorp Vault"
echo -e "   • Monitoring: Prometheus, Grafana, Loki"
echo ""

# Start all infrastructure services
$DOCKER_COMPOSE up -d \
  postgres \
  questdb \
  timescaledb \
  clickhouse \
  redis \
  kafka \
  emqx \
  minio \
  vault \
  prometheus \
  grafana \
  loki

# Wait for critical services to be healthy
echo ""
echo -e "${YELLOW}⏳ Waiting for critical services to be ready...${NC}"

# Wait for PostgreSQL (most critical for migrations)
TIMEOUT=60
ELAPSED=0
echo -e "   Checking PostgreSQL..."
until docker exec dcmms-postgres pg_isready -U dcmms_user -d dcmms > /dev/null 2>&1; do
  if [ $ELAPSED -ge $TIMEOUT ]; then
    echo -e "${RED}❌ Timeout waiting for PostgreSQL${NC}"
    exit 1
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done
echo -e "   ${GREEN}✅ PostgreSQL is ready${NC}"

# Wait for Redis
ELAPSED=0
echo -e "   Checking Redis..."
until docker exec dcmms-redis redis-cli --raw incr ping > /dev/null 2>&1; do
  if [ $ELAPSED -ge $TIMEOUT ]; then
    echo -e "${RED}❌ Timeout waiting for Redis${NC}"
    exit 1
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done
echo -e "   ${GREEN}✅ Redis is ready${NC}"

# Wait for Kafka (important for telemetry)
ELAPSED=0
echo -e "   Checking Kafka..."
until docker exec dcmms-kafka kafka-topics.sh --bootstrap-server localhost:9092 --list > /dev/null 2>&1; do
  if [ $ELAPSED -ge $TIMEOUT ]; then
    echo -e "${YELLOW}⚠️  Kafka not ready yet, continuing anyway...${NC}"
    break
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done
echo -e "   ${GREEN}✅ Kafka is ready${NC}"

echo ""
echo -e "${GREEN}✅ Infrastructure services are ready${NC}"
echo ""

# Build and start application services
# The backend entrypoint will automatically:
#   1. Wait for postgres
#   2. Run migrations
#   3. Auto-seed if needed (AUTO_SEED=true)
#   4. Start the server
echo -e "${YELLOW}🏗️  Building and starting application services...${NC}"
echo -e "   • Backend (with auto-migrations)"
echo -e "   • Frontend"
echo -e "   • ML Inference Service"
echo ""

$DOCKER_COMPOSE up -d --build backend frontend ml-inference

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Application Services${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "   ${GREEN}• Frontend:${NC}       http://localhost:3000"
echo -e "   ${GREEN}• Backend API:${NC}    http://localhost:3001"
echo -e "   ${GREEN}• API Docs:${NC}       http://localhost:3001/docs"
echo -e "   ${GREEN}• ML Inference:${NC}   http://localhost:8000"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Infrastructure Services${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "   ${GREEN}• PostgreSQL:${NC}     localhost:5434"
echo -e "   ${GREEN}• QuestDB UI:${NC}     http://localhost:9000"
echo -e "   ${GREEN}• TimescaleDB:${NC}    localhost:5433"
echo -e "   ${GREEN}• ClickHouse:${NC}     http://localhost:8123"
echo -e "   ${GREEN}• Redis:${NC}          localhost:6379"
echo -e "   ${GREEN}• Kafka:${NC}          localhost:9094"
echo -e "   ${GREEN}• EMQX Dashboard:${NC} http://localhost:18083 (admin/public)"
echo -e "   ${GREEN}• MinIO Console:${NC}  http://localhost:9001 (minioadmin/minioadmin)"
echo -e "   ${GREEN}• Vault:${NC}          http://localhost:8200 (token: root)"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📈 Monitoring & Tools${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "   ${GREEN}• Grafana:${NC}        http://localhost:3002 (admin/admin)"
echo -e "   ${GREEN}• Prometheus:${NC}     http://localhost:9095"
echo -e "   ${GREEN}• Loki:${NC}           http://localhost:3100"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔐 Default Login Credentials${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "   ${GREEN}• Admin:${NC}          admin@example.com / Password123!"
echo -e "   ${GREEN}• Manager:${NC}        manager@example.com / Password123!"
echo -e "   ${GREEN}• Technician:${NC}     technician@example.com / Password123!"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📋 Tailing application logs (Ctrl+C to exit, services will keep running)...${NC}"
echo ""

# Tail logs for backend and frontend
$DOCKER_COMPOSE logs -f backend frontend
