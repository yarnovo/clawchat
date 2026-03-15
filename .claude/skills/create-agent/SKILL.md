# 创建垂直 Agent

基于 NanoClaw 创建一个新的垂直 Agent 项目。

## 触发方式

当用户说"创建 agent"、"新建 agent"、"/create-agent"时调用。

## 参数

- `name`：Agent 名称（如 `demo-agent`、`lawyer-agent`、`dental-agent`）

## 流程

### Step 1: 复制 NanoClaw 源码

```bash
cp -r nanoclaw/ nanoclaw-agent-hub/{name}/
rm -rf nanoclaw-agent-hub/{name}/.git
rm -rf nanoclaw-agent-hub/{name}/node_modules
rm -rf nanoclaw-agent-hub/{name}/dist
```

### Step 2: 安装依赖

需要 Node 22（Node 25 的 better-sqlite3 编译会失败）。

```bash
cd nanoclaw-agent-hub/{name}
npm install
npm run build
```

### Step 3: 配置 .env

在 `nanoclaw-agent-hub/{name}/.env` 中配置认证，二选一：

**方案 A：Anthropic API Key（按量付费）**
```bash
echo "ANTHROPIC_API_KEY=sk-ant-api03-你的key" > nanoclaw-agent-hub/{name}/.env
```

**方案 B：Claude Code OAuth Token（用已有订阅）**
从 macOS 钥匙串提取：
```bash
TOKEN=$(security find-generic-password -s "Claude Code-credentials" -w | python3 -c "import sys,json; print(json.load(sys.stdin)['claudeAiOauth']['accessToken'])")
echo "CLAUDE_CODE_OAUTH_TOKEN=$TOKEN" > nanoclaw-agent-hub/{name}/.env
```
注意：OAuth Token 会过期，过期后需要重新提取。

### Step 4: 构建 Agent 容器镜像

```bash
cd nanoclaw-agent-hub/{name}
./container/build.sh
```

### Step 5: 配置 CLAUDE.md（行业知识）

编辑 `nanoclaw-agent-hub/{name}/groups/CLAUDE.md`，写入垂直行业的知识和行为规则。

### Step 6: 启动测试

```bash
cd nanoclaw-agent-hub/{name}
npm run dev
```

### Step 7: 添加消息渠道（可选）

在 `nanoclaw-agent-hub/{name}/` 目录下打开 Claude Code：

```bash
cd nanoclaw-agent-hub/{name}
claude
# 然后输入 /add-whatsapp 或 /add-telegram
```

## 注意事项

- 每个 Agent 项目是 nanoclaw 的独立副本，代码跟着 clawchat 仓库 track
- 上游更新从 `nanoclaw/` 子模块拉，手动 diff 合并到各 Agent 目录
- `.env` 文件不要提交（已在 .gitignore 中）
- 容器镜像名默认 `nanoclaw-agent:latest`，多个 Agent 共享同一个镜像（除非自定义）
