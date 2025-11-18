#!/bin/bash

# Security Testing Script for dCMMS API
#
# Tests for:
# - SQL Injection
# - XSS (Cross-Site Scripting)
# - Authentication bypass
# - Authorization issues
# - Security headers
# - Secrets exposure
#
# Usage: ./security-tests.sh

set -e

TARGET_URL="${API_BASE_URL:-http://localhost:3000}"
API_VERSION="/api/v1"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}=== dCMMS Security Tests ===${NC}"
echo "Target: $TARGET_URL"
echo ""

# Helper functions
check_passed() {
    echo -e "${GREEN}✓ PASS:${NC} $1"
    ((PASSED++))
}

check_failed() {
    echo -e "${RED}✗ FAIL:${NC} $1"
    ((FAILED++))
}

check_warning() {
    echo -e "${YELLOW}⚠ WARNING:${NC} $1"
    ((WARNINGS++))
}

# Get auth token for authenticated tests
get_token() {
    curl -s -X POST "$TARGET_URL$API_VERSION/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@dcmms.local","password":"admin123"}' \
        | grep -o '"token":"[^"]*' | cut -d'"' -f4
}

# =============================================================================
# Test 1: SQL Injection Protection
# =============================================================================
echo -e "${BLUE}Test 1: SQL Injection Protection${NC}"

TOKEN=$(get_token)

# Test 1.1: SQL injection in search parameter
echo "  Testing SQL injection in search..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
    "$TARGET_URL$API_VERSION/work-orders?search=' OR '1'='1" \
    -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" != "500" ] && ! echo "$BODY" | grep -qi "error\|exception\|sql"; then
    check_passed "SQL injection in search parameter blocked"
else
    check_failed "SQL injection in search parameter may be vulnerable (Status: $HTTP_CODE)"
fi

# Test 1.2: SQL injection in filter parameters
echo "  Testing SQL injection in filter..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
    "$TARGET_URL$API_VERSION/work-orders?status='; DROP TABLE work_orders;--" \
    -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "200" ]; then
    check_passed "SQL injection in filter parameter handled safely"
else
    check_failed "SQL injection in filter parameter may be vulnerable (Status: $HTTP_CODE)"
fi

echo ""

# =============================================================================
# Test 2: XSS (Cross-Site Scripting) Protection
# =============================================================================
echo -e "${BLUE}Test 2: XSS Protection${NC}"

# Test 2.1: XSS in work order title
echo "  Testing XSS in work order creation..."
XSS_PAYLOAD='<script>alert("XSS")</script>'
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$TARGET_URL$API_VERSION/work-orders" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"$XSS_PAYLOAD\",\"description\":\"Test\",\"type\":\"corrective\",\"priority\":\"medium\",\"status\":\"draft\",\"assetId\":\"test\",\"siteId\":\"test\"}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if ! echo "$BODY" | grep -q "<script>"; then
    check_passed "XSS payload properly escaped/sanitized"
else
    check_warning "XSS payload may not be properly escaped"
fi

echo ""

# =============================================================================
# Test 3: Authentication Bypass
# =============================================================================
echo -e "${BLUE}Test 3: Authentication Bypass${NC}"

# Test 3.1: Access protected endpoint without token
echo "  Testing access without authentication..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
    "$TARGET_URL$API_VERSION/work-orders")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
    check_passed "Protected endpoint requires authentication"
else
    check_failed "Protected endpoint accessible without authentication (Status: $HTTP_CODE)"
fi

# Test 3.2: Access with invalid token
echo "  Testing access with invalid token..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
    "$TARGET_URL$API_VERSION/work-orders" \
    -H "Authorization: Bearer invalid.token.here")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
    check_passed "Invalid token rejected"
else
    check_failed "Invalid token may be accepted (Status: $HTTP_CODE)"
fi

# Test 3.3: Access with expired token (simulated)
echo "  Testing access with malformed token..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
    "$TARGET_URL$API_VERSION/work-orders" \
    -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
    check_passed "Malformed/expired token rejected"
else
    check_failed "Malformed token may be accepted (Status: $HTTP_CODE)"
fi

echo ""

# =============================================================================
# Test 4: Authorization (RBAC)
# =============================================================================
echo -e "${BLUE}Test 4: Authorization (RBAC)${NC}"

# Note: This test assumes different user roles exist
# Adjust based on actual implementation

echo "  Testing role-based access control..."
# For now, just verify that endpoints check for valid tokens
# More detailed RBAC tests would require test users with different roles
check_warning "RBAC tests require test users with different roles (manual verification needed)"

echo ""

# =============================================================================
# Test 5: Security Headers
# =============================================================================
echo -e "${BLUE}Test 5: Security Headers${NC}"

HEADERS=$(curl -s -I "$TARGET_URL/health")

# Test 5.1: X-Content-Type-Options
echo "  Checking X-Content-Type-Options header..."
if echo "$HEADERS" | grep -qi "X-Content-Type-Options: nosniff"; then
    check_passed "X-Content-Type-Options header present"
else
    check_warning "X-Content-Type-Options header missing"
fi

# Test 5.2: X-Frame-Options
echo "  Checking X-Frame-Options header..."
if echo "$HEADERS" | grep -qi "X-Frame-Options"; then
    check_passed "X-Frame-Options header present"
