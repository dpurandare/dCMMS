#!/bin/bash

# ==============================================
# OWASP ZAP Security Scanner Installation Script
# ==============================================
# This script installs OWASP ZAP for security testing
# Usage: ./scripts/install-owasp-zap.sh

set -e

echo "=========================================="
echo "OWASP ZAP Security Scanner Installation"
echo "=========================================="
echo ""

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Pull OWASP ZAP Docker image
echo "Pulling OWASP ZAP Docker image..."
docker pull owasp/zap2docker-stable:latest

# Verify installation
echo ""
echo "✅ OWASP ZAP Docker image installed successfully!"
echo ""

echo "=========================================="
echo "Usage Examples:"
echo "=========================================="
echo ""
echo "1. Baseline Scan (quick passive scan):"
echo "   docker run --rm -v \$(pwd):/zap/wrk:rw owasp/zap2docker-stable \\"
echo "     zap-baseline.py -t http://host.docker.internal:3000 -r zap-baseline-report.html"
echo ""
echo "2. Full Scan (active scan - more thorough but slower):"
echo "   docker run --rm -v \$(pwd):/zap/wrk:rw owasp/zap2docker-stable \\"
echo "     zap-full-scan.py -t http://host.docker.internal:3000 -r zap-full-report.html"
echo ""
echo "3. API Scan (for REST APIs):"
echo "   docker run --rm -v \$(pwd):/zap/wrk:rw owasp/zap2docker-stable \\"
echo "     zap-api-scan.py -t http://host.docker.internal:3000/api/swagger.json -f openapi -r zap-api-report.html"
echo ""

echo "=========================================="
echo "Important Notes:"
echo "=========================================="
echo "- Use 'host.docker.internal' to access services on host from Docker"
echo "- Reports will be saved to current directory"
echo "- Baseline scan: ~5 minutes, Full scan: ~30-60 minutes"
echo "- For CI/CD, use: -I (ignore warnings) flag"
echo ""

echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo "1. Start your backend API: cd backend && npm run dev"
echo "2. Run ZAP baseline scan (see examples above)"
echo "3. Review security report for DCMMS-142"
echo "4. Remediate any critical/high vulnerabilities"
echo "5. Save report to: docs/security/security-audit-report.md"
echo ""
