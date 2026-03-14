#!/usr/bin/env bash
# ClawChat 数据库恢复脚本
# 从 pg_dumpall 备份文件恢复所有数据库
# 用法: db-restore.sh <backup-file.sql.gz>
set -euo pipefail

PG_CONTAINER="${PG_CONTAINER:-clawchat-postgres}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"

info() { echo "── $1" >&2; }

if [ $# -lt 1 ]; then
  echo "Usage: db-restore.sh <backup-file.sql.gz>" >&2
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: File not found: ${BACKUP_FILE}" >&2
  exit 1
fi

# Confirm unless FORCE=1
if [ "${FORCE:-0}" != "1" ]; then
  echo "WARNING: This will overwrite all data in PostgreSQL."
  echo "Backup file: ${BACKUP_FILE}"
  read -r -p "Continue? [y/N] " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Aborted." >&2
    exit 0
  fi
fi

# Stop application servers
info "Stopping im-server and agent-server"
docker compose -f "$COMPOSE_FILE" stop im-server agent-server 2>/dev/null || true

# Restore
info "Restoring from ${BACKUP_FILE}"
gunzip -c "$BACKUP_FILE" | docker exec -i "$PG_CONTAINER" psql -U clawchat -d postgres

# Verify: check both databases have tables
info "Verifying restored databases"
IM_TABLES=$(docker exec "$PG_CONTAINER" psql -U clawchat -d clawchat -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" | tr -d ' ')
AGENT_TABLES=$(docker exec "$PG_CONTAINER" psql -U clawchat -d clawchat_agent -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" | tr -d ' ')

if [ "$IM_TABLES" -gt 0 ] && [ "$AGENT_TABLES" -gt 0 ]; then
  info "Verified: clawchat has ${IM_TABLES} tables, clawchat_agent has ${AGENT_TABLES} tables"
else
  echo "WARNING: clawchat=${IM_TABLES} tables, clawchat_agent=${AGENT_TABLES} tables — verify manually" >&2
fi

# Restart application servers
info "Restarting im-server and agent-server"
docker compose -f "$COMPOSE_FILE" start im-server agent-server

info "Done"
