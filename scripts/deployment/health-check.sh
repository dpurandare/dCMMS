#!/bin/bash
#
# dCMMS Production Health Check Script
# Purpose: Comprehensive health verification after deployment
# Usage: ./health-check.sh [environment]
#

set -euo pipefail

ENVIRONMENT="${1:-production}"
BASE_URL="${BASE_URL:-https://dcmms.com}"
API_VERSION="/api/v1"

# Colors
RED='\033[0:31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

log_pass() {
  echo -e "${GREEN}✅ PASS:${NC} $1"
  ((CHECKS_PASSED++))
}

log_fail() {
  echo -e "${RED}❌ FAIL:${NC} $1"
  ((CHECKS_FAILED++))
}

log_warn() {
  echo -e "${YELLOW}⚠️  WARN:${NC} $1"
  ((CHECKS_WARNING++))
}

echo "========================================="
echo "dCMMS Health Check - ${ENVIRONMENT}"
echo "Base URL: ${BASE_URL}"
echo "========================================="
echo ""

# 1. API Health Endpoint
echo "[1/10] Checking API health endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}${API_VERSION}/health" || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  VERSION=$(echo "$BODY" | jq -r '.version' 2>/dev/null || echo "unknown")
  log_pass "API health endpoint responding (version: $VERSION)"
else
  log_fail "API health endpoint failed (HTTP $HTTP_CODE)"
fi

# 2. Database Connectivity
echo "[2/10] Checking database connectivity..."
DB_STATUS=$(echo "$BODY" | jq -r '.database' 2>/dev/null || echo "unknown")
if [ "$DB_STATUS" = "connected" ]; then
  log_pass "Database connected"
else
  log_fail "Database not connected (status: $DB_STATUS)"
fi

# 3. Authentication
echo "[3/10] Checking authentication..."
AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}${API_VERSION}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"health-check@dcmms.local","password":"HealthCheck123!"}' || echo "000")
AUTH_HTTP_CODE=$(echo "$AUTH_RESPONSE" | tail -n1)

if [ "$AUTH_HTTP_CODE" = "200" ] || [ "$AUTH_HTTP_CODE" = "401" ]; then
  log_pass "Authentication endpoint responding"
else
  log_fail "Authentication endpoint failed (HTTP $AUTH_HTTP_CODE)"
fi

# 4. Work Orders API
echo "[4/10] Checking work orders API..."
WO_RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}${API_VERSION}/work-orders?limit=1" || echo "000")
WO_HTTP_CODE=$(echo "$WO_RESPONSE" | tail -n1)

if [ "$WO_HTTP_CODE" = "200" ] || [ "$WO_HTTP_CODE" = "401" ]; then
  log_pass "Work orders API responding"
else
  log_fail "Work orders API failed (HTTP $WO_HTTP_CODE)"
fi

# 5. Frontend Loading
echo "[5/10] Checking frontend..."
FRONTEND_RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}/" || echo "000")
FRONTEND_HTTP_CODE=$(echo "$FRONTEND_RESPONSE" | tail -n1)

if [ "$FRONTEND_HTTP_CODE" = "200" ]; then
  log_pass "Frontend loading"
elif [ "$FRONTEND_HTTP_CODE" = "503" ]; then
  log_warn "Frontend in maintenance mode"
else
  log_fail "Frontend failed (HTTP $FRONTEND_HTTP_CODE)"
fi

# 6. SSL/TLS Certificate
echo "[6/10] Checking SSL certificate..."
CERT_EXPIRY=$(echo | openssl s_client -servername dcmms.com -connect dcmms.com:443 2>/dev/null | \
  openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || echo "unknown")

if [ "$CERT_EXPIRY" != "unknown" ]; then
  EXPIRY_EPOCH=$(date -d "$CERT_EXPIRY" +%s 2>/dev/null || echo 0)
  CURRENT_EPOCH=$(date +%s)
  DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

  if [ $DAYS_UNTIL_EXPIRY -gt 30 ]; then
    log_pass "SSL certificate valid ($DAYS_UNTIL_EXPIRY days remaining)"
  elif [ $DAYS_UNTIL_EXPIRY -gt 7 ]; then
    log_warn "SSL certificate expires soon ($DAYS_UNTIL_EXPIRY days)"
  else
    log_fail "SSL certificate expires very soon ($DAYS_UNTIL_EXPIRY days)"
  fi
else
  log_fail "Unable to check SSL certificate"
fi

# 7. Docker Containers (if running on Docker)
echo "[7/10] Checking Docker containers..."
if command -v docker &> /dev/null; then
  RUNNING_CONTAINERS=$(docker ps --filter "name=dcmms" --format "{{.Names}}" | wc -l)
  if [ $RUNNING_CONTAINERS -ge 3 ]; then
    log_pass "$RUNNING_CONTAINERS dCMMS containers running"
  else
    log_warn "Only $RUNNING_CONTAINERS dCMMS containers running"
  fi
else
  log_warn "Docker not available (skipping container check)"
fi

# 8. Disk Space
echo "[8/10] Checking disk space..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 80 ]; then
  log_pass "Disk usage: ${DISK_USAGE}%"
elif [ $DISK_USAGE -lt 90 ]; then
  log_warn "Disk usage high: ${DISK_USAGE}%"
else
  log_fail "Disk usage critical: ${DISK_USAGE}%"
fi

# 9. Memory Usage
echo "[9/10] Checking memory usage..."
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3/$2*100}')
if [ $MEMORY_USAGE -lt 80 ]; then
  log_pass "Memory usage: ${MEMORY_USAGE}%"
elif [ $MEMORY_USAGE -lt 90 ]; then
  log_warn "Memory usage high: ${MEMORY_USAGE}%"
else
  log_fail "Memory usage critical: ${MEMORY_USAGE}%"
fi

# 10. Release 2 Features (Compliance API)
echo "[10/10] Checking Release 2 features..."
COMPLIANCE_RESPONSE=$(curl -s -w "\n%{http_code}" "${BASE_URL}${API_VERSION}/compliance/reports?limit=1" || echo "000")
COMPLIANCE_HTTP_CODE=$(echo "$COMPLIANCE_RESPONSE" | tail -n1)

if [ "$COMPLIANCE_HTTP_CODE" = "200" ] || [ "$COMPLIANCE_HTTP_CODE" = "401" ]; then
  log_pass "Release 2 compliance API responding"
else
  log_fail "Release 2 compliance API failed (HTTP $COMPLIANCE_HTTP_CODE)"
fi

# Summary
echo ""
echo "========================================="
echo "Health Check Summary"
echo "========================================="
echo "✅ Passed: $CHECKS_PASSED"
echo "⚠️  Warnings: $CHECKS_WARNING"
echo "❌ Failed: $CHECKS_FAILED"
echo "========================================="

if [ $CHECKS_FAILED -eq 0 ]; then
  echo "✅ Overall Status: HEALTHY"
  exit 0
else
  echo "❌ Overall Status: UNHEALTHY"
  exit 1
fi
