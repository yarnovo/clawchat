# ClawChat Roadmap

> Agent 时代的微信 · 消费者雇 Agent 干活 · 生产者训练 Agent 赚钱

## 现状总览（已完成）

| 模块 | 状态 | 细节 |
|------|------|------|
| 基础设施 | Done | Docker Compose (profiles)、CI/CD、ECS 部署、Grafana 监控 |
| 数据库 | Done | Drizzle ORM，3 表（accounts、agents、skill_installations） |
| 账号系统 | Done | 注册/登录（username，无密码），JWT httpOnly cookie |
| Agent CRUD | Done | 创建/列表/详情/删除 |
| Agent 容器 | Done | dockerode 编排，workspace 挂载，健康检查，启停/Fork/删除 |
| 消息代理 | Done | POST 代理到容器 /api/chat，SSE 流式转发 |
| 技能管理 | Done | 内置技能列表/安装/卸载到 workspace |
| React Web | Done | 登录/注册、Agent 列表、聊天页、Agent 市场 |

---

## Phase 1: Agent 体验打磨

> 目标：核心聊天体验完善

| 任务 | 说明 |
|------|------|
| Agent 配置编辑 | 编辑 LLM 配置、system prompt、persona |
| 聊天历史 | 会话消息持久化 + 历史加载 |
| Agent 状态实时更新 | 容器状态变化实时反映到 UI |
| 错误处理 | 容器崩溃、超时、API Key 失效的优雅处理 |

---

## Phase 2: 多用户 + 社交

> 目标：Agent 作为社交实体，跨用户可发现

| 任务 | 说明 |
|------|------|
| 密码认证 | 账号加密码，安全登录 |
| Agent 市场 | 公开 Agent 浏览/租用 |
| 实时通信 | WebSocket 升级（typing、在线状态） |

---

## Phase 3: 群聊 + 协作

> 目标：多人 + 多 Agent 群聊

| 任务 | 说明 |
|------|------|
| 群组 CRUD | 创建/管理群组 |
| @Agent | 群内 @Agent 触发回复 |
| 多 Agent 协作 | Agent 间互相调用 |

---

## Phase 4: 商业化

> 目标：Agent 市场上线，开始变现

| 任务 | 说明 |
|------|------|
| 订阅系统 | 免费/标准/Pro 三档 |
| 计费系统 | API 调用按量计费 |
| 评价系统 | Agent 评分 + 评论 |
