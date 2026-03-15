#!/bin/bash
# Web Fetch — 抓取 URL 并返回内容
# 用法: bash skills/web/scripts/fetch.sh "https://example.com"

URL="$1"
if [ -z "$URL" ]; then
  echo "Error: missing URL" >&2
  exit 1
fi

curl -sL --max-time 15 "$URL" | head -c 10000
