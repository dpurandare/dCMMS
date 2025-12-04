#!/bin/bash

# ==========================================
# dCMMS Local Build & Deploy Script
# ==========================================

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting dCMMS Local Build & Deploy...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
  exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}⚠️  docker-compose command not found, checking for 'docker compose'...${NC}"
    if ! docker compose version &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is not installed.${NC}"
        exit 1
    else
        DOCKER_COMPOSE="docker compose"
    fi
else
    DOCKER_COMPOSE="docker-compose"
fi

echo -e "${GREEN}✅ Docker environment detected.${NC}"

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping any running containers...${NC}"
$DOCKER_COMPOSE down

# Build images
echo -e "${YELLOW}🏗️  Building Docker images (this may take a while)...${NC}"
$DOCKER_COMPOSE build

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Build failed.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Build successful.${NC}"

# Start services
echo -e "${YELLOW}🚀 Starting services...${NC}"
$DOCKER_COMPOSE up -d

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to start services.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Services started successfully!${NC}"
echo -e "${GREEN}   - Frontend: http://localhost:3000${NC}"
echo -e "${GREEN}   - Backend API: http://localhost:3001${NC}"
echo -e "${GREEN}   - Grafana: http://localhost:3000 (if configured)${NC}"

# Follow logs
echo -e "${YELLOW}📋 Tailing logs for backend and frontend (Press Ctrl+C to exit logs, containers will keep running)...${NC}"
$DOCKER_COMPOSE logs -f backend frontend
