#!/usr/bin/env bash
# Get detailed information about a skill.
# Usage: skill-detail.sh <skill-name>

set -euo pipefail

SKILL_NAME="${1:-}"
if [ -z "$SKILL_NAME" ]; then
  echo "Usage: skill-detail.sh <skill-name>" >&2
  exit 1
fi

SERVER_URL="${SERVER_URL:-http://host.docker.internal:3000}"
AGENT_TOKEN="${AGENT_TOKEN:-}"

RESPONSE=$(curl -sf -H "Authorization: Bearer ${AGENT_TOKEN}" \
  "${SERVER_URL}/api/skills/${SKILL_NAME}" 2>&1) || {
  echo "Skill '${SKILL_NAME}' not found." >&2
  exit 1
}

echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin).get('skill', {})
print(f\"Name: {data.get('displayName', data.get('name', '?'))}\")
print(f\"Version: {data.get('version', '?')}\")
print()
print(data.get('content', 'No documentation.'))
files = data.get('files', [])
if files:
    print()
    print('Files:')
    for f in files:
        print(f'  {f}')
"
