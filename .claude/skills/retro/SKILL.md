---
name: retro
description: 团队经验复盘 — 收集经验沉淀、记录笔记、消化解决方案
user-invocable: true
---

# 团队经验复盘

定时向所有团队成员收集经验教训，记录到 notes/ 目录，消化成改进方案。

## 用法

- `/retro` — 启动定时复盘

## 执行

```
/loop 1h 团队复盘
```

## 复盘工作流

每次触发时：

### Step 1: 向团队收集经验

向所有成员发送 SendMessage 询问：
- **analyst**: 选币判断中哪些对了哪些错了？有什么新发现？
- **trader-btc/trader-eth**: 策略运行中遇到什么问题？参数调整效果如何？
- **risk**: 风控有哪些盲区？哪些预警有效哪些是噪音？
- **desk**: 资金管理有什么经验？下单金额怎么定更合理？

### Step 2: 汇总记录

收集到回复后，写入 `notes/YYYY-MM-DD-retro.md`：

```markdown
# 团队复盘 YYYY-MM-DD HH:MM

## 经验教训
- [analyst] xxx
- [trader] xxx
- [risk] xxx
- [desk] xxx

## 问题和根因
1. 问题描述 → 根因分析

## 改进方案
1. 方案描述 → 预期效果

## 行动项
- [ ] 待执行的改进
```

### Step 3: 消化成行动

把复盘中的改进方案转化为：
- 更新 scripts/ 中的代码
- 更新 skill 提示词
- 更新 data/strategies.json 参数
- 创建 issue 跟踪
