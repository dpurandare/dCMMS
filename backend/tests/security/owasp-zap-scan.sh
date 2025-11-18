#!/bin/bash

# OWASP ZAP Security Scan Script for dCMMS API
#
# Prerequisites:
# - OWASP ZAP installed (https://www.zaproxy.org/download/)
# - dCMMS backend running on http://localhost:3000
#
# Usage: ./owasp-zap-scan.sh
#
# This script performs:
# 1. Spider scan (crawl all endpoints)
# 2. Active scan (vulnerability detection)
# 3. Generates HTML and JSON reports

set -e

# Configuration
ZAP_PORT=8090
TARGET_URL="${API_BASE_URL:-http://localhost:3000}"
REPORT_DIR="./security-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== OWASP ZAP Security Scan ===${NC}"
echo "Target: $TARGET_URL"
echo "Report Directory: $REPORT_DIR"
echo ""

# Create report directory
mkdir -p "$REPORT_DIR"

# Check if ZAP is installed
if ! command -v zap-cli &> /dev/null; then
    echo -e "${RED}Error: OWASP ZAP CLI not found${NC}"
    echo "Install with: pip install zapcli"
    echo "Or use Docker: docker run -u zap -p 8090:8090 -i owasp/zap2docker-stable zap.sh -daemon -host 0.0.0.0 -port 8090"
    exit 1
fi

# Check if target is accessible
echo -e "${YELLOW}Checking target availability...${NC}"
if ! curl -s -o /dev/null -w "%{http_code}" "$TARGET_URL/health" | grep -q "200"; then
    echo -e "${RED}Error: Target URL $TARGET_URL is not accessible${NC}"
    echo "Please start the dCMMS backend first"
    exit 1
fi
echo -e "${GREEN}✓ Target is accessible${NC}"
echo ""

# Start ZAP daemon
echo -e "${YELLOW}Starting OWASP ZAP daemon...${NC}"
zap-cli start --start-options '-config api.disablekey=true' &
ZAP_PID=$!
sleep 10

# Wait for ZAP to be ready
echo -e "${YELLOW}Waiting for ZAP to be ready...${NC}"
zap-cli status -t 120
echo -e "${GREEN}✓ ZAP is ready${NC}"
echo ""

# Open target URL
echo -e "${YELLOW}Opening target URL...${NC}"
zap-cli open-url "$TARGET_URL"
echo -e "${GREEN}✓ Target opened${NC}"
echo ""

# Configure ZAP context
echo -e "${YELLOW}Configuring ZAP context...${NC}"
zap-cli context new "dCMMS"
zap-cli context include "dCMMS" "$TARGET_URL/.*"
echo -e "${GREEN}✓ Context configured${NC}"
echo ""

# Spider scan (crawl)
echo -e "${YELLOW}Starting spider scan (this may take a few minutes)...${NC}"
zap-cli spider "$TARGET_URL" --context "dCMMS"
echo -e "${GREEN}✓ Spider scan completed${NC}"
echo ""

# Active scan (vulnerability detection)
echo -e "${YELLOW}Starting active scan (this may take 10-30 minutes)...${NC}"
echo "Scanning for:"
echo "  - SQL Injection"
echo "  - XSS (Cross-Site Scripting)"
echo "  - CSRF (Cross-Site Request Forgery)"
echo "  - Security Headers"
echo "  - Authentication issues"
echo "  - And more..."
echo ""

zap-cli active-scan "$TARGET_URL" --recursive --context "dCMMS"
echo -e "${GREEN}✓ Active scan completed${NC}"
echo ""

# Generate reports
echo -e "${YELLOW}Generating reports...${NC}"

# HTML Report
zap-cli report -o "$REPORT_DIR/zap-report-$TIMESTAMP.html" -f html
echo -e "${GREEN}✓ HTML report: $REPORT_DIR/zap-report-$TIMESTAMP.html${NC}"

# JSON Report
zap-cli report -o "$REPORT_DIR/zap-report-$TIMESTAMP.json" -f json
echo -e "${GREEN}✓ JSON report: $REPORT_DIR/zap-report-$TIMESTAMP.json${NC}"

# XML Report
zap-cli report -o "$REPORT_DIR/zap-report-$TIMESTAMP.xml" -f xml
echo -e "${GREEN}✓ XML report: $REPORT_DIR/zap-report-$TIMESTAMP.xml${NC}"
echo ""

# Get alerts summary
echo -e "${YELLOW}Alerts Summary:${NC}"
zap-cli alerts

# Check for high-risk vulnerabilities
HIGH_RISK=$(zap-cli alerts | grep -c "High" || true)
MEDIUM_RISK=$(zap-cli alerts | grep -c "Medium" || true)

echo ""
echo -e "${YELLOW}=== Scan Summary ===${NC}"
echo "High Risk Issues: $HIGH_RISK"
echo "Medium Risk Issues: $MEDIUM_RISK"
echo ""

# Shutdown ZAP
echo -e "${YELLOW}Shutting down ZAP...${NC}"
zap-cli shutdown
wait $ZAP_PID 2>/dev/null || true
echo -e "${GREEN}✓ ZAP shutdown${NC}"
echo ""

# Final result
if [ "$HIGH_RISK" -gt 0 ]; then
    echo -e "${RED}❌ FAIL: $HIGH_RISK high-risk vulnerabilities found!${NC}"
    echo "Review the report: $REPORT_DIR/zap-report-$TIMESTAMP.html"
    exit 1
else
    echo -e "${GREEN}✓ PASS: No high-risk vulnerabilities found${NC}"
    if [ "$MEDIUM_RISK" -gt 0 ]; then
        echo -e "${YELLOW}⚠ Warning: $MEDIUM_RISK medium-risk issues found${NC}"
        echo "Review the report: $REPORT_DIR/zap-report-$TIMESTAMP.html"
    fi
fi

echo ""
echo -e "${GREEN}=== Scan Complete ===${NC}"
echo "Full report available at: $REPORT_DIR/zap-report-$TIMESTAMP.html"
