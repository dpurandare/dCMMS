#!/bin/bash
#
# Schedule Model Retraining
#
# This script can be run via cron for weekly scheduled retraining
# or triggered manually when drift is detected.
#

set -e

# Configuration
LOOKBACK_MONTHS=${LOOKBACK_MONTHS:-3}
CHAMPION_MODEL_URI=${CHAMPION_MODEL_URI:-""}
TRIGGER_REASON=${TRIGGER_REASON:-"weekly_schedule"}
APPROVAL_REQUIRED=${APPROVAL_REQUIRED:-"true"}

# Change to metaflow directory
cd "$(dirname "$0")"

echo "========================================"
echo "Scheduled Model Retraining"
echo "========================================"
echo "Trigger: $TRIGGER_REASON"
echo "Lookback: $LOOKBACK_MONTHS months"
echo "Approval required: $APPROVAL_REQUIRED"
echo ""

# Build command
CMD="python model_retraining_flow.py run"
CMD="$CMD --trigger=$TRIGGER_REASON"
CMD="$CMD --lookback-months=$LOOKBACK_MONTHS"

if [ -n "$CHAMPION_MODEL_URI" ]; then
    CMD="$CMD --champion-model=$CHAMPION_MODEL_URI"
fi

if [ "$APPROVAL_REQUIRED" = "true" ]; then
    CMD="$CMD --approval"
fi

# Run retraining flow
echo "Running: $CMD"
echo ""

$CMD

echo ""
echo "========================================"
echo "Retraining Complete"
echo "========================================"
echo "Check /tmp/retraining_report.json for details"
