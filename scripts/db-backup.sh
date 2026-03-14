#!/usr/bin/env bash
# ClawChat 数据库备份脚本
# 使用 pg_dumpall 导出所有数据库，gzip 压缩存储
# 用法: db-backup.sh [--tag <label>]
set -euo pipefail

PG_CONTAINER="${PG_CONTAINER:-clawchat-postgres}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-7}"
TAG=""

info() { echo "── $1" >&2; }

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --tag) TAG="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Build filename
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
if [ -n "$TAG" ]; then
  FILENAME="${TIMESTAMP}_${TAG}.sql.gz"
else
  FILENAME="${TIMESTAMP}.sql.gz"
fi
FILEPATH="${BACKUP_DIR}/${FILENAME}"

# Dump all databases
info "Backing up all databases from ${PG_CONTAINER}"
docker exec "$PG_CONTAINER" pg_dumpall -U clawchat | gzip > "$FILEPATH"

# Verify backup
info "Verifying backup"
FILESIZE=$(wc -c < "$FILEPATH" | tr -d ' ')
if [ "$FILESIZE" -eq 0 ]; then
  echo "ERROR: Backup file is empty" >&2
  rm -f "$FILEPATH"
  exit 1
fi

if ! gzip -t "$FILEPATH" 2>/dev/null; then
  echo "ERROR: Backup file is corrupt" >&2
  rm -f "$FILEPATH"
  exit 1
fi

info "Backup created: ${FILEPATH} (${FILESIZE} bytes)"

# Clean up old backups
info "Cleaning up backups older than ${KEEP_DAYS} days"
DELETED=$(find "$BACKUP_DIR" -name "*.sql.gz" -mtime +"$KEEP_DAYS" -print -delete | wc -l | tr -d ' ')
info "Deleted ${DELETED} old backup(s)"

info "Done"
