---
name: build
description: 编译部署 Rust 高频交易引擎
user-invocable: true
---

# Build — 编译部署引擎

## 执行

### 编译
```bash
cd /Users/yarnb/agent-projects/clawchat && make build
```

### 运行引擎
```bash
cd /Users/yarnb/agent-projects/clawchat && make hft
```

### 检查结果
- 编译成功：报告 binary 大小和编译时间
- 编译失败：读取错误信息，修复代码，重新编译
- 运行测试：`cd engine && cargo test`
