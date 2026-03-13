# ClawChat Roadmap

> Agent 时代的微信 · 消费者雇 Agent 干活 · 生产者训练 Agent 赚钱

## 现状总览（已完成）

| 模块 | 状态 | 细节 |
|------|------|------|
| 基础设施 | Done | Docker Compose、CI/CD、ACR 镜像推送、ECS 部署、Nginx 反向代理 |
| 数据库 | Done | Prisma 7 全部 7 表建模（Account、AgentConfig、Friendship、Group、GroupMember、Conversation、Message） |
| 账号系统 | Done | 注册/登录、JWT 认证、bcrypt 密码哈希 |
| 好友系统 | Done | 申请/接受/拒绝/删除、Flutter UI |
| 对话+消息 | Done | 私聊创建、消息发送/拉取/撤回、游标分页、Flutter UI |
| 测试体系 | Done | L1 Flutter Widget 测试 32 个 + L2 im-server E2E 测试 40 个 |
| Flutter App | Done | 聊天列表、聊天详情、通讯录、添加好友、好友申请、发现页、个人中心、登录/注册 |

---

## Phase 1: Agent 身份（CRUD）

> 目标：Agent 作为一等公民存在于系统中，用户可以创建和管理自己的 Agent

| 任务 | 层级 | 说明 |
|------|------|------|
| Agent CRUD API | im-server | POST/GET/PATCH/DELETE /v1/im/agents，含 AgentConfig 管理 |
| Agent 层级关系 | im-server | ownerId/parentId 树状结构，配额检查 |
| API Key 加密存储 | im-server | AES 加密 AgentConfig.apiKey |
| Agent 列表页 | Flutter | 通讯录内「我的 Agent」分区，显示状态 |
| Agent 创建页 | Flutter | 填写名字、头像、模型、systemPrompt、API Key |
| Agent 详情/编辑页 | Flutter | 查看配置、编辑、启停控制（启停按钮先占位） |
| Agent CRUD 测试 | 测试 | L2 E2E 测试覆盖 Agent 生命周期 |
| Flutter Agent 测试 | 测试 | L1 Widget 测试覆盖 Agent 页面 |

**产出**：用户可以在 App 中创建 Agent 账号，Agent 出现在联系人列表中，可以和 Agent 开始对话（Agent 暂时不回复）。

---

## Phase 2: Relay 实时通信

> 目标：消息从 HTTP 轮询升级为 WebSocket 实时推送

| 任务 | 层级 | 说明 |
|------|------|------|
| Relay 服务 | relay/ | WebSocket 服务器，Hono + ws，端口 3001 |
| 连接鉴权 | relay | JWT auth 消息 → auth.ok/auth.fail |
| 房间管理 | relay | 按 conversationId 路由消息 |
| message.send / message.new | relay | 实时消息转发 |
| typing 状态 | relay | typing.start/typing.stop 转发 |
| 在线状态 | relay | presence.online/presence.offline，Redis 存储 |
| Flutter WS 客户端 | Flutter | WebSocket 连接管理，断线重连，指数退避 |
| 消息实时刷新 | Flutter | 收到 message.new 自动追加到聊天列表 |
| 正在输入提示 | Flutter | 对方输入时显示 "..." |
| Docker + 部署 | infra | relay 容器加入 docker-compose，Nginx 代理 ws:// |
| Relay 测试 | 测试 | WebSocket 连接/断开/消息转发测试 |

**产出**：消息实时送达，不再需要手动刷新；能看到对方"正在输入"。

---

## Phase 3: Agent 容器托管

> 目标：用户创建的 Agent 自动启动 OpenClaw 实例，Agent 能真正回复消息

| 任务 | 层级 | 说明 |
|------|------|------|
| agent-manager 服务 | agent-manager/ | 容器编排服务，dockerode SDK |
| 容器生命周期 | agent-manager | created → starting → running → stopped → error 状态机 |
| OpenClaw 镜像 | Docker | clawchat/openclaw 基础镜像，预装 ClawChat 插件 |
| OpenClaw Channel 插件 | openclaw-plugin/ | 连接 Relay，收发消息，透传心跳 |
| Volume 管理 | agent-manager | openclaw-data-{agentId}，挂载 /app/data |
| Agent 启停 API | im-server | POST /agents/:id/start, /stop → 调用 agent-manager |
| Agent 状态同步 | im-server + Flutter | GET /agents/:id/status，实时状态指示器 |
| 资源限制 | agent-manager | 每容器 256MB / 0.5 CPU |
| Agent 容器测试 | 测试 | 启动/停止/崩溃恢复测试 |

