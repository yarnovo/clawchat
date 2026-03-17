#!/usr/bin/env bash
# Retrieve a credential from environment variables.
# Usage: bash skills/credentials/scripts/get-credential.sh KEY_NAME
#
# Outputs the value to stdout. Exits 1 if not found.

set -euo pipefail

KEY_NAME="${1:-}"

if [ -z "$KEY_NAME" ]; then
  echo "Usage: get-credential.sh KEY_NAME" >&2
  exit 1
fi

VALUE="${!KEY_NAME:-}"

if [ -z "$VALUE" ]; then
  echo "Credential '$KEY_NAME' is not configured. Ask the user to set it in the ClawChat UI." >&2
  exit 1
fi

printf '%s' "$VALUE"
