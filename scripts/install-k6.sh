#!/bin/bash

# ==============================================
# k6 Load Testing Tool Installation Script
# ==============================================
# This script installs k6 for performance testing
# Usage: ./scripts/install-k6.sh [docker|native]

set -e

INSTALL_METHOD="${1:-docker}"

echo "=========================================="
echo "k6 Load Testing Tool Installation"
echo "=========================================="
echo "Install method: $INSTALL_METHOD"
echo ""

if [ "$INSTALL_METHOD" = "docker" ]; then
    echo "Installing k6 via Docker..."

    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        echo "❌ Error: Docker is not installed"
        echo "Please install Docker first: https://docs.docker.com/get-docker/"
        exit 1
    fi

    # Pull k6 Docker image
    echo "Pulling k6 Docker image..."
    docker pull grafana/k6:latest

    # Verify installation
    echo ""
    echo "✅ k6 Docker image installed successfully!"
    echo ""
    echo "Usage:"
    echo "  docker run --rm -v \$(pwd):/scripts grafana/k6:latest run /scripts/test.js"
    echo ""
    echo "Example test script location: backend/tests/performance/api-load-test.js"

elif [ "$INSTALL_METHOD" = "native" ]; then
    echo "Installing k6 natively..."

    # Detect OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "Detected Linux - installing via apt..."

        # Add k6 repository
        sudo gpg -k
        sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
            --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69

        echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
            sudo tee /etc/apt/sources.list.d/k6.list

        sudo apt-get update
        sudo apt-get install k6

    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "Detected macOS - installing via Homebrew..."

        if ! command -v brew &> /dev/null; then
            echo "❌ Error: Homebrew is not installed"
            echo "Please install Homebrew first: https://brew.sh/"
            exit 1
        fi

        brew install k6

    else
        echo "❌ Error: Unsupported OS: $OSTYPE"
        echo "Please install k6 manually: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi

    # Verify installation
    echo ""
    k6 version
    echo ""
    echo "✅ k6 installed successfully!"
    echo ""
    echo "Usage:"
    echo "  k6 run backend/tests/performance/api-load-test.js"

else
    echo "❌ Error: Invalid install method: $INSTALL_METHOD"
    echo "Usage: $0 [docker|native]"
    exit 1
fi

echo ""
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo "1. Create k6 test scripts in: backend/tests/performance/"
echo "2. Run performance tests for DCMMS-141"
echo "3. See docs/testing/final-performance-test-report.md"
echo ""
