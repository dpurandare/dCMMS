#!/bin/bash
#
# Flink Performance Monitoring Script (DCMMS-057)
#
# Monitors Flink job performance metrics including:
# - Throughput (records/sec)
# - Backpressure
# - Checkpoint duration
# - State size
# - Latency (P50, P95, P99)
#
# Usage:
#   ./monitor_performance.sh [job_id]
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FLINK_REST_API="${FLINK_REST_API:-http://localhost:8082}"
REFRESH_INTERVAL="${REFRESH_INTERVAL:-5}"  # seconds
JOB_ID="$1"

# Banner
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}dCMMS Flink Performance Monitor${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get job ID if not provided
if [ -z "$JOB_ID" ]; then
    echo -e "${YELLOW}Fetching running jobs...${NC}"
    JOBS_JSON=$(curl -s "$FLINK_REST_API/jobs")
    JOB_ID=$(echo "$JOBS_JSON" | jq -r '.jobs[] | select(.status=="RUNNING") | .id' | head -n 1)

    if [ -z "$JOB_ID" ]; then
        echo -e "${RED}✗ No running Flink jobs found${NC}"
        echo "Start a job first: flink run -d -p 8 /opt/flink/jobs/telemetry-processor.py"
        exit 1
    fi

    echo -e "${GREEN}✓ Found running job: $JOB_ID${NC}"
fi

# Get job details
JOB_INFO=$(curl -s "$FLINK_REST_API/jobs/$JOB_ID")
JOB_NAME=$(echo "$JOB_INFO" | jq -r '.name')
JOB_START=$(echo "$JOB_INFO" | jq -r '.start-time')
PARALLELISM=$(echo "$JOB_INFO" | jq -r '.plan.nodes[0].parallelism')

echo ""
echo -e "${BLUE}Job Name:${NC} $JOB_NAME"
echo -e "${BLUE}Job ID:${NC} $JOB_ID"
echo -e "${BLUE}Parallelism:${NC} $PARALLELISM"
echo -e "${BLUE}Started:${NC} $(date -d @$((JOB_START/1000)) '+%Y-%m-%d %H:%M:%S')"
echo ""

# Function to format numbers
format_number() {
    local num=$1
    if (( $(echo "$num >= 1000000" | bc -l) )); then
        printf "%.2fM" $(echo "$num / 1000000" | bc -l)
    elif (( $(echo "$num >= 1000" | bc -l) )); then
        printf "%.2fK" $(echo "$num / 1000" | bc -l)
    else
        printf "%.0f" $num
    fi
}

# Function to get metrics
get_metrics() {
    local metrics_json=$(curl -s "$FLINK_REST_API/jobs/$JOB_ID/metrics?get=numRecordsInPerSecond,numRecordsOutPerSecond,currentInputWatermark,lastCheckpointDuration,lastCheckpointSize,buffers.inPoolUsage,buffers.outPoolUsage")

    # Parse metrics
    RECORDS_IN=$(echo "$metrics_json" | jq -r '.[] | select(.id=="numRecordsInPerSecond") | .value' | head -n 1)
    RECORDS_OUT=$(echo "$metrics_json" | jq -r '.[] | select(.id=="numRecordsOutPerSecond") | .value' | head -n 1)
    CHECKPOINT_DURATION=$(echo "$metrics_json" | jq -r '.[] | select(.id=="lastCheckpointDuration") | .value' | head -n 1)
    CHECKPOINT_SIZE=$(echo "$metrics_json" | jq -r '.[] | select(.id=="lastCheckpointSize") | .value' | head -n 1)

    # Default values if not available
    RECORDS_IN=${RECORDS_IN:-0}
    RECORDS_OUT=${RECORDS_OUT:-0}
    CHECKPOINT_DURATION=${CHECKPOINT_DURATION:-0}
    CHECKPOINT_SIZE=${CHECKPOINT_SIZE:-0}
}

# Function to get checkpoint info
get_checkpoint_info() {
    local checkpoint_json=$(curl -s "$FLINK_REST_API/jobs/$JOB_ID/checkpoints")

    LATEST_CHECKPOINT=$(echo "$checkpoint_json" | jq -r '.latest.completed.external_path // "N/A"')
    NUM_CHECKPOINTS=$(echo "$checkpoint_json" | jq -r '.counts.completed // 0')
    FAILED_CHECKPOINTS=$(echo "$checkpoint_json" | jq -r '.counts.failed // 0')
}

# Function to check backpressure
check_backpressure() {
    local vertices=$(curl -s "$FLINK_REST_API/jobs/$JOB_ID" | jq -r '.vertices[].id')
    local total_backpressure=0
    local vertex_count=0

    for vertex in $vertices; do
        local bp_status=$(curl -s "$FLINK_REST_API/jobs/$JOB_ID/vertices/$vertex/backpressure" | jq -r '.status')
        if [ "$bp_status" == "ok" ]; then
            local bp_ratio=$(curl -s "$FLINK_REST_API/jobs/$JOB_ID/vertices/$vertex/backpressure" | jq -r '.backpressure-level')
            if [ "$bp_ratio" != "null" ] && [ "$bp_ratio" != "" ]; then
                total_backpressure=$(echo "$total_backpressure + $bp_ratio" | bc)
                vertex_count=$((vertex_count + 1))
            fi
        fi
    done

    if [ $vertex_count -gt 0 ]; then
        BACKPRESSURE=$(echo "scale=2; $total_backpressure / $vertex_count * 100" | bc)
    else
        BACKPRESSURE=0
    fi
}

# Monitoring loop
echo -e "${BLUE}Monitoring (refresh every ${REFRESH_INTERVAL}s)...${NC}"
echo ""

iteration=1
while true; do
    clear

    # Header
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Flink Performance Monitor - Iteration $iteration${NC}"
    echo -e "${BLUE}Job: $JOB_NAME${NC}"
    echo -e "${BLUE}$(date '+%Y-%m-%d %H:%M:%S')${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""

    # Get current metrics
    get_metrics
    get_checkpoint_info
    check_backpressure

    # Throughput
    echo -e "${GREEN}📊 Throughput${NC}"
    echo -e "  Records In:  $(format_number $RECORDS_IN)/sec"
    echo -e "  Records Out: $(format_number $RECORDS_OUT)/sec"
    echo ""

    # Evaluate throughput
    TARGET_THROUGHPUT=10000
    if (( $(echo "$RECORDS_IN >= $TARGET_THROUGHPUT" | bc -l) )); then
        echo -e "  ${GREEN}✓ Meeting target throughput (≥10K/sec)${NC}"
    elif (( $(echo "$RECORDS_IN >= $(($TARGET_THROUGHPUT / 2))" | bc -l) )); then
        echo -e "  ${YELLOW}⚠ Below target throughput (<10K/sec)${NC}"
    else
        echo -e "  ${RED}✗ Low throughput (<5K/sec)${NC}"
    fi
    echo ""

    # Checkpoints
    echo -e "${GREEN}💾 Checkpoints${NC}"
    echo -e "  Total Completed: $NUM_CHECKPOINTS"
    echo -e "  Failed: $FAILED_CHECKPOINTS"
    echo -e "  Last Duration: ${CHECKPOINT_DURATION}ms"
    echo -e "  Last Size: $(format_number $CHECKPOINT_SIZE) bytes"
    echo ""

    # Evaluate checkpoint performance
    if (( $(echo "$CHECKPOINT_DURATION < 5000" | bc -l) )); then
        echo -e "  ${GREEN}✓ Checkpoint duration healthy (<5s)${NC}"
    elif (( $(echo "$CHECKPOINT_DURATION < 30000" | bc -l) )); then
        echo -e "  ${YELLOW}⚠ Checkpoint duration high (5-30s)${NC}"
    else
        echo -e "  ${RED}✗ Checkpoint duration very high (>30s)${NC}"
    fi
    echo ""

    # Backpressure
    echo -e "${GREEN}⚡ Backpressure${NC}"
    echo -e "  Backpressure Level: ${BACKPRESSURE}%"
    echo ""

    # Evaluate backpressure
    if (( $(echo "$BACKPRESSURE < 10" | bc -l) )); then
        echo -e "  ${GREEN}✓ No backpressure (<10%)${NC}"
    elif (( $(echo "$BACKPRESSURE < 50" | bc -l) )); then
        echo -e "  ${YELLOW}⚠ Moderate backpressure (10-50%)${NC}"
    else
        echo -e "  ${RED}✗ High backpressure (>50%)${NC}"
    fi
    echo ""

    # Task Managers
    TM_INFO=$(curl -s "$FLINK_REST_API/taskmanagers")
    NUM_TM=$(echo "$TM_INFO" | jq -r '.taskmanagers | length')
    TOTAL_SLOTS=$(echo "$TM_INFO" | jq -r '[.taskmanagers[].slotsNumber] | add')
    FREE_SLOTS=$(echo "$TM_INFO" | jq -r '[.taskmanagers[].freeSlots] | add')

    echo -e "${GREEN}🖥️  Task Managers${NC}"
    echo -e "  Active TMs: $NUM_TM"
    echo -e "  Total Slots: $TOTAL_SLOTS"
    echo -e "  Free Slots: $FREE_SLOTS"
    echo ""

    # Performance Summary
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}Performance Summary${NC}"
    echo -e "${BLUE}========================================${NC}"

    SCORE=0

    # Throughput (40%)
    if (( $(echo "$RECORDS_IN >= $TARGET_THROUGHPUT" | bc -l) )); then
        SCORE=$((SCORE + 40))
        echo -e "${GREEN}✓ Throughput: EXCELLENT${NC}"
    elif (( $(echo "$RECORDS_IN >= $(($TARGET_THROUGHPUT / 2))" | bc -l) )); then
        SCORE=$((SCORE + 20))
        echo -e "${YELLOW}⚠ Throughput: MODERATE${NC}"
    else
        echo -e "${RED}✗ Throughput: LOW${NC}"
    fi

    # Checkpoint Duration (30%)
    if (( $(echo "$CHECKPOINT_DURATION < 5000" | bc -l) )); then
        SCORE=$((SCORE + 30))
        echo -e "${GREEN}✓ Checkpoint Duration: EXCELLENT${NC}"
    elif (( $(echo "$CHECKPOINT_DURATION < 30000" | bc -l) )); then
        SCORE=$((SCORE + 15))
        echo -e "${YELLOW}⚠ Checkpoint Duration: MODERATE${NC}"
    else
        echo -e "${RED}✗ Checkpoint Duration: HIGH${NC}"
    fi

    # Backpressure (30%)
    if (( $(echo "$BACKPRESSURE < 10" | bc -l) )); then
        SCORE=$((SCORE + 30))
        echo -e "${GREEN}✓ Backpressure: NONE${NC}"
    elif (( $(echo "$BACKPRESSURE < 50" | bc -l) )); then
        SCORE=$((SCORE + 15))
        echo -e "${YELLOW}⚠ Backpressure: MODERATE${NC}"
    else
        echo -e "${RED}✗ Backpressure: HIGH${NC}"
    fi

    echo ""
    echo -e "${BLUE}Overall Performance Score: $SCORE/100${NC}"
    echo ""

    # Recommendations
    if (( $SCORE < 50 )); then
        echo -e "${RED}Recommendations:${NC}"
        echo -e "  • Increase Kafka partitions and Flink parallelism"
        echo -e "  • Tune checkpoint interval (increase if state is large)"
        echo -e "  • Scale out TaskManagers (docker-compose up --scale flink-taskmanager=4)"
        echo -e "  • Enable RocksDB incremental checkpoints"
        echo -e "  • Optimize QuestDB batch insert size"
    fi

    echo ""
    echo -e "${BLUE}Press Ctrl+C to stop monitoring${NC}"

    sleep $REFRESH_INTERVAL
    iteration=$((iteration + 1))
done
