#!/bin/bash
#
# PostgreSQL Incremental Backup Script
# Purpose: Creates incremental backups using pg_basebackup
# Frequency: Hourly
# Retention: 7 days
#

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/dcmms/backups/postgres/incremental}"
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-replication_user}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
S3_BUCKET="${S3_BUCKET:-dcmms-dr-backups}"

# Logging
LOG_FILE="/var/log/dcmms/backup-postgres-incremental.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Start backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${TIMESTAMP}"

log "Starting incremental PostgreSQL backup: $TIMESTAMP"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Run pg_basebackup (physical backup)
if PGPASSWORD="${POSTGRES_PASSWORD}" pg_basebackup \
  -h "$POSTGRES_HOST" \
  -p "$POSTGRES_PORT" \
  -U "$POSTGRES_USER" \
  -D "$BACKUP_PATH" \
  -Ft \
  -z \
  -P \
  --wal-method=stream 2>&1 | tee -a "$LOG_FILE"; then

  BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
  log "✅ Incremental backup completed: $TIMESTAMP ($BACKUP_SIZE)"

  # Create tarball
  TARBALL="${BACKUP_DIR}/${TIMESTAMP}.tar.gz"
  tar -czf "$TARBALL" -C "$BACKUP_DIR" "$TIMESTAMP"
  rm -rf "$BACKUP_PATH"

  # Upload to S3
  if command -v aws &> /dev/null; then
    log "Uploading to S3: s3://${S3_BUCKET}/postgres/incremental/${TIMESTAMP}.tar.gz"
    aws s3 cp "$TARBALL" "s3://${S3_BUCKET}/postgres/incremental/${TIMESTAMP}.tar.gz" \
      --storage-class STANDARD_IA || log "⚠️  S3 upload failed"
  fi

  # Clean up old backups
  find "$BACKUP_DIR" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -delete

  log "✅ Incremental backup completed successfully"
  exit 0
else
  log "❌ Incremental backup FAILED"
  exit 1
fi
