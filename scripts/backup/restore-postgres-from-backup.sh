#!/bin/bash
#
# PostgreSQL Restore Script
# Purpose: Restores PostgreSQL database from backup
# Usage: ./restore-postgres-from-backup.sh [backup_file] [--pitr "YYYY-MM-DD HH:MM:SS"]
#

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/dcmms/backups/postgres/full}"
WAL_ARCHIVE_DIR="${WAL_ARCHIVE_DIR:-/opt/dcmms/backups/postgres/wal}"
POSTGRES_DATA_DIR="${POSTGRES_DATA_DIR:-/var/lib/postgresql/14/main}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
RESTORE_DIR="/opt/dcmms/restore/postgres"

# Logging
LOG_FILE="/var/log/dcmms/restore-postgres.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Parse arguments
BACKUP_FILE="${1:-}"
PITR_TARGET=""

if [[ "$#" -ge 3 ]] && [[ "$2" == "--pitr" ]]; then
  PITR_TARGET="$3"
  log "Point-in-Time Recovery requested to: $PITR_TARGET"
fi

# Validate backup file
if [[ -z "$BACKUP_FILE" ]]; then
  log "Usage: $0 <backup_file> [--pitr \"YYYY-MM-DD HH:MM:SS\"]"
  log ""
  log "Available backups:"
  ls -lh "${BACKUP_DIR}/"postgres_full_*.sql.gz 2>/dev/null || log "No backups found"
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  # Try to find backup in default directory
  if [[ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]]; then
    BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
  else
    log "❌ Backup file not found: $BACKUP_FILE"
    exit 1
  fi
fi

log "========================================="
log "PostgreSQL Database Restore"
log "========================================="
log "Backup file: $BACKUP_FILE"
log "PITR target: ${PITR_TARGET:-None (restore to end of backup)}"
log ""

# Confirmation prompt
read -p "⚠️  WARNING: This will DESTROY the current database. Continue? (yes/no): " confirm
if [[ "$confirm" != "yes" ]]; then
  log "Restore cancelled by user"
  exit 0
fi

# Step 1: Stop PostgreSQL
log "Step 1: Stopping PostgreSQL service..."
if systemctl is-active --quiet postgresql; then
  systemctl stop postgresql
  log "✅ PostgreSQL stopped"
else
  log "PostgreSQL is already stopped"
fi

# Step 2: Backup current data directory (safety measure)
log "Step 2: Creating safety backup of current data directory..."
SAFETY_BACKUP="/opt/dcmms/safety-backups/postgres_before_restore_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$(dirname "$SAFETY_BACKUP")"

if [[ -d "$POSTGRES_DATA_DIR" ]]; then
  mv "$POSTGRES_DATA_DIR" "$SAFETY_BACKUP"
  log "✅ Current data moved to: $SAFETY_BACKUP"
else
  log "No existing data directory found"
fi

# Step 3: Initialize new data directory
log "Step 3: Initializing new PostgreSQL data directory..."
mkdir -p "$POSTGRES_DATA_DIR"
chown -R "$POSTGRES_USER":"$POSTGRES_USER" "$POSTGRES_DATA_DIR"
chmod 700 "$POSTGRES_DATA_DIR"

su - "$POSTGRES_USER" -c "/usr/lib/postgresql/14/bin/initdb -D $POSTGRES_DATA_DIR" | tee -a "$LOG_FILE"
log "✅ Data directory initialized"

# Step 4: Configure recovery (if PITR requested)
if [[ -n "$PITR_TARGET" ]]; then
  log "Step 4: Configuring Point-in-Time Recovery..."

  # Create recovery.conf (PostgreSQL 11 and earlier) or recovery.signal (PostgreSQL 12+)
  cat > "${POSTGRES_DATA_DIR}/postgresql.auto.conf" <<EOF
restore_command = 'gunzip < ${WAL_ARCHIVE_DIR}/%f.gz > %p'
recovery_target_time = '${PITR_TARGET}'
recovery_target_action = 'promote'
EOF

  touch "${POSTGRES_DATA_DIR}/recovery.signal"
  chown "$POSTGRES_USER":"$POSTGRES_USER" "${POSTGRES_DATA_DIR}/recovery.signal"

  log "✅ PITR configuration created"
