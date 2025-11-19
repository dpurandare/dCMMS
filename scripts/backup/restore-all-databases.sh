#!/bin/bash
#
# Complete System Restore Script
# Purpose: Restores all databases and configurations from backups
# Usage: ./restore-all-databases.sh [--auto] [--skip-confirmation]
#

set -euo pipefail

# Configuration
BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-/opt/dcmms/backups}"
RESTORE_LOG_DIR="/var/log/dcmms/restore"
RESTORE_TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Script paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESTORE_POSTGRES_SCRIPT="${SCRIPT_DIR}/restore-postgres-from-backup.sh"

# Logging
LOG_FILE="${RESTORE_LOG_DIR}/restore-all_${RESTORE_TIMESTAMP}.log"
mkdir -p "$RESTORE_LOG_DIR"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Parse arguments
AUTO_MODE=false
SKIP_CONFIRMATION=false

for arg in "$@"; do
  case $arg in
    --auto)
      AUTO_MODE=true
      ;;
    --skip-confirmation)
      SKIP_CONFIRMATION=true
      ;;
  esac
done

log "========================================="
log "dCMMS Complete System Restore"
log "========================================="
log "Restore timestamp: $RESTORE_TIMESTAMP"
log "Auto mode: $AUTO_MODE"
log ""

