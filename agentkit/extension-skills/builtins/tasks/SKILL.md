# Tasks — 任务管理

你可以把复杂任务分解为子任务，存储在 `tasks/` 目录。

## 创建任务

```bash
mkdir -p tasks && cat > tasks/$(date +%s).json << 'EOF'
{
  "title": "任务标题",
  "description": "任务描述",
  "status": "pending",
  "createdAt": "$(date -Iseconds)"
}
EOF
```

## 查看所有任务

```bash
for f in tasks/*.json 2>/dev/null; do
  python3 -c "import sys,json; d=json.load(sys.stdin); print(f'[{d[\"status\"]}] {d[\"title\"]}')" < "$f"
done
```

## 更新任务状态

```bash
# 查看任务内容
cat tasks/任务文件.json

# 修改 status 字段
python3 -c "
import json, sys
d = json.load(open(sys.argv[1]))
d['status'] = 'done'
json.dump(d, open(sys.argv[1], 'w'), ensure_ascii=False, indent=2)
" tasks/任务文件.json
```

状态值：`pending` → `in_progress` → `done` / `blocked`