else
  log "Step 4: Skipping PITR configuration (full restore)"
fi

# Step 5: Start PostgreSQL in recovery mode
log "Step 5: Starting PostgreSQL..."
systemctl start postgresql

# Wait for PostgreSQL to start
for i in {1..30}; do
  if pg_isready -q; then
    log "✅ PostgreSQL is ready"
    break
  fi
  log "Waiting for PostgreSQL to start... ($i/30)"
  sleep 2
done

if ! pg_isready -q; then
  log "❌ PostgreSQL failed to start"
  exit 1
fi

# Step 6: Drop existing database (if exists)
log "Step 6: Preparing database..."
su - "$POSTGRES_USER" -c "psql -c 'DROP DATABASE IF EXISTS dcmms;'" 2>&1 | tee -a "$LOG_FILE"
su - "$POSTGRES_USER" -c "psql -c 'CREATE DATABASE dcmms;'" 2>&1 | tee -a "$LOG_FILE"
log "✅ Database prepared"

# Step 7: Restore from backup
log "Step 7: Restoring database from backup..."
log "This may take several minutes..."

if [[ "$BACKUP_FILE" == *.sql.gz ]]; then
  # Decompress and restore
  gunzip < "$BACKUP_FILE" | su - "$POSTGRES_USER" -c "psql dcmms" 2>&1 | tee -a "$LOG_FILE"
elif [[ "$BACKUP_FILE" == *.sql ]]; then
  # Restore directly
  su - "$POSTGRES_USER" -c "psql dcmms < $BACKUP_FILE" 2>&1 | tee -a "$LOG_FILE"
elif [[ "$BACKUP_FILE" == *.dump ]]; then
  # Restore custom format
  su - "$POSTGRES_USER" -c "pg_restore -d dcmms $BACKUP_FILE" 2>&1 | tee -a "$LOG_FILE"
else
  log "❌ Unsupported backup format"
  exit 1
fi

log "✅ Database restored"

# Step 8: Verify restoration
log "Step 8: Verifying restoration..."

# Check database exists
DB_EXISTS=$(su - "$POSTGRES_USER" -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='dcmms'\"")
if [[ "$DB_EXISTS" == "1" ]]; then
  log "✅ Database 'dcmms' exists"
else
  log "❌ Database verification failed"
  exit 1
fi

# Check table count
TABLE_COUNT=$(su - "$POSTGRES_USER" -c "psql -d dcmms -tAc \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'\"")
log "Table count: $TABLE_COUNT"

if [[ $TABLE_COUNT -gt 0 ]]; then
  log "✅ Tables restored successfully"
else
  log "⚠️  WARNING: No tables found in restored database"
fi

# Check record counts in key tables
for table in users sites assets work_orders; do
  COUNT=$(su - "$POSTGRES_USER" -c "psql -d dcmms -tAc \"SELECT COUNT(*) FROM $table\"" 2>/dev/null || echo "0")
  log "  - $table: $COUNT records"
done

log "========================================="
log "PostgreSQL Restore Summary"
log "========================================="
log "Backup file: $BACKUP_FILE"
log "Restore time: $(date)"
log "Database: dcmms"
log "Tables: $TABLE_COUNT"
log "Safety backup: $SAFETY_BACKUP"
log "========================================="

# Create restore report
REPORT_FILE="/opt/dcmms/restore/restore_report_$(date +%Y%m%d_%H%M%S).json"
mkdir -p "$(dirname "$REPORT_FILE")"
cat > "$REPORT_FILE" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "backup_file": "$BACKUP_FILE",
  "pitr_target": "${PITR_TARGET:-null}",
  "database": "dcmms",
  "table_count": $TABLE_COUNT,
  "safety_backup": "$SAFETY_BACKUP",
  "status": "success"
}
EOF

log "✅ PostgreSQL restore completed successfully"
log "Restore report saved to: $REPORT_FILE"
log ""
log "⚠️  IMPORTANT: Verify application functionality before removing safety backup:"
log "   $SAFETY_BACKUP"

exit 0
