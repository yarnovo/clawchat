# Agent 容器托管方案

## 1. 方案选型

| 维度 | 方案 |
|------|------|
| 容器方案 | 每个 Agent 一个 Docker 容器（完全隔离） |
| 调度工具 | dockerode（Node.js Docker SDK） |
| 镜像 | clawchat/openclaw（自维护，基于官方镜像预装插件） |
| 容器命名 | openclaw-{agentId} |
| 网络 | 加入 clawchat-net 内网，不暴露外网端口 |
| 资源限制 | 每容器 256MB 内存 / 0.5 CPU |

## 2. Agent 配额制

配额统一算在顶层人类 owner 头上：

| 订阅版本 | 名下 Agent 总配额 |
|------|------|
| 免费版 | 1 个 |
| 标准版（¥29/月） | 5 个 |
| Pro 版（¥99/月） | 20 个 |

> 创建检查：找到顶层 ownerId → 查询该 owner 名下所有 Agent 数量 → 超过配额拒绝。

## 3. Agent Volume 持久化

| 持久化数据 | 重要性 | 说明 |
|------|------|------|
| 对话历史记录 | 高 | Agent 和用户的完整聊天记录 |
| 记忆（Memory） | 高 | Agent 记住的用户偏好、长期上下文 |
| 技能（Skills） | 高 | 安装的技能包和工具 |
| 插件配置 | 高 | ClawChat 插件的连接信息 |
| 工作流配置 | 中 | 用户自定义的自动化工作流 |
| 知识库 | 中 | RAG 向量数据 |

Volume 命名：`openclaw-data-{agentId}`，挂载路径：`/app/data`

## 4. Volume 生命周期

| 操作 | 容器 | Volume | 说明 |
|------|------|------|------|
| 创建 Agent | 创建 + 启动 | 同时创建 | 容器挂载专属 Volume |
| 停止 Agent | 停止 | 保留 | 数据完整保留 |
| 重启 Agent | 重建 | 挂载同一个 | 数据完全恢复 |
| 删除 Agent | 立刻删除 | 软删除 30 天 | 30 天内可恢复 |
| 恢复 Agent | 重新创建 | 重新挂载 | 从 OSS 备份恢复 |

## 5. 容器生命周期状态机

| 状态 | 触发时机 | 下一状态 |
|------|------|------|
| created | 用户创建 Agent | starting |
| starting | agent-manager 调用 Docker API | running / error |
| running | 容器启动成功，已连接 Relay | stopped / error |
| stopped | 用户手动暂停 | running（重新启动） |
| error | 容器崩溃 / 启动失败 | starting（重试）/ 人工介入 |
| api_key_exhausted | API Key 余额不足 | running（充值后） |

## 6. 容器网络设计

```
clawchat-net（Docker 内网）
  ├── im-server       → 访问 postgres、redis
  ├── relay           → 被 Agent 容器连接
  ├── agent-manager   → 管理所有 Agent 容器
  └── openclaw-xxx    → 只需连接 relay，不暴露外网
```

## 7. 资源容量规划

| 资源 | 每容器 | 100个容器 | 服务器上限（8核32GB） |
|------|------|------|------|
| 内存 | ~100MB / 256MB 上限 | ~10GB | 安全跑 100 个 |
| CPU | 空闲约 0% | 几乎 0 | 不是瓶颈 |
| 磁盘 | ~500MB | ~50GB | 需要数据盘扩容 |

## 8. 扩容策略

| 阶段 | 方案 |
|------|------|
| MVP（< 100 Agent） | 单台 8核32GB ECS |
| 成长期（100~300） | 新增第二台 ECS |
| 规模化（300+） | Docker Swarm 或 K8s |
