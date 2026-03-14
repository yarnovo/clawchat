---
status: open
created: 2026-03-14 19:30
updated: 2026-03-14 19:30
---
# 需求报告：技能市场 — Agent 技能的发现、安装与展示

## 架构原则

**ClawChat 不自建技能注册表，代理 ClawHub。** ClawHub 已有 13,700+ 社区技能，自建注册表无意义。ClawChat 的职责是：在 ClawHub 和 Agent 容器之间架一座桥，提供 UI + API + 持久化。

**agent-server 是技能管理的唯一入口。** 前端不直接调用 ClawHub API，所有技能操作通过 agent-server 路由，确保权限控制和数据一致性。

**技能列表是 Agent 的公开名片。** 消费者在发现页和聊天页都能看到 Agent 装了什么技能，这是 Agent 价值的直观体现。

## 1. Who（主体 + 场景）

### 使用者

| 角色 | 身份 | 行为 |
|------|------|------|
| Agent 主人（生产者） | 创建并运营 Agent 的用户 | 搜索 ClawHub 技能 → 安装到自己的 Agent → 管理已安装技能 |
| 普通用户（消费者） | 使用 Agent 的用户 | 在发现页/聊天页查看 Agent 装了哪些技能，作为选择 Agent 的参考 |

### 使用场景

- **生产者**：创建 Agent 后，在 Agent 设置页搜索"web-search"、"code-review"等技能，一键安装，Agent 立即获得新能力
- **消费者**：在发现页搜索 Agent 时，看到"该 Agent 拥有 5 个技能：网页搜索、代码审查..."，判断 Agent 是否有用
- **触发频率**：生产者中频（调教阶段密集操作），消费者低频（加好友前看一眼）

## 2. Why（动机）

### 痛点

当前 Agent 只有 system prompt + 模型两个维度的差异化。没有技能系统，Agent 之间的能力区分度低——"翻译 Agent"和"法律 Agent"在能力层面几乎没有区别，都只是换了个提示词。

OpenClaw 自身支持丰富的技能生态（ClawHub 13,700+ 技能），但 ClawChat 完全没有暴露这个能力：
- 主人无法通过 UI 给 Agent 装技能（只能 SSH 进容器手动操作）
- 消费者不知道 Agent 有什么技能（无法判断 Agent 的价值）
- 容器没有 volume 挂载，重启后手动安装的技能丢失

### 做了的价值

- **Agent 差异化**：技能成为 Agent 的核心竞争力，"有网页搜索能力的法律 Agent"比"法律 Agent"有吸引力得多
- **生产者赋能**：零代码给 Agent 添加能力，降低 Agent 调教门槛
- **消费者决策**：技能列表是 Agent 能力的可见化证据，帮助用户选择
- **平台价值**：接入 13,700+ 技能生态，ClawChat 成为技能消费的 GUI 前端

### 不做的代价

- Agent 同质化严重，难以形成差异化竞争
- 生产者门槛高（需要懂 Docker exec + clawhub CLI）
- 消费者无法评估 Agent 能力，发现页沦为"名字列表"
- OpenClaw 的最大卖点（技能生态）在 ClawChat 上完全不可见

## 3. What（能力声明）

### 核心能力

1. **技能搜索**：Agent 主人可以在 ClawChat 内搜索 ClawHub 上的技能（语义搜索 + 分类浏览）
2. **技能安装/卸载**：Agent 主人可以为自己的 Agent 安装或卸载技能，安装后 Agent 立即可用
3. **技能持久化**：已安装的技能跨容器重启不丢失
4. **技能列表记录**：agent-server 记录每个 Agent 安装了哪些技能（slug + version），作为元数据供查询
5. **技能展示（生产者侧）**：Agent 设置页显示已安装技能列表，支持卸载
6. **技能展示（消费者侧）**：发现页的搜索结果中展示 Agent 的技能标签；聊天页可查看 Agent 技能详情

### 不做（Out of Scope）

