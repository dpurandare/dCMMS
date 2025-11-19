#!/bin/bash
#
# Configuration Backup Script
# Purpose: Backs up all system and application configuration files
# Frequency: Daily at 1:00 AM UTC
# Retention: 90 days
#

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/dcmms/backups/config}"
RETENTION_DAYS="${RETENTION_DAYS:-90}"
S3_BUCKET="${S3_BUCKET:-dcmms-dr-backups}"

# Configuration paths to backup
CONFIG_PATHS=(
  "/etc/dcmms"
  "/opt/dcmms/config"
  "/etc/postgresql"
  "/etc/nginx"
  "/etc/systemd/system/dcmms*.service"
  "/etc/environment"
  "/opt/dcmms/.env"
  "/opt/dcmms/docker-compose.yml"
  "/opt/dcmms/docker-compose.prod.yml"
)

# Logging
LOG_FILE="/var/log/dcmms/backup-config.log"
mkdir -p "$(dirname "$LOG_FILE")"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Start backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="config_${TIMESTAMP}.tar.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

log "Starting configuration backup: $BACKUP_FILE"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Create temp directory for collecting configs
TEMP_DIR="${BACKUP_DIR}/temp_${TIMESTAMP}"
mkdir -p "$TEMP_DIR"

# Copy all configuration files
for path in "${CONFIG_PATHS[@]}"; do
  if [[ -e "$path" ]]; then
    log "Backing up: $path"

    # Preserve directory structure
    parent_dir=$(dirname "$path")
    mkdir -p "${TEMP_DIR}${parent_dir}"

    # Copy file or directory
    cp -rL "$path" "${TEMP_DIR}${path}" 2>/dev/null || log "⚠️  Warning: Could not backup $path"
  else
    log "⚠️  Path not found: $path"
  fi
done

# Backup Docker volumes list
if command -v docker &> /dev/null; then
  docker volume ls > "${TEMP_DIR}/docker-volumes.txt" 2>/dev/null || true
fi

# Backup installed packages
if command -v dpkg &> /dev/null; then
  dpkg -l > "${TEMP_DIR}/installed-packages.txt" 2>/dev/null || true
fi

# Backup npm global packages
if command -v npm &> /dev/null; then
  npm list -g --depth=0 > "${TEMP_DIR}/npm-global-packages.txt" 2>/dev/null || true
fi

# Backup system info
cat > "${TEMP_DIR}/system-info.txt" <<EOF
Hostname: $(hostname)
OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2)
Kernel: $(uname -r)
Backup Date: $(date)
EOF

# Create compressed tarball
log "Compressing configuration backup..."
tar -czf "$BACKUP_PATH" -C "$TEMP_DIR" . 2>&1 | tee -a "$LOG_FILE"

# Clean up temp directory
rm -rf "$TEMP_DIR"

BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
log "✅ Configuration backup completed: $BACKUP_FILE ($BACKUP_SIZE)"

# Upload to S3
if command -v aws &> /dev/null; then
  log "Uploading to S3: s3://${S3_BUCKET}/config/${BACKUP_FILE}"

  if aws s3 cp "$BACKUP_PATH" "s3://${S3_BUCKET}/config/${BACKUP_FILE}" \
    --storage-class STANDARD_IA \
    --metadata "timestamp=${TIMESTAMP},type=config"; then
    log "✅ S3 upload completed"
  else
    log "⚠️  S3 upload failed"
  fi
fi

# Verify backup integrity
if tar -tzf "$BACKUP_PATH" > /dev/null 2>&1; then
  log "✅ Backup integrity verified"
else
  log "❌ Backup integrity check FAILED"
  exit 1
fi

# Clean up old backups
log "Cleaning up backups older than ${RETENTION_DAYS} days"
find "$BACKUP_DIR" -name "config_*.tar.gz" -mtime +${RETENTION_DAYS} -delete

# Create backup manifest
cat > "${BACKUP_DIR}/latest_manifest.json" <<EOF
{
  "backup_type": "config",
  "timestamp": "${TIMESTAMP}",
  "filename": "${BACKUP_FILE}",
  "size_bytes": $(stat -c%s "$BACKUP_PATH"),
  "retention_days": ${RETENTION_DAYS},
  "s3_location": "s3://${S3_BUCKET}/config/${BACKUP_FILE}",
  "verified": true,
  "config_paths": $(printf '%s\n' "${CONFIG_PATHS[@]}" | jq -R . | jq -s .)
}
EOF

log "✅ Configuration backup completed successfully"
exit 0
