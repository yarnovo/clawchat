#!/bin/sh
set -e

# Pre-compile agent-runner (original NanoClaw entrypoint responsibility)
cd /app && npx tsc --outDir /tmp/dist 2>&1 >&2
ln -s /app/node_modules /tmp/dist/node_modules

# Write system prompt to CLAUDE.md if provided
if [ -n "$CLAWCHAT_SYSTEM_PROMPT" ]; then
  mkdir -p /workspace/group
  echo "$CLAWCHAT_SYSTEM_PROMPT" > /workspace/group/CLAUDE.md
fi

# Ensure IPC directories exist
mkdir -p /workspace/ipc/input /workspace/ipc/messages /workspace/ipc/tasks

# Start the HTTP bridge (it manages agent-runner lifecycle)
exec node /app/bridge/dist/index.js
