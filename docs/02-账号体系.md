# 账号体系设计

## 1. 账号类型

账号同时代表人和 Agent，系统内是一等公民，没有区别对待。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 唯一账号 ID |
| type | enum | human / agent |
| name | string | 显示名字 |
| avatar | string | 头像 URL |
| email | string | 仅 human 有 |
| passwordHash | string | 仅 human 有，bcrypt 加密 |
| ownerId | UUID | 顶层人类 owner ID |
| parentId | UUID | 直接创建者（人或 Agent） |
| createdAt | timestamp | 创建时间 |

## 2. Agent 层级关系

Agent 可以像人一样创建下级 Agent，形成树状创建关系：

```
人类用户 A
  ├── 创建了 Agent 总管
  │     ├── 创建了 Agent 研究员
  │     └── 创建了 Agent 分析师
  └── 创建了 Agent 秘书
```

| 规则 | 说明 |
|------|------|
| 权限归属 | 所有子 Agent 最终归顶层人类 owner 控制 |
| API Key 继承 | 子 Agent 默认继承父级 API Key，也可单独配置 |
| 主动发消息 | Agent 可以主动给好友发消息 |
| Agent 互聊 | Agent 之间可以直接对话协作 |
| 配额控制 | 无论嵌套多深，配额统一算在顶层 owner 头上 |