else
    check_warning "X-Frame-Options header missing"
fi

# Test 5.3: X-XSS-Protection (deprecated but still good)
echo "  Checking X-XSS-Protection header..."
if echo "$HEADERS" | grep -qi "X-XSS-Protection"; then
    check_passed "X-XSS-Protection header present"
else
    check_warning "X-XSS-Protection header missing (deprecated but recommended)"
fi

# Test 5.4: Strict-Transport-Security (HTTPS only)
echo "  Checking Strict-Transport-Security header..."
if [ "${TARGET_URL:0:5}" = "https" ]; then
    if echo "$HEADERS" | grep -qi "Strict-Transport-Security"; then
        check_passed "HSTS header present"
    else
        check_warning "HSTS header missing (important for HTTPS)"
    fi
else
    check_warning "Not using HTTPS (HSTS not applicable)"
fi

# Test 5.5: Content-Security-Policy
echo "  Checking Content-Security-Policy header..."
if echo "$HEADERS" | grep -qi "Content-Security-Policy"; then
    check_passed "CSP header present"
else
    check_warning "Content-Security-Policy header missing"
fi

echo ""

# =============================================================================
# Test 6: Secrets Exposure
# =============================================================================
echo -e "${BLUE}Test 6: Secrets Exposure${NC}"

# Test 6.1: Check for exposed .env files
echo "  Checking for exposed .env file..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$TARGET_URL/.env")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "403" ]; then
    check_passed ".env file not accessible"
else
    check_failed ".env file may be exposed! (Status: $HTTP_CODE)"
fi

# Test 6.2: Check error messages for sensitive info
echo "  Checking error messages..."
RESPONSE=$(curl -s -X GET "$TARGET_URL$API_VERSION/work-orders/invalid-uuid-format" \
    -H "Authorization: Bearer $TOKEN")

if ! echo "$RESPONSE" | grep -qi "password\|secret\|key\|token\|database\|connection"; then
    check_passed "Error messages don't expose sensitive information"
else
    check_failed "Error messages may expose sensitive information"
fi

echo ""

# =============================================================================
# Test 7: Rate Limiting
# =============================================================================
echo -e "${BLUE}Test 7: Rate Limiting${NC}"

echo "  Testing rate limiting (sending 10 rapid requests)..."
RATE_LIMITED=0

for i in {1..10}; do
    HTTP_CODE=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$TARGET_URL/health")
    if [ "$HTTP_CODE" = "429" ]; then
        RATE_LIMITED=1
        break
    fi
done

if [ $RATE_LIMITED -eq 1 ]; then
    check_passed "Rate limiting is active"
else
    check_warning "Rate limiting may not be configured (10 requests allowed)"
fi

echo ""

# =============================================================================
# Test 8: CORS Configuration
# =============================================================================
echo -e "${BLUE}Test 8: CORS Configuration${NC}"

echo "  Checking CORS headers..."
CORS_HEADERS=$(curl -s -I -H "Origin: https://evil.com" "$TARGET_URL/health")

if echo "$CORS_HEADERS" | grep -qi "Access-Control-Allow-Origin"; then
    ORIGIN=$(echo "$CORS_HEADERS" | grep -i "Access-Control-Allow-Origin" | cut -d' ' -f2 | tr -d '\r')
    if [ "$ORIGIN" = "*" ]; then
        check_warning "CORS allows all origins (*) - consider restricting"
    else
        check_passed "CORS is configured with specific origins"
    fi
else
    check_warning "CORS headers not found (may block legitimate requests)"
fi

echo ""

# =============================================================================
# Test 9: Input Validation
# =============================================================================
echo -e "${BLUE}Test 9: Input Validation${NC}"

# Test 9.1: Invalid JSON
echo "  Testing invalid JSON handling..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$TARGET_URL$API_VERSION/work-orders" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{invalid json")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "400" ]; then
    check_passed "Invalid JSON rejected with 400"
else
    check_warning "Invalid JSON handling may be improved (Status: $HTTP_CODE)"
fi

# Test 9.2: Missing required fields
echo "  Testing missing required fields..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$TARGET_URL$API_VERSION/work-orders" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "400" ]; then
    check_passed "Missing required fields rejected with 400"
else
    check_warning "Validation of required fields may be improved (Status: $HTTP_CODE)"
fi

# Test 9.3: Invalid data types
echo "  Testing invalid data types..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$TARGET_URL$API_VERSION/work-orders" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"title":123,"priority":"not-a-valid-priority"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "400" ]; then
    check_passed "Invalid data types rejected with 400"
else
    check_warning "Data type validation may be improved (Status: $HTTP_CODE)"
fi

echo ""

# =============================================================================
# Summary
# =============================================================================
echo -e "${BLUE}=== Security Test Summary ===${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ Security tests FAILED - $FAILED critical issues found!${NC}"
    echo "Please fix the failures before deploying to production."
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠ Security tests PASSED with warnings${NC}"
    echo "Consider addressing the warnings to improve security posture."
    exit 0
else
    echo -e "${GREEN}✓ All security tests PASSED!${NC}"
    exit 0
fi
