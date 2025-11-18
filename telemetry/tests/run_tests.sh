#!/bin/bash
#
# Test Runner for dCMMS Telemetry Pipeline
#
# Usage:
#   ./run_tests.sh              # Run all tests
#   ./run_tests.sh integration  # Run only integration tests
#   ./run_tests.sh load         # Run load tests
#   ./run_tests.sh unit         # Run unit tests (when available)
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TELEMETRY_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "dCMMS Telemetry Pipeline Test Runner"
echo "=========================================="
echo ""

# Check if infrastructure is running
check_infrastructure() {
    echo -e "${YELLOW}Checking infrastructure...${NC}"

    # Check Kafka
    if ! nc -z localhost 9092 2>/dev/null; then
        echo -e "${RED}✗ Kafka is not running${NC}"
        echo "  Start with: cd $TELEMETRY_DIR && docker-compose up -d kafka"
        exit 1
    fi
    echo -e "${GREEN}✓ Kafka is running${NC}"

    # Check QuestDB
    if ! nc -z localhost 9000 2>/dev/null; then
        echo -e "${RED}✗ QuestDB is not running${NC}"
        echo "  Start with: cd $TELEMETRY_DIR && docker-compose up -d questdb"
        exit 1
    fi
    echo -e "${GREEN}✓ QuestDB is running${NC}"

    # Check EMQX
    if ! nc -z localhost 1883 2>/dev/null; then
        echo -e "${YELLOW}⚠ EMQX is not running (MQTT tests will be skipped)${NC}"
    else
        echo -e "${GREEN}✓ EMQX is running${NC}"
    fi

    echo ""
}

# Install dependencies
install_dependencies() {
    echo -e "${YELLOW}Installing test dependencies...${NC}"
    pip install -q -r "$SCRIPT_DIR/requirements.txt"
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""
}

# Run integration tests
run_integration_tests() {
    echo -e "${YELLOW}Running integration tests...${NC}"
    echo ""

    cd "$SCRIPT_DIR"
    pytest integration/test_telemetry_pipeline.py -v --tb=short

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ Integration tests passed${NC}"
        return 0
    else
        echo ""
        echo -e "${RED}✗ Integration tests failed${NC}"
        return 1
    fi
}

# Run load tests
run_load_tests() {
    echo -e "${YELLOW}Running load tests...${NC}"
    echo ""

    cd "$SCRIPT_DIR/load"

    # Install additional dependencies
    pip install -q click

    # Run load test with moderate settings
    python load_test.py --events 1000 --rate 500 --duration 10 --workers 2

    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ Load tests passed${NC}"
        return 0
    else
        echo ""
        echo -e "${RED}✗ Load tests failed${NC}"
        return 1
    fi
}

# Run unit tests (placeholder for future)
run_unit_tests() {
    echo -e "${YELLOW}Running unit tests...${NC}"
    echo ""

    cd "$SCRIPT_DIR"

    if [ -d "unit" ]; then
        pytest unit/ -v --tb=short
    else
        echo -e "${YELLOW}⚠ No unit tests found${NC}"
    fi

    echo ""
}

# Main test execution
main() {
    TEST_TYPE="${1:-all}"

    case "$TEST_TYPE" in
        integration)
            check_infrastructure
            install_dependencies
            run_integration_tests
            ;;
        load)
            check_infrastructure
            install_dependencies
            run_load_tests
            ;;
        unit)
            install_dependencies
            run_unit_tests
            ;;
        all)
            check_infrastructure
            install_dependencies
            echo ""
            echo "=========================================="
            echo "1. Integration Tests"
            echo "=========================================="
            run_integration_tests
            INTEGRATION_RESULT=$?

            echo ""
            echo "=========================================="
            echo "2. Load Tests"
            echo "=========================================="
            run_load_tests
            LOAD_RESULT=$?

            echo ""
            echo "=========================================="
            echo "Test Summary"
            echo "=========================================="

            if [ $INTEGRATION_RESULT -eq 0 ]; then
                echo -e "${GREEN}✓ Integration tests: PASSED${NC}"
            else
                echo -e "${RED}✗ Integration tests: FAILED${NC}"
            fi

            if [ $LOAD_RESULT -eq 0 ]; then
                echo -e "${GREEN}✓ Load tests: PASSED${NC}"
            else
                echo -e "${RED}✗ Load tests: FAILED${NC}"
            fi

            echo ""

            if [ $INTEGRATION_RESULT -eq 0 ] && [ $LOAD_RESULT -eq 0 ]; then
                echo -e "${GREEN}✓ All tests passed!${NC}"
                exit 0
            else
                echo -e "${RED}✗ Some tests failed${NC}"
                exit 1
            fi
            ;;
        *)
            echo "Usage: $0 [integration|load|unit|all]"
            echo ""
            echo "Options:"
            echo "  integration  - Run integration tests only"
            echo "  load         - Run load/performance tests only"
            echo "  unit         - Run unit tests only"
            echo "  all          - Run all tests (default)"
            exit 1
            ;;
    esac
}

main "$@"
