#!/bin/bash
# Web Search — 搜索 DuckDuckGo 并返回结果
# 用法: bash skills/web/scripts/search.sh "query"

QUERY="$1"
if [ -z "$QUERY" ]; then
  echo "Error: missing search query" >&2
  exit 1
fi

ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$QUERY'))" 2>/dev/null || echo "$QUERY")
curl -s --max-time 10 "https://html.duckduckgo.com/html/?q=${ENCODED}" | head -c 5000
