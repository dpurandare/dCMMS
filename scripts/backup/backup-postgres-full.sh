#!/bin/bash
#
# PostgreSQL Full Backup Script
# Purpose: Creates complete database dump for disaster recovery
# Frequency: Daily at 2:00 AM UTC
# Retention: 30 days
#

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/dcmms/backups/postgres/full}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-dcmms_admin}"
POSTGRES_DB="${POSTGRES_DB:-dcmms}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
S3_BUCKET="${S3_BUCKET:-dcmms-dr-backups}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"

# Logging
LOG_FILE="/var/log/dcmms/backup-postgres-full.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

send_alert() {
  local message="$1"
  log "ALERT: $message"

  if [[ -n "$SLACK_WEBHOOK" ]]; then
    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"🔴 PostgreSQL Backup Alert: $message\"}" \
      "$SLACK_WEBHOOK" 2>/dev/null || true
  fi
}

# Start backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="postgres_full_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

log "Starting full PostgreSQL backup: $BACKUP_FILE"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Run pg_dump with compression
if PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --format=custom \
  --compress=9 \
  --verbose \
  --file="${BACKUP_PATH%.gz}" 2>&1 | tee -a "$LOG_FILE"; then

  # Compress with gzip
  gzip "${BACKUP_PATH%.gz}"

  BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
  log "✅ Backup completed successfully: $BACKUP_FILE ($BACKUP_SIZE)"

  # Upload to S3
  if command -v aws &> /dev/null; then
    log "Uploading backup to S3: s3://${S3_BUCKET}/postgres/full/${BACKUP_FILE}"

    if aws s3 cp "$BACKUP_PATH" "s3://${S3_BUCKET}/postgres/full/${BACKUP_FILE}" \
      --storage-class STANDARD_IA \
      --metadata "timestamp=${TIMESTAMP},type=full,database=postgres"; then
      log "✅ S3 upload completed"
    else
      send_alert "Failed to upload backup to S3"
    fi
  else
    log "⚠️  AWS CLI not found, skipping S3 upload"
  fi

  # Clean up old backups (local)
  log "Cleaning up backups older than ${RETENTION_DAYS} days"
  find "$BACKUP_DIR" -name "postgres_full_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

  # Verify backup integrity
  log "Verifying backup integrity..."
  if gunzip -t "$BACKUP_PATH" 2>&1 | tee -a "$LOG_FILE"; then
    log "✅ Backup integrity verified"
  else
    send_alert "Backup integrity check FAILED: $BACKUP_FILE"
    exit 1
  fi

  # Create backup manifest
  cat > "${BACKUP_DIR}/latest_manifest.json" <<EOF
{
  "backup_type": "full",
  "timestamp": "${TIMESTAMP}",
  "filename": "${BACKUP_FILE}",
  "size_bytes": $(stat -c%s "$BACKUP_PATH"),
  "database": "${POSTGRES_DB}",
  "retention_days": ${RETENTION_DAYS},
  "s3_location": "s3://${S3_BUCKET}/postgres/full/${BACKUP_FILE}",
  "verified": true
}
EOF

  log "✅ Full PostgreSQL backup completed successfully"
  exit 0

else
  send_alert "Full PostgreSQL backup FAILED"
  exit 1
fi
