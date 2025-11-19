#!/bin/bash
#
# Backup Verification Script
# Purpose: Verifies integrity and completeness of all backups
# Frequency: Daily at 4:00 AM UTC (after all backups complete)
# Alert: Sends notification if verification fails
#

set -euo pipefail

# Configuration
BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-/opt/dcmms/backups}"
S3_BUCKET="${S3_BUCKET:-dcmms-dr-backups}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
MAX_BACKUP_AGE_HOURS=26  # Alert if latest backup is older than 26 hours

# Logging
LOG_FILE="/var/log/dcmms/verify-backups.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

send_alert() {
  local severity="$1"  # INFO, WARNING, CRITICAL
  local message="$2"

  log "${severity}: $message"

  if [[ -n "$SLACK_WEBHOOK" ]]; then
    local emoji="ℹ️"
    [[ "$severity" == "WARNING" ]] && emoji="⚠️"
    [[ "$severity" == "CRITICAL" ]] && emoji="🔴"

    curl -X POST -H 'Content-type: application/json' \
      --data "{\"text\":\"${emoji} Backup Verification - ${severity}: ${message}\"}" \
      "$SLACK_WEBHOOK" 2>/dev/null || true
  fi
}

# Verification results
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

check_backup() {
  local backup_type="$1"
  local backup_path="$2"
  local max_age_hours="$3"

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  log "Checking $backup_type backup: $backup_path"

  # Check if backup exists
  if [[ ! -f "$backup_path" ]]; then
    log "❌ FAIL: Backup file not found"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    send_alert "CRITICAL" "$backup_type backup file not found: $backup_path"
    return 1
  fi

  # Check backup age
  local backup_age_seconds=$(($(date +%s) - $(stat -c %Y "$backup_path")))
  local backup_age_hours=$((backup_age_seconds / 3600))

  if [[ $backup_age_hours -gt $max_age_hours ]]; then
    log "⚠️  WARNING: Backup is ${backup_age_hours} hours old (threshold: ${max_age_hours}h)"
    WARNINGS=$((WARNINGS + 1))
    send_alert "WARNING" "$backup_type backup is ${backup_age_hours} hours old"
  fi

  # Check file size (must be > 1KB)
  local file_size=$(stat -c %s "$backup_path")
  if [[ $file_size -lt 1024 ]]; then
    log "❌ FAIL: Backup file is too small (${file_size} bytes)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    send_alert "CRITICAL" "$backup_type backup is too small: ${file_size} bytes"
    return 1
  fi

  # Verify compression integrity (for .gz files)
  if [[ "$backup_path" == *.gz ]]; then
    if gunzip -t "$backup_path" 2>&1 | tee -a "$LOG_FILE"; then
      log "✅ Compression integrity verified"
    else
      log "❌ FAIL: Compression integrity check failed"
      FAILED_CHECKS=$((FAILED_CHECKS + 1))
      send_alert "CRITICAL" "$backup_type backup compression is corrupted"
      return 1
    fi
  fi

  # Verify tar integrity (for .tar.gz files)
  if [[ "$backup_path" == *.tar.gz ]]; then
    if tar -tzf "$backup_path" > /dev/null 2>&1; then
      log "✅ Tar integrity verified"
    else
      log "❌ FAIL: Tar integrity check failed"
      FAILED_CHECKS=$((FAILED_CHECKS + 1))
      send_alert "CRITICAL" "$backup_type backup tar is corrupted"
      return 1
    fi
  fi

  log "✅ PASS: $backup_type backup verification successful"
  PASSED_CHECKS=$((PASSED_CHECKS + 1))
  return 0
}

check_s3_backup() {
  local backup_type="$1"
  local s3_path="$2"

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  log "Checking S3 backup: $s3_path"

  if command -v aws &> /dev/null; then
    if aws s3 ls "$s3_path" > /dev/null 2>&1; then
      log "✅ PASS: S3 backup exists"
      PASSED_CHECKS=$((PASSED_CHECKS + 1))
      return 0
    else
      log "❌ FAIL: S3 backup not found"
      FAILED_CHECKS=$((FAILED_CHECKS + 1))
      send_alert "CRITICAL" "$backup_type S3 backup not found: $s3_path"
      return 1
    fi
  else
    log "⚠️  WARNING: AWS CLI not available, skipping S3 verification"
    WARNINGS=$((WARNINGS + 1))
    return 0
  fi
}

# Start verification
log "========================================="
log "Starting backup verification"
log "========================================="

