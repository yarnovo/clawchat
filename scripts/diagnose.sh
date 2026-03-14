#!/usr/bin/env bash
# ClawChat 系统诊断脚本
# 输出结构化 JSON 报告，供 AI 助手分析
set -euo pipefail

LOKI_URL="${LOKI_URL:-http://localhost:3100}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://localhost:9090}"
REDIS_CONTAINER="${REDIS_CONTAINER:-clawchat-redis}"

# Colors for human-readable headers (stderr)
info() { echo "── $1" >&2; }

# ──────────────── 1. Container status ────────────────
info "Containers"
CONTAINERS=$(docker compose ps --format json 2>/dev/null || echo "[]")

# ──────────────── 2. Health checks ────────────────
info "Health checks"
health_check() {
  local name="$1" url="$2"
  local result
  result=$(curl -sf --max-time 3 "$url" 2>/dev/null || echo '{"status":"unreachable"}')
  echo "{\"service\":\"$name\",\"result\":$result}"
}

HEALTH_IM=$(health_check "im-server" "http://localhost:3000/v1/im/health")
HEALTH_AGENT=$(health_check "agent-server" "http://localhost:3004/v1/agents/health")
HEALTH_CONTAINER=$(health_check "container-server" "http://localhost:3002/v1/containers/health")
HEALTH_OPENCLAW=$(health_check "openclaw-server" "http://localhost:3003/v1/openclaw/health")
HEALTH_MCP=$(health_check "mcp-server" "http://localhost:8000/health")

# ──────────────── 3. Redis queue depths ────────────────
info "Redis queues"
QUEUE_DEPTH=$(docker exec "$REDIS_CONTAINER" redis-cli LLEN clawchat:agent-reply:queue 2>/dev/null || echo "-1")
DLQ_DEPTH=$(docker exec "$REDIS_CONTAINER" redis-cli LLEN clawchat:agent-reply:dlq 2>/dev/null || echo "-1")

# Read DLQ messages if any
DLQ_MESSAGES="[]"
if [ "$DLQ_DEPTH" -gt 0 ] 2>/dev/null; then
  DLQ_MESSAGES=$(docker exec "$REDIS_CONTAINER" redis-cli LRANGE clawchat:agent-reply:dlq 0 9 2>/dev/null | python3 -c "
import sys, json
lines = [l.strip() for l in sys.stdin if l.strip()]
msgs = []
for l in lines:
    try: msgs.append(json.loads(l))
    except: msgs.append({'raw': l})
print(json.dumps(msgs))
" 2>/dev/null || echo "[]")
fi

# ──────────────── 4. Prometheus metrics (key indicators) ────────────────
info "Prometheus metrics"
prom_query() {
  local query="$1"
  curl -sf --max-time 3 "${PROMETHEUS_URL}/api/v1/query" --data-urlencode "query=$query" 2>/dev/null \
    | python3 -c "
import sys, json
data = json.load(sys.stdin)
results = data.get('data',{}).get('result',[])
out = []
for r in results:
    labels = {k:v for k,v in r['metric'].items() if k != '__name__'}
    out.append({'labels': labels, 'value': r['value'][1]})
print(json.dumps(out))
" 2>/dev/null || echo "[]"
}

ERROR_RATE=$(prom_query 'sum by (job) (rate(http_requests_total{status=~"5.."}[5m]))')
REQUEST_RATE=$(prom_query 'sum by (job) (rate(http_requests_total[5m]))')
WS_CONNECTIONS=$(prom_query 'ws_connections_active')
QUEUE_GAUGE=$(prom_query 'agent_reply_queue_depth')
DLQ_GAUGE=$(prom_query 'agent_reply_dlq_depth')

# ──────────────── 5. Loki recent errors (last 15 min) ────────────────
info "Recent errors from Loki"
LOKI_ERRORS=$(curl -sf --max-time 5 "${LOKI_URL}/loki/api/v1/query_range" \
  --data-urlencode 'query={service=~".+"} | json | level = `50` or level = `error`' \
  --data-urlencode "start=$(date -u -v-15M +%s 2>/dev/null || date -u -d '15 min ago' +%s)000000000" \
  --data-urlencode "end=$(date -u +%s)000000000" \
  --data-urlencode 'limit=20' 2>/dev/null \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
results = data.get('data',{}).get('result',[])
errors = []
for stream in results:
    svc = stream.get('stream',{}).get('service','unknown')
    for ts, line in stream.get('values',[]):
        errors.append({'service': svc, 'timestamp': ts, 'message': line[:500]})
errors.sort(key=lambda x: x['timestamp'], reverse=True)
print(json.dumps(errors[:20]))
" 2>/dev/null || echo "[]")

# ──────────────── Output JSON report ────────────────
info "Done"

python3 -c "
import json, sys

report = {
    'health': [
        $HEALTH_IM,
        $HEALTH_AGENT,
        $HEALTH_CONTAINER,
        $HEALTH_OPENCLAW,
        $HEALTH_MCP
    ],
    'redis': {
        'queue_depth': int('$QUEUE_DEPTH') if '$QUEUE_DEPTH' != '-1' else None,
        'dlq_depth': int('$DLQ_DEPTH') if '$DLQ_DEPTH' != '-1' else None,
        'dlq_messages': $DLQ_MESSAGES
    },
    'prometheus': {
        'error_rate_5m': $ERROR_RATE,
        'request_rate_5m': $REQUEST_RATE,
        'ws_connections': $WS_CONNECTIONS,
        'queue_depth': $QUEUE_GAUGE,
        'dlq_depth': $DLQ_GAUGE
    },
    'loki_recent_errors': $LOKI_ERRORS
}

# Summary
issues = []
for h in report['health']:
    if h['result'].get('status') not in ('ok',):
        issues.append(f\"{h['service']}: {h['result'].get('status', 'unreachable')}\")

dlq = report['redis']['dlq_depth']
if dlq and dlq > 0:
    issues.append(f'DLQ has {dlq} messages')

err_count = len(report['loki_recent_errors'])
if err_count > 0:
    issues.append(f'{err_count} errors in last 15 min')

report['summary'] = {
    'status': 'healthy' if not issues else 'issues_found',
    'issues': issues
}

print(json.dumps(report, indent=2, ensure_ascii=False))
"
