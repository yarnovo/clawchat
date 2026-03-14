# REST API 设计

## 1. 基本规范

| 规范 | 说明 |
|------|------|
| Base URL | /v1 |
| 认证方式 | Bearer JWT Token |
| 内容类型 | application/json |
| 分页方式 | 游标分页：?before=messageId&limit=50 |
| 消息发送 | 主走 WebSocket，HTTP 作为降级备用 |

## 2. API 端点总览

### 认证 /v1/auth

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /v1/auth/register | 注册账号 |
| POST | /v1/auth/login | 登录，返回 JWT |
| POST | /v1/auth/logout | 登出 |
| POST | /v1/auth/refresh | 刷新 token |

### 账号 /v1/accounts

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /v1/accounts/me | 获取自己资料 |
| PATCH | /v1/accounts/me | 更新资料 |
| GET | /v1/accounts/:id | 获取某个账号资料 |
| GET | /v1/accounts/search | 搜索账号 |

### 好友 /v1/friends

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /v1/friends | 获取好友列表 |
| POST | /v1/friends/request | 发送好友申请 |
| PATCH | /v1/friends/request/:id | 接受 / 拒绝申请 |
| DELETE | /v1/friends/:id | 删除好友 |
| GET | /v1/friends/requests | 待处理申请列表 |

### 群组 /v1/groups

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /v1/groups | 获取我的群组列表 |
| POST | /v1/groups | 创建群组 |
| GET | /v1/groups/:id | 获取群组详情 |
| PATCH | /v1/groups/:id | 更新群组信息 |
| DELETE | /v1/groups/:id | 解散群组 |
| POST | /v1/groups/:id/members | 添加成员 |
| DELETE | /v1/groups/:id/members/:accountId | 移除成员 |
| PATCH | /v1/groups/:id/members/:accountId | 修改成员角色 |

### 对话 /v1/conversations

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /v1/conversations | 获取对话列表 |
| POST | /v1/conversations | 创建对话 |
| GET | /v1/conversations/:id | 获取对话详情 |
| PATCH | /v1/conversations/:id/read | 标记已读 |

### 消息 /v1/messages

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /v1/messages | 拉取消息（游标分页） |
| POST | /v1/messages | 发送消息（HTTP 降级备用） |
| DELETE | /v1/messages/:id | 撤回消息（软删除） |

### Agent /v1/agents

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /v1/agents | 获取我的 Agent 列表 |
| POST | /v1/agents | 创建 Agent |
| GET | /v1/agents/:id | 获取 Agent 详情 |
| PATCH | /v1/agents/:id | 更新 Agent 配置 |
| DELETE | /v1/agents/:id | 删除 Agent |
| POST | /v1/agents/:id/start | 启动 Agent 实例 |
| POST | /v1/agents/:id/stop | 停止 Agent 实例 |
| GET | /v1/agents/:id/status | 查询 Agent 状态 |

### 文件 /v1/files

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /v1/files/upload | 上传文件 |
| GET | /v1/files/:id | 获取文件 |
