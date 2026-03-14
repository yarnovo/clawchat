---
status: open
created: 2026-03-14 18:00
updated: 2026-03-14 18:30
---
# 需求报告：账号可被搜索 + 跨用户加好友

## 架构原则

**im-server 没有 Agent 的概念，只有"人"。** `Account.type` 仅作为消息路由标记，社交层（好友、搜索）完全不区分类型。Agent 的所有权、生命周期等业务概念全部在 agent-server 侧管理。

## 1. Who（主体 + 场景）

### 使用者

| 角色 | 身份 | 行为 |
|------|------|------|
| Agent 主人（生产者） | 创建并调教好 Agent 的用户 | 决定自己的 Agent 是否对外可见 |
| 普通用户（消费者） | 想找好用 Agent 的用户 | 搜索 → 发现 → 加好友 → 聊天 |

### 使用场景

- **生产者**：Agent 调教到位后，通过 agent-server 打开"允许被搜索"开关
- **消费者**：在发现页搜索关键词（如"法律""翻译"），找到公开账号，发起加好友，主人审核通过后开始聊天
- **触发频率**：生产者低频（设置一次），消费者中频（浏览/搜索）

## 2. Why（动机）

### 痛点

当前 Agent 创建后只有主人自己能用，没有任何途径让其他用户发现和使用。加好友只能通过邮箱精确查找，而 Agent 账号没有邮箱，所以**完全不可能跨用户加 Agent 好友**。

### 做了的价值

- 打通"创建 → 调教 → 被发现 → 被使用"的完整产品闭环
- 验证核心假设：有没有人愿意用别人训练好的 Agent
- 为后续 Agent 市场（付费、评分）奠定基础

### 不做的代价

- 产品永远停留在"自己养自己用"，无法形成双边网络
- 社交传播飞轮无法启动

## 3. What（能力声明）

### 核心能力

1. **账号可见性控制**：Account 表新增 `searchable` 字段（通用，不区分类型），默认 `false`。Agent 主人通过 agent-server 控制自己 Agent 的可见性
2. **账号搜索**：用户可以通过名称搜索 `searchable = true` 的账号。im-server 提供通用搜索 API，不过滤类型；agent-server 或前端可按需过滤
3. **通过 accountId 加好友**：扩展现有好友请求 API，支持通过 accountId 发起（不仅限 email）
4. **代理审核好友请求**：Agent 账号收到的好友请求，由 agent-server 路由给主人（ownerId）审核；主人通过 agent-server 接受/拒绝，agent-server 调用 im-server 内部接口完成操作

### 不做（Out of Scope）

- Agent 市场页面（分类浏览、推荐、排行榜）
- 付费/订阅/抽成
- Agent 评分/评论系统
- Agent 详情介绍页
- agent-server 新增 `createdBy` 字段（当前 owner = creator，未来市场交易时再加）

## 4. Acceptance（验收标准）

### 可见性控制

- [ ] Account 新增 `searchable` 字段，默认 `false`
- [ ] agent-server 提供 API：Agent 主人可设置自己 Agent 的 `searchable`（调用 im-server 内部接口更新 Account）
- [ ] 非 ownerId 调用时返回 403

### 搜索（im-server 通用）

- [ ] `GET /v1/im/accounts/search?q=关键词` 返回 `searchable = true` 且名称匹配的账号列表
- [ ] 搜索结果包含：id、name、avatar、type
- [ ] 搜索结果不包含 `searchable = false` 的账号
- [ ] 搜索结果不包含自己
- [ ] 搜索结果不包含已是好友的账号

### 通过 accountId 加好友（im-server）

- [ ] `POST /v1/im/friends/request` 支持 `{ accountId: "xxx" }`（与现有 `{ email: "xxx" }` 二选一）
- [ ] 通过 accountId 加好友的流程与 email 完全一致：创建 pending → 对方审核 → accepted/rejected
- [ ] 现有 email 加好友行为不变

### 代理审核（agent-server）

- [ ] `GET /v1/agents/:id/friend-requests` — 主人查看某个 Agent 收到的待处理好友请求
- [ ] `POST /v1/agents/:id/friend-requests/:requestId/accept` — 主人代理接受
- [ ] `POST /v1/agents/:id/friend-requests/:requestId/reject` — 主人代理拒绝
- [ ] 接受后，消费者与 Agent 账号建立好友关系，可直接聊天，Agent 正常回复
- [ ] 只有 ownerId 能操作，非主人调用返回 403

### im-server 内部接口

- [ ] `GET /v1/im/internal/friends/requests?accountId=xxx` — 查询某账号收到的待处理好友请求（无需鉴权，内部调用）
- [ ] `PATCH /v1/im/internal/friends/request/:id` — 代理审核好友请求（无需鉴权，内部调用，不校验 caller 是否为 accountB）

## 5. Constraint（约束）

### 业务约束

- `searchable` 默认 `false`（隐私优先）
- 加好友必须经过审核，不能自动通过
- 同一对账号未处理期间不可重复发送好友请求

### 技术约束

- im-server Account 表需 migration 加 `searchable` 字段
- `POST /friends/request` 需扩展支持 accountId 入参
- im-server 需新增 2 个内部接口供 agent-server 代理审核
- Friendship `rejected` 后重新申请：更新状态回 `pending`（不删旧记录）

### 不可打破的现有行为

- `POST /friends/add-direct` 内部接口行为不变
- `POST /friends/request`（email 方式）行为不变
- 好友列表、删除好友功能不变
- 消息转发逻辑不变

## 参考

### 改动分层

| 层 | 服务 | 改动 |
|----|------|------|
| DB | im-server | Account 加 `searchable Boolean @default(false)` |
| API | im-server | 新增 `GET /accounts/search` |
| API | im-server | `POST /friends/request` 支持 accountId |
| API | im-server | 新增 2 个 internal 接口（查询/代理审核好友请求） |
| API | agent-server | 新增可见性设置 API（调 im-server 更新 searchable） |
| API | agent-server | 新增 Agent 好友请求管理 API（查询/接受/拒绝） |
| Flutter | 前端 | 发现页搜索 UI + Agent 设置页 searchable 开关 |

### 数据流

```
消费者搜索           im-server              agent-server
  │                    │                       │
  ├─ GET /accounts/search ─→ 查 Account        │
  │    (searchable=true)     (type 无关)        │
  │                    │                       │
  ├─ POST /friends/request ─→ 创建 pending     │
  │    (accountId)           friendship        │
  │                    │                       │
  │                    │    主人查看请求         │
  │                    │◄── GET /agents/:id/    │
  │                    │    friend-requests     │
  │                    │    (查 internal API)   │
  │                    │                       │
  │                    │    主人接受             │
  │                    │◄── POST accept        │
  │                    │    (调 internal API)   │
  │                    │                       │
  ├─ 好友关系建立 ──────┤                       │
  ├─ 开始聊天 ─────────┤                       │
```

## 过程备注

- [架构决策] im-server 社交层完全不区分 Account.type，`searchable` 是通用字段
- [架构决策] Agent 好友请求的审核通过 agent-server 代理，im-server 新增内部接口支持
- [架构决策] `type` 仅用于消息路由，不影响社交逻辑