# Find latest backups
find_latest_backup() {
  local backup_type="$1"
  local pattern="$2"

  local latest=$(find "${BACKUP_BASE_DIR}/${backup_type}" -name "$pattern" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

  if [[ -z "$latest" ]]; then
    log "❌ ERROR: No $backup_type backup found"
    return 1
  fi

  echo "$latest"
}

# Confirmation
if [[ "$SKIP_CONFIRMATION" != "true" ]]; then
  log "⚠️  WARNING: This will restore ALL databases from backups"
  log "⚠️  WARNING: Current data will be DESTROYED"
  log ""
  read -p "Are you absolutely sure you want to continue? (type 'RESTORE' to confirm): " confirm

  if [[ "$confirm" != "RESTORE" ]]; then
    log "Restore cancelled by user"
    exit 0
  fi
fi

# Create restore checkpoint
CHECKPOINT_FILE="${RESTORE_LOG_DIR}/restore_checkpoint_${RESTORE_TIMESTAMP}.json"
cat > "$CHECKPOINT_FILE" <<EOF
{
  "restore_id": "${RESTORE_TIMESTAMP}",
  "start_time": "$(date -Iseconds)",
  "status": "in_progress",
  "steps_completed": []
}
EOF

update_checkpoint() {
  local step="$1"
  local status="$2"

  jq ".steps_completed += [{\"step\": \"$step\", \"status\": \"$status\", \"timestamp\": \"$(date -Iseconds)\"}]" \
    "$CHECKPOINT_FILE" > "${CHECKPOINT_FILE}.tmp"
  mv "${CHECKPOINT_FILE}.tmp" "$CHECKPOINT_FILE"
}

# Step 1: Stop all dCMMS services
log "========================================="
log "Step 1: Stopping all dCMMS services"
log "========================================="

SERVICES=("dcmms-backend" "dcmms-frontend" "dcmms-mqtt-bridge" "dcmms-ml-service")

for service in "${SERVICES[@]}"; do
  if systemctl is-active --quiet "$service" 2>/dev/null; then
    log "Stopping $service..."
    systemctl stop "$service" || log "⚠️  Warning: Failed to stop $service"
  else
    log "$service is not running"
  fi
done

# Stop Docker containers (if using Docker)
if command -v docker &> /dev/null; then
  log "Stopping Docker containers..."
  docker-compose -f /opt/dcmms/docker-compose.yml down 2>/dev/null || log "⚠️  Warning: Docker stop failed"
fi

update_checkpoint "stop_services" "completed"
log "✅ All services stopped"
sleep 5

# Step 2: Restore PostgreSQL
log "========================================="
log "Step 2: Restoring PostgreSQL database"
log "========================================="

POSTGRES_BACKUP=$(find_latest_backup "postgres/full" "postgres_full_*.sql.gz")
log "Using backup: $POSTGRES_BACKUP"

if [[ -x "$RESTORE_POSTGRES_SCRIPT" ]]; then
  if echo "yes" | "$RESTORE_POSTGRES_SCRIPT" "$POSTGRES_BACKUP" 2>&1 | tee -a "$LOG_FILE"; then
    update_checkpoint "restore_postgres" "completed"
    log "✅ PostgreSQL restored successfully"
  else
    update_checkpoint "restore_postgres" "failed"
    log "❌ PostgreSQL restore failed"
    exit 1
  fi
else
  log "❌ PostgreSQL restore script not found or not executable"
  exit 1
fi

# Step 3: Restore QuestDB
log "========================================="
log "Step 3: Restoring QuestDB time-series data"
log "========================================="

QUESTDB_BACKUP=$(find_latest_backup "questdb" "questdb_snapshot_*.tar.gz")
log "Using backup: $QUESTDB_BACKUP"

QUESTDB_DATA_DIR="${QUESTDB_DATA_DIR:-/var/lib/questdb/db}"

# Stop QuestDB
if systemctl is-active --quiet questdb 2>/dev/null; then
  systemctl stop questdb
fi

# Safety backup of current data
if [[ -d "$QUESTDB_DATA_DIR" ]]; then
  SAFETY_BACKUP="/opt/dcmms/safety-backups/questdb_before_restore_${RESTORE_TIMESTAMP}"
  mkdir -p "$(dirname "$SAFETY_BACKUP")"
  mv "$QUESTDB_DATA_DIR" "$SAFETY_BACKUP"
  log "Current QuestDB data moved to: $SAFETY_BACKUP"
fi

# Restore from backup
mkdir -p "$QUESTDB_DATA_DIR"
if tar -xzf "$QUESTDB_BACKUP" -C "$QUESTDB_DATA_DIR" 2>&1 | tee -a "$LOG_FILE"; then
  chown -R questdb:questdb "$QUESTDB_DATA_DIR" 2>/dev/null || true
  update_checkpoint "restore_questdb" "completed"
  log "✅ QuestDB restored successfully"
else
  update_checkpoint "restore_questdb" "failed"
  log "❌ QuestDB restore failed"
  exit 1
fi

# Step 4: Restore Redis (if needed)
log "========================================="
log "Step 4: Restoring Redis cache"
log "========================================="

log "ℹ️  Redis cache will be rebuilt from PostgreSQL (no backup restoration needed)"
update_checkpoint "restore_redis" "skipped"

# Step 5: Restore Configuration
log "========================================="
log "Step 5: Restoring system configuration"
log "========================================="

CONFIG_BACKUP=$(find_latest_backup "config" "config_*.tar.gz")
log "Using backup: $CONFIG_BACKUP"

CONFIG_RESTORE_DIR="/opt/dcmms/config-restore-${RESTORE_TIMESTAMP}"
mkdir -p "$CONFIG_RESTORE_DIR"

if tar -xzf "$CONFIG_BACKUP" -C "$CONFIG_RESTORE_DIR" 2>&1 | tee -a "$LOG_FILE"; then
  log "✅ Configuration extracted to: $CONFIG_RESTORE_DIR"
  log "⚠️  Manual review required before applying configuration changes"
  update_checkpoint "restore_config" "completed"
else
  log "⚠️  Warning: Configuration restore failed"
  update_checkpoint "restore_config" "failed"
fi

# Step 6: Start services
log "========================================="
log "Step 6: Starting services"
log "========================================="

# Start databases first
log "Starting PostgreSQL..."
systemctl start postgresql
sleep 5

log "Starting QuestDB..."
systemctl start questdb 2>/dev/null || log "⚠️  Warning: QuestDB start failed (may need manual start)"
sleep 5

# Start Redis
log "Starting Redis..."
systemctl start redis 2>/dev/null || log "⚠️  Warning: Redis start failed"
sleep 2

# Start application services
if [[ "$AUTO_MODE" == "true" ]]; then
  log "Auto mode: Starting application services..."

  if [[ -f /opt/dcmms/docker-compose.yml ]]; then
    docker-compose -f /opt/dcmms/docker-compose.yml up -d 2>&1 | tee -a "$LOG_FILE"
  else
    for service in "${SERVICES[@]}"; do
      log "Starting $service..."
      systemctl start "$service" || log "⚠️  Warning: Failed to start $service"
    done
  fi

  update_checkpoint "start_services" "completed"
  log "✅ Services started"
else
  log "⚠️  Manual mode: Services NOT started automatically"
  log "   Start services manually after verification"
  update_checkpoint "start_services" "skipped"
fi

# Step 7: Verification
log "========================================="
log "Step 7: Post-restore verification"
log "========================================="

# Check PostgreSQL
if pg_isready -q; then
  TABLE_COUNT=$(sudo -u postgres psql -d dcmms -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null || echo "0")
  log "✅ PostgreSQL: $TABLE_COUNT tables"
else
  log "❌ PostgreSQL: Not accessible"
fi

# Check QuestDB
if curl -s "http://localhost:9000/exec?query=SELECT%201" > /dev/null 2>&1; then
  log "✅ QuestDB: Accessible"
else
  log "⚠️  QuestDB: Not accessible (may still be starting)"
fi

# Check Redis
if redis-cli ping > /dev/null 2>&1; then
  log "✅ Redis: Accessible"
else
  log "⚠️  Redis: Not accessible"
fi

# Update checkpoint
jq ".status = \"completed\" | .end_time = \"$(date -Iseconds)\"" \
  "$CHECKPOINT_FILE" > "${CHECKPOINT_FILE}.tmp"
mv "${CHECKPOINT_FILE}.tmp" "$CHECKPOINT_FILE"

# Generate final report
log "========================================="
log "Restore Complete"
log "========================================="
log "Restore ID: $RESTORE_TIMESTAMP"
log "Start time: $(jq -r .start_time "$CHECKPOINT_FILE")"
log "End time: $(jq -r .end_time "$CHECKPOINT_FILE")"
log ""
log "Backups used:"
log "  - PostgreSQL: $(basename "$POSTGRES_BACKUP")"
log "  - QuestDB: $(basename "$QUESTDB_BACKUP")"
log "  - Config: $(basename "$CONFIG_BACKUP")"
log ""
log "Restore log: $LOG_FILE"
log "Checkpoint: $CHECKPOINT_FILE"
log ""
log "========================================="
log "Next Steps:"
log "========================================="
log "1. ✅ Verify database connectivity"
log "2. ✅ Test application functionality"
log "3. ✅ Review application logs"
log "4. ✅ Run health checks"
log "5. ✅ Notify stakeholders of restore completion"
log "6. ⚠️  Review extracted config: $CONFIG_RESTORE_DIR"
log "========================================="

log "✅ Complete system restore finished successfully"
exit 0
