# 数据库 Schema 设计

ORM: Drizzle，定义在 `server/src/db/schema.ts`

## 1. accounts 表（用户账号）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键，自动生成 |
| username | text | 唯一用户名 |
| name | text | 显示名称 |
| avatar | text \| null | 头像 URL |
| created_at | timestamptz | 创建时间 |

## 2. agents 表（Agent）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键，自动生成 |
| owner_id | UUID | 关联 accounts.id |
| name | text | Agent 名称 |
| description | text | 描述，默认空 |
| avatar | text \| null | 头像 |
| category | text \| null | 分类 |
| status | agent_status | 状态枚举 |
| channel_url | text \| null | 运行中的容器 URL |
| container_name | text \| null | Docker 容器名 |
| current_session_id | integer | 当前会话 ID，默认 1 |
| config | jsonb | 扩展配置（LLM key、persona 等） |
| created_at | timestamptz | 创建时间 |
| updated_at | timestamptz | 更新时间 |

**agent_status 枚举值：** created → starting → running → stopped → error → deleted

## 3. skill_installations 表（技能安装记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键，自动生成 |
| agent_id | UUID | 关联 agents.id |
| skill_name | text | 技能名称 |
| version | text | 版本，默认 'latest' |
| installed_at | timestamptz | 安装时间 |

## 备注

- 当前无密码认证（仅 username 登录），后续可扩展
- Agent 配置通过 config JSONB 灵活存储（llmApiKey、llmBaseUrl、llmModel、systemPrompt、persona 等）
- 消息不在 server 端持久化，由 Agent 容器内部管理会话
