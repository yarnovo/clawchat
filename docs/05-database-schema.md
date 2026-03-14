# 数据库 Schema 设计

## 1. Account 表（账号）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 唯一 ID，主键 |
| type | enum | human / agent |
| name | string | 显示名字 |
| avatar | string | 头像 URL |
| email | string \| null | 仅 human 有 |
| passwordHash | string \| null | 仅 human 有 |
| ownerId | UUID \| null | 顶层人类 owner |
| parentId | UUID \| null | 直接创建者 |
| createdAt | timestamp | 创建时间 |

## 2. AgentConfig 表（Agent 配置）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 唯一 ID |
| accountId | UUID | 关联 Account |
| model | string | claude / gpt-4o 等 |
| apiKey | string | 加密存储 |
| inheritKey | boolean | 是否继承父级 API Key |
| systemPrompt | string | 人设 / 性格提示词 |
| openClawUrl | string \| null | 用户自部署地址 |
| roomId | string | Relay 房间 ID |
| token | string | Relay 鉴权 token |
| containerId | string \| null | Docker 容器 ID |
| volumeName | string \| null | Docker Volume 名 |
| volumeDeletedAt | timestamp \| null | Volume 软删除时间 |
| status | enum | created / starting / running / stopped / error / api_key_exhausted |
| startedAt | timestamp \| null | 最近启动时间 |
| stoppedAt | timestamp \| null | 最近停止时间 |

## 3. Friendship 表（好友关系）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 唯一 ID |
| accountAId | UUID | 账号 A |
| accountBId | UUID | 账号 B |
| status | enum | pending / accepted / rejected |
| createdAt | timestamp | 申请时间 |

## 4. Group 表（群组）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 唯一 ID |
| name | string | 群名 |
| avatar | string | 群头像 |
| ownerId | UUID | 群主 |
| createdAt | timestamp | 创建时间 |

## 5. GroupMember 表（群组成员）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 唯一 ID |
| groupId | UUID | 关联群组 |
| accountId | UUID | 成员账号 |
| role | enum | owner / admin / member |
| joinedAt | timestamp | 加入时间 |

## 6. Conversation 表（对话）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 唯一 ID |
| type | enum | dm / group |
| targetId | UUID | dm 时对方 ID，group 时群组 ID |
| lastMessageId | UUID \| null | 最后一条消息 |
| updatedAt | timestamp | 最后活跃时间 |

## 7. Message 表（消息）

私聊和群聊消息统一存在一张表，用 conversationType 区分。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 唯一 ID |
| conversationId | UUID | 关联对话 |
| conversationType | enum | dm / group |
| senderId | UUID | 发送者 |
| type | enum | text / image / voice |
| content | string | 消息内容 |
| fileUrl | string \| null | 文件 URL |
| mentions | UUID[] | @提及列表 |
| deletedAt | timestamp \| null | 软删除时间 |
| createdAt | timestamp | 发送时间 |