- 自建技能注册表（直接代理 ClawHub）
- 技能评分/评论系统
- 技能付费/订阅
- 技能创建/发布（用 clawhub CLI）
- 技能版本升级提醒
- NanoClaw / IronClaw 运行时的技能支持（仅限 OpenClaw）

## 4. Acceptance（验收标准）

### 技能搜索（agent-server 代理 ClawHub）

- [ ] `GET /v1/agents/skills/search?q=关键词` 返回 ClawHub 搜索结果（name, slug, description, downloads, version）
- [ ] `GET /v1/agents/skills/trending` 返回 ClawHub 热门技能列表
- [ ] 搜索结果中标记该技能是否已被当前操作的 Agent 安装
- [ ] 无需鉴权（公开数据），但需要 rate limiting

### 技能安装/卸载（agent-server → 容器）

- [ ] `POST /v1/agents/:id/skills` body: `{ slug: "web-search" }` — 为 Agent 安装技能
- [ ] 安装流程：agent-server 通过 container-server 在容器内执行 `clawhub install <slug>`
- [ ] 安装成功后，agent-server 在 AgentSkill 表记录 `{ agentId, slug, version, name, description }`
- [ ] `DELETE /v1/agents/:id/skills/:slug` — 卸载技能
- [ ] 卸载流程：容器内删除技能目录 + agent-server 删除 AgentSkill 记录
- [ ] Agent 必须处于 running 状态才能安装/卸载技能
- [ ] 只有 ownerId 可以操作，非主人返回 403

### 技能持久化

- [ ] OpenClaw 容器创建时挂载 volume：`openclaw-skills-{agentId}:/home/node/.openclaw/skills`
- [ ] 容器重启后已安装的技能仍然可用
- [ ] Agent 删除时，同时清理对应的 skills volume

### 技能列表查询

- [ ] `GET /v1/agents/:id/skills` — 查询 Agent 已安装的技能列表
- [ ] 返回字段：slug, name, description, version, installedAt
- [ ] 主人可查（鉴权），消费者也可查（公开，按 accountId 查询）
- [ ] `GET /v1/agents/skills/by-account/:accountId` — 消费者通过 accountId 查询 Agent 技能（公开，无需鉴权）

### 前端 — Agent 设置页（生产者）

- [ ] Agent 设置页新增"技能"区域，显示已安装技能列表（名称 + 描述 + 卸载按钮）
- [ ] "添加技能"按钮 → 打开技能搜索面板（搜索框 + 热门推荐 + 搜索结果）
- [ ] 搜索结果中显示：名称、描述、下载量、"安装"按钮
- [ ] 已安装的技能在搜索结果中显示"已安装"状态
- [ ] 安装/卸载后即时刷新列表

### 前端 — 发现页（消费者）

- [ ] 搜索结果中的 Agent 类型条目，显示技能标签（最多 3 个，溢出显示"+N"）
- [ ] 点击 Agent 条目可查看完整技能列表

### 数据模型

- [ ] agent-server 新增 `AgentSkill` 表：`id, agentId, slug, name, description, version, installedAt`
- [ ] AgentSkill 与 Agent 为多对一关系，Agent 删除时级联删除

## 5. Constraint（约束）

### 业务约束

- 技能数据来源只能是 ClawHub（不接受用户上传自定义技能文件）
- 安装/卸载操作需要 Agent 处于 running 状态（需要在容器内执行命令）
- 仅 OpenClaw 运行时支持技能市场（NanoClaw/IronClaw 不支持 clawhub CLI）

### 技术约束

- agent-server → 容器内执行命令的链路：agent-server → container-server `POST /v1/containers/:id/exec`（需要 container-server 新增 exec 端点）
- ClawHub API 有 rate limit（匿名 120/min），agent-server 需做缓存或使用认证 token 提升到 600/min
- 技能 volume 挂载需要修改 openclaw-server 的 `createInstance` 逻辑，添加 volume 参数
- AgentSkill 表存在和容器内实际技能不一致的风险（容器内手动操作），以 agent-server 记录为准（UI 入口唯一）

### 不可打破的现有行为

