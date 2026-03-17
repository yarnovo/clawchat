#!/usr/bin/env bash
# List all available skills from the marketplace.
# Requires: SERVER_URL and AGENT_TOKEN environment variables.

set -euo pipefail

SERVER_URL="${SERVER_URL:-http://host.docker.internal:3000}"
AGENT_TOKEN="${AGENT_TOKEN:-}"

RESPONSE=$(curl -sf -H "Authorization: Bearer ${AGENT_TOKEN}" \
  "${SERVER_URL}/api/skills" 2>&1) || {
  echo "Failed to fetch skills list." >&2
  exit 1
}

echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for s in data.get('skills', []):
    name = s.get('name', '?')
    desc = s.get('description', '')
    display = s.get('displayName', name)
    print(f'  {display} ({name}): {desc}')
if not data.get('skills'):
    print('  No skills available.')
"
