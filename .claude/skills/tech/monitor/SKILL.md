---
name: monitor
description: 系统监控 — 检查引擎状态、进程、连接
user-invocable: true
---

# Monitor — 系统监控

## 执行

### 1. 检查进程
```bash
ps aux | grep -E "(hft_engine|clawchat)" | grep -v grep
```

### 2. 检查行情连接
```bash
cd /Users/yarnb/agent-projects/clawchat && make watch
```

### 3. 检查账户状态
```bash
cd /Users/yarnb/agent-projects/clawchat && make account
```

### 4. 检查磁盘/日志
```bash
du -sh /Users/yarnb/agent-projects/clawchat/reports/
ls -lt /Users/yarnb/agent-projects/clawchat/reports/heartbeat/ | head -5
```

### 5. 输出状态摘要
汇总：进程状态 + 行情连接 + 账户余额 + 磁盘使用