# 1. Verify PostgreSQL Full Backup
LATEST_POSTGRES_FULL=$(find "${BACKUP_BASE_DIR}/postgres/full" -name "postgres_full_*.sql.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

if [[ -n "$LATEST_POSTGRES_FULL" ]]; then
  check_backup "PostgreSQL Full" "$LATEST_POSTGRES_FULL" $MAX_BACKUP_AGE_HOURS

  # Check S3 backup
  BACKUP_FILENAME=$(basename "$LATEST_POSTGRES_FULL")
  check_s3_backup "PostgreSQL Full" "s3://${S3_BUCKET}/postgres/full/${BACKUP_FILENAME}"
else
  log "❌ FAIL: No PostgreSQL full backup found"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
  send_alert "CRITICAL" "No PostgreSQL full backup found"
fi

# 2. Verify PostgreSQL Incremental Backup
LATEST_POSTGRES_INCR=$(find "${BACKUP_BASE_DIR}/postgres/incremental" -name "*.tar.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

if [[ -n "$LATEST_POSTGRES_INCR" ]]; then
  check_backup "PostgreSQL Incremental" "$LATEST_POSTGRES_INCR" 2  # 2 hours (hourly backup)
else
  log "⚠️  WARNING: No PostgreSQL incremental backup found"
  WARNINGS=$((WARNINGS + 1))
fi

# 3. Verify PostgreSQL WAL Archives
WAL_COUNT=$(find "${BACKUP_BASE_DIR}/postgres/wal" -name "*.gz" -type f -mtime -1 | wc -l)
log "Found ${WAL_COUNT} WAL archives from last 24 hours"

if [[ $WAL_COUNT -eq 0 ]]; then
  log "⚠️  WARNING: No recent WAL archives found"
  WARNINGS=$((WARNINGS + 1))
  send_alert "WARNING" "No PostgreSQL WAL archives from last 24 hours"
fi

# 4. Verify QuestDB Snapshot
LATEST_QUESTDB=$(find "${BACKUP_BASE_DIR}/questdb" -name "questdb_snapshot_*.tar.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

if [[ -n "$LATEST_QUESTDB" ]]; then
  check_backup "QuestDB Snapshot" "$LATEST_QUESTDB" $MAX_BACKUP_AGE_HOURS

  # Check S3 backup
  BACKUP_FILENAME=$(basename "$LATEST_QUESTDB")
  check_s3_backup "QuestDB Snapshot" "s3://${S3_BUCKET}/questdb/${BACKUP_FILENAME}"
else
  log "❌ FAIL: No QuestDB snapshot found"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
  send_alert "CRITICAL" "No QuestDB snapshot backup found"
fi

# 5. Verify Configuration Backup
LATEST_CONFIG=$(find "${BACKUP_BASE_DIR}/config" -name "config_*.tar.gz" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

if [[ -n "$LATEST_CONFIG" ]]; then
  check_backup "Configuration" "$LATEST_CONFIG" $MAX_BACKUP_AGE_HOURS
else
  log "⚠️  WARNING: No configuration backup found"
  WARNINGS=$((WARNINGS + 1))
fi

# 6. Verify Backup Manifests
for manifest in "${BACKUP_BASE_DIR}"/*/latest_manifest.json; do
  if [[ -f "$manifest" ]]; then
    log "Checking manifest: $manifest"
    if jq empty "$manifest" 2>/dev/null; then
      log "✅ Manifest valid JSON"
      PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
      log "❌ Manifest invalid JSON"
      FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  fi
done

# Generate summary report
log "========================================="
log "Backup Verification Summary"
log "========================================="
log "Total Checks: $TOTAL_CHECKS"
log "Passed: $PASSED_CHECKS"
log "Failed: $FAILED_CHECKS"
log "Warnings: $WARNINGS"
log "========================================="

# Create verification report
REPORT_FILE="${BACKUP_BASE_DIR}/verification_report_$(date +%Y%m%d_%H%M%S).json"
cat > "$REPORT_FILE" <<EOF
{
  "timestamp": "$(date -Iseconds)",
  "total_checks": $TOTAL_CHECKS,
  "passed": $PASSED_CHECKS,
  "failed": $FAILED_CHECKS,
  "warnings": $WARNINGS,
  "success_rate": $(echo "scale=2; $PASSED_CHECKS * 100 / $TOTAL_CHECKS" | bc)%
}
EOF

# Exit with appropriate status
if [[ $FAILED_CHECKS -gt 0 ]]; then
  send_alert "CRITICAL" "Backup verification FAILED: ${FAILED_CHECKS} checks failed"
  log "❌ Backup verification FAILED"
  exit 1
elif [[ $WARNINGS -gt 0 ]]; then
  send_alert "WARNING" "Backup verification completed with ${WARNINGS} warnings"
  log "⚠️  Backup verification completed with warnings"
  exit 0
else
  send_alert "INFO" "Backup verification PASSED: All ${TOTAL_CHECKS} checks successful"
  log "✅ Backup verification PASSED"
  exit 0
fi