- 现有 Agent 创建/启动/停止/删除流程不变
- 现有 CreateInstanceOpts 接口可扩展但不改已有字段
- 发现页搜索功能不变（技能信息是增量展示）
- Agent 无技能时的行为与当前完全一致

## 参考

### 改动分层

| 层 | 服务 | 改动 |
|----|------|------|
| DB | agent-server | 新增 `AgentSkill` 表 |
| API | agent-server | 新增技能搜索/安装/卸载/查询 4 组端点 |
| API | agent-server | 新增公开端点：按 accountId 查 Agent 技能 |
| API | container-server | 新增 `POST /v1/containers/:id/exec` 端点 |
| 容器 | openclaw-server | createInstance 添加 skills volume 挂载 |
| 容器 | openclaw-server | removeInstance 清理 skills volume |
| Flutter | 前端 | Agent 设置页 — 技能管理区域 |
| Flutter | 前端 | 技能搜索面板（复用 ClawHub 数据） |
| Flutter | 前端 | 发现页搜索结果 — 技能标签展示 |
| Flutter | API Client | 新增 skills 相关 API 调用方法 |

### 数据流

```
【生产者安装技能】

Agent 主人              agent-server           container-server        Agent 容器
  │                       │                       │                    │
  ├─ POST /agents/:id/    │                       │                    │
  │  skills {slug}        │                       │                    │
  │                       ├─ POST /containers/    │                    │
  │                       │  :cid/exec            │                    │
  │                       │  {cmd: "clawhub       │                    │
  │                       │   install <slug>"}    ├─ docker exec ─────→│
  │                       │                       │                    │ clawhub install
  │                       │                       │◄────── exit 0 ─────┤
  │                       │◄── {ok, version} ─────┤                    │
  │                       │                       │                    │
  │                       ├─ INSERT AgentSkill    │                    │
  │◄── 200 {skill} ──────┤                       │                    │

【消费者查看技能】

消费者                  agent-server
  │                       │
  ├─ GET /agents/skills/  │
  │  by-account/:aid      │
  │                       ├─ 查 Agent 表 (by accountId)
  │                       ├─ 查 AgentSkill 表 (by agentId)
  │◄── [{slug, name, ...}]│

【技能搜索（代理 ClawHub）】

Agent 主人              agent-server           ClawHub API
  │                       │                       │
  ├─ GET /agents/skills/  │                       │
  │  search?q=web         │                       │
  │                       ├─ GET /api/v1/search ──→│
  │                       │  ?q=web                │
  │                       │◄── [{slug, name, ...}]─┤
  │◄── [{..., installed}]─┤  (merge installed flag)│
```

### 关键文件路径

| 文件 | 需要改动 |
|------|---------|
| `agent-server/prisma/schema.prisma` | 新增 AgentSkill model |
| `agent-server/src/app.ts` | 新增技能相关路由 |
| `openclaw-server/src/instance.ts` | createInstance 添加 volume |
| `container-server/src/docker.ts` | 新增 exec 接口 |
| `app/lib/services/api_client.dart` | 新增 skills API 方法 |
| `app/lib/pages/profile/agent_settings_page.dart` | 新增技能管理区域 |
| `app/lib/pages/discover/discover_page.dart` | 搜索结果增加技能标签 |

## 过程备注

- [架构决策] 选择代理 ClawHub 而非自建：ClawHub 已有 13,700+ 技能，自建注册表冷启动问题无解
- [架构决策] 技能安装走 container exec 而非 volume 预填充：因为 `clawhub install` 会自动处理依赖安装、版本锁定、.clawhub/origin.json 写入等，比手动拷贝文件更可靠
- [架构决策] AgentSkill 表作为 source of truth（而非容器内文件系统）：容器是可重建的，DB 记录更可靠；容器重启时 volume 保留文件，DB 和文件系统一致
- [技术风险] container-server 新增 exec 端点有安全风险（命令注入），需限制只允许 `clawhub` 命令前缀
- [技术风险] ClawHub API rate limit（匿名 120/min）在多用户同时操作时可能不够，考虑 agent-server 侧加缓存（热门技能列表缓存 5min）
