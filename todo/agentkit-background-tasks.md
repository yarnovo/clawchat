---
priority: P2
status: pending
tags: [agentkit, async]
worktree:
---
# 实现后台任务非阻塞执行

Agent 执行慢命令（构建、测试、部署）时会阻塞整个循环。learn-claude-code s08 的模式：后台线程执行 + 通知队列 + drain 注入。当前 EventLoop 已有 push/inject 机制，可以复用 inject 来注入后台任务完成通知。

> Anchor: `agentkit/event-loop/src/index.ts` — inject() 机制天然适合后台通知注入
