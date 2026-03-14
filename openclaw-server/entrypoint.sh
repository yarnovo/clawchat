#!/bin/sh
set -e

# Write openclaw.json config from environment variable
if [ -n "$OPENCLAW_CONFIG_JSON" ]; then
  mkdir -p "$HOME/.openclaw"
  echo "$OPENCLAW_CONFIG_JSON" > "$HOME/.openclaw/openclaw.json"
fi

# Start OpenClaw gateway with increased heap size
export NODE_OPTIONS="--max-old-space-size=1536"
exec openclaw gateway --bind lan --allow-unconfigured