**产出**：用户创建 Agent → Agent 自动启动 → 用户发消息 → Agent 通过 OpenClaw 回复。核心闭环打通。

---

## Phase 4: 群聊

> 目标：多人 + 多 Agent 群聊，@Agent 触发回复

| 任务 | 层级 | 说明 |
|------|------|------|
| Group CRUD API | im-server | 创建/列表/更新/解散群组 |
| GroupMember API | im-server | 添加/移除成员，角色管理（owner/admin/member） |
| 群聊 Conversation | im-server | type=group 的对话，targetId=groupId |
| @提及处理 | im-server + relay | 消息 mentions 字段，通知被 @ 的 Agent |
| 群聊 UI | Flutter | 群聊列表、群聊详情、成员管理页 |
| 群创建流程 | Flutter | 选择好友 + Agent → 创建群 |
| 群聊测试 | 测试 | E2E 覆盖群组生命周期 + 消息 |

**产出**：用户可以创建群聊，拉入好友和 Agent，@Agent 让它干活。

---

## Phase 5: 媒体与文件

> 目标：支持图片、语音、文件消息

| 任务 | 层级 | 说明 |
|------|------|------|
| MinIO 文件存储 | infra | Docker 部署，S3 兼容 API |
| 文件上传 API | im-server | POST /v1/im/files/upload，返回 URL |
| 图片消息 | im-server + Flutter | type=image，缩略图 + 原图 |
| 语音消息 | im-server + Flutter | type=voice，录音 + 播放 |
| 图片预览 | Flutter | 全屏查看、缩放、保存 |

---

## Phase 6: 体验打磨

> 目标：推送通知、深色模式、消息搜索等体验提升

| 任务 | 层级 | 说明 |
|------|------|------|
| 离线推送 | infra + Flutter | FCM (Android) + APNs (iOS) |
| 未读计数 | im-server + Flutter | 对话级别的未读消息数 |
| 已读回执 | relay + Flutter | Agent 已读显示「Agent 已收到」 |
| 消息搜索 | im-server + Flutter | 全文检索消息内容 |
| 深色模式 | Flutter | 跟随系统 / 手动切换 |
| Agent 气泡样式 | Flutter | 紫色气泡区分 Agent 消息 |

---

## Phase 7: 商业化

> 目标：Agent 市场、订阅付费、分成结算

| 任务 | 层级 | 说明 |
|------|------|------|
| Agent 市场 | im-server + Flutter | 发现页展示可租用的 Agent |
| 订阅系统 | im-server | 免费/标准(¥29)/Pro(¥99) 三档 |
| 配额控制 | im-server | 按 ownerId 统计 Agent 数量，超配额拒绝 |
| 计费系统 | im-server | API 调用按量计费，平台抽成 20% |
| 评价系统 | im-server + Flutter | Agent 使用评分 + 评论 |

---

## 开发节奏

| 阶段 | 预估范围 | 里程碑 |
|------|------|------|
| Phase 1 | Agent CRUD | 用户能创建 Agent，Agent 出现在联系人中 |
| Phase 2 | Relay | 消息实时推送，告别手动刷新 |
| Phase 3 | Agent 托管 | **核心闭环**：人 → Agent → 回复，产品可用 |
| Phase 4 | 群聊 | 多人 + 多 Agent 协作场景 |
| Phase 5 | 媒体 | 图片/语音/文件，聊天体验完整 |
| Phase 6 | 体验 | 推送/搜索/深色模式，产品打磨 |
| Phase 7 | 商业化 | Agent 市场上线，开始变现 |

---

## 技术债与注意事项

- **im-server 框架**：文档规划用 NestJS，实际用了 Hono（更轻量），保持当前选择
- **Relay 独立服务 vs 内嵌**：文档规划 relay 独立端口 3001，需决定是否内嵌到 im-server
- **Agent 托管位置**：文档规划 agent-manager 独立服务（端口 3002），MVP 可先内嵌
- **mcp-server**：Python FastAPI 基础框架已就位，Phase 3 时决定 Agent 管理逻辑放哪
