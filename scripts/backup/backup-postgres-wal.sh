#!/bin/bash
#
# PostgreSQL WAL (Write-Ahead Log) Continuous Backup Script
# Purpose: Archives WAL files for Point-in-Time Recovery (PITR)
# Frequency: Continuous (triggered by PostgreSQL archive_command)
# Retention: 7 days
#

set -euo pipefail

# Configuration
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-/opt/dcmms/backups/postgres/wal}"
S3_BUCKET="${S3_BUCKET:-dcmms-dr-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

# Arguments from PostgreSQL archive_command
# Usage: archive-wal.sh %p %f
WAL_PATH="$1"      # Full path to WAL file
WAL_FILE="$2"      # WAL filename

# Logging
LOG_FILE="/var/log/dcmms/backup-postgres-wal.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

# Create archive directory
mkdir -p "$WAL_ARCHIVE_DIR"

# Copy WAL file to archive
if cp "$WAL_PATH" "${WAL_ARCHIVE_DIR}/${WAL_FILE}"; then
  log "✅ Archived WAL file: $WAL_FILE"

  # Compress WAL file
  gzip "${WAL_ARCHIVE_DIR}/${WAL_FILE}"

  # Upload to S3
  if command -v aws &> /dev/null; then
    aws s3 cp "${WAL_ARCHIVE_DIR}/${WAL_FILE}.gz" \
      "s3://${S3_BUCKET}/postgres/wal/${WAL_FILE}.gz" \
      --storage-class STANDARD_IA 2>/dev/null || log "⚠️  S3 upload failed for $WAL_FILE"
  fi

  # Clean up old WAL files (local)
  find "$WAL_ARCHIVE_DIR" -name "*.gz" -mtime +${RETENTION_DAYS} -delete

  exit 0
else
  log "❌ Failed to archive WAL file: $WAL_FILE"
  exit 1
fi
