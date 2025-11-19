#!/bin/bash
#
# QuestDB Snapshot Backup Script
# Purpose: Creates full snapshots of QuestDB time-series data
# Frequency: Daily at 3:00 AM UTC
# Retention: 30 days
#

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/dcmms/backups/questdb}"
QUESTDB_DATA_DIR="${QUESTDB_DATA_DIR:-/var/lib/questdb/db}"
QUESTDB_HOST="${QUESTDB_HOST:-localhost}"
QUESTDB_PORT="${QUESTDB_PORT:-9000}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-dcmms-dr-backups}"

# Logging
LOG_FILE="/var/log/dcmms/backup-questdb.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

send_alert() {
  local message="$1"
  log "ALERT: $message"
  # Add Slack/email notification here
}

# Start backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="questdb_snapshot_${TIMESTAMP}.tar.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

log "Starting QuestDB snapshot backup: $BACKUP_FILE"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check if QuestDB is running
if ! curl -s "http://${QUESTDB_HOST}:${QUESTDB_PORT}/exec?query=SELECT%201" > /dev/null; then
  send_alert "QuestDB is not accessible at ${QUESTDB_HOST}:${QUESTDB_PORT}"
  exit 1
fi

# Create snapshot using rsync (filesystem-level copy)
TEMP_DIR="${BACKUP_DIR}/temp_${TIMESTAMP}"
mkdir -p "$TEMP_DIR"

log "Creating filesystem snapshot..."

if rsync -a --delete \
  --exclude='*.lock' \
  --exclude='*.tmp' \
  "$QUESTDB_DATA_DIR/" \
  "$TEMP_DIR/" 2>&1 | tee -a "$LOG_FILE"; then

  log "✅ Filesystem snapshot created"

  # Create compressed tarball
  log "Compressing snapshot..."
  tar -czf "$BACKUP_PATH" -C "$TEMP_DIR" . 2>&1 | tee -a "$LOG_FILE"

  # Clean up temp directory
  rm -rf "$TEMP_DIR"

  BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
  log "✅ Snapshot compressed: $BACKUP_FILE ($BACKUP_SIZE)"

  # Upload to S3
  if command -v aws &> /dev/null; then
    log "Uploading to S3: s3://${S3_BUCKET}/questdb/${BACKUP_FILE}"

    if aws s3 cp "$BACKUP_PATH" "s3://${S3_BUCKET}/questdb/${BACKUP_FILE}" \
      --storage-class STANDARD_IA \
      --metadata "timestamp=${TIMESTAMP},type=snapshot,database=questdb"; then
      log "✅ S3 upload completed"
    else
      send_alert "Failed to upload QuestDB snapshot to S3"
    fi
  fi

  # Verify backup integrity
  log "Verifying backup integrity..."
  if tar -tzf "$BACKUP_PATH" > /dev/null 2>&1; then
    log "✅ Backup integrity verified"
  else
    send_alert "QuestDB backup integrity check FAILED: $BACKUP_FILE"
    exit 1
  fi

  # Clean up old backups
  log "Cleaning up backups older than ${RETENTION_DAYS} days"
  find "$BACKUP_DIR" -name "questdb_snapshot_*.tar.gz" -mtime +${RETENTION_DAYS} -delete

  # Create backup manifest
  cat > "${BACKUP_DIR}/latest_manifest.json" <<EOF
{
  "backup_type": "snapshot",
  "timestamp": "${TIMESTAMP}",
  "filename": "${BACKUP_FILE}",
  "size_bytes": $(stat -c%s "$BACKUP_PATH"),
  "database": "questdb",
  "retention_days": ${RETENTION_DAYS},
  "s3_location": "s3://${S3_BUCKET}/questdb/${BACKUP_FILE}",
  "verified": true
}
EOF

  log "✅ QuestDB snapshot backup completed successfully"
  exit 0

else
  send_alert "QuestDB snapshot backup FAILED"
  rm -rf "$TEMP_DIR"
  exit 1
fi
