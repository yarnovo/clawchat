#!/usr/bin/env bash
# Uninstall a skill from this agent's workspace.
# Usage: uninstall-skill.sh <skill-name>
# Requires: SERVER_URL, AGENT_ID, and AGENT_TOKEN environment variables.

set -euo pipefail

SKILL_NAME="${1:-}"
if [ -z "$SKILL_NAME" ]; then
  echo "Usage: uninstall-skill.sh <skill-name>" >&2
  exit 1
fi

SERVER_URL="${SERVER_URL:-http://host.docker.internal:3000}"
AGENT_ID="${AGENT_ID:-}"
AGENT_TOKEN="${AGENT_TOKEN:-}"

if [ -z "$AGENT_ID" ]; then
  echo "AGENT_ID environment variable is not set." >&2
  exit 1
fi

RESPONSE=$(curl -sf -X DELETE \
  -H "Authorization: Bearer ${AGENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"agentId\": \"${AGENT_ID}\"}" \
  "${SERVER_URL}/api/skills/${SKILL_NAME}/uninstall" 2>&1) || {
  echo "Failed to uninstall skill '${SKILL_NAME}'." >&2
  exit 1
}

echo "Skill '${SKILL_NAME}' uninstalled successfully."
