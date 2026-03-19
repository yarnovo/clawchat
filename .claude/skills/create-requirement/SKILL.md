---
name: create-requirement
description: 创建需求文档到 requirements/ 目录。loop 进程发现能力缺失时调用，或用户说"写需求"时调用。
user-invocable: true
---

# 创建需求文档

往 `requirements/` 写入需求文档。

## 触发场景

- loop 进程发现系统缺少某项能力时自动调用
- 用户说"写需求"、"我要做XX功能"时调用

## 流程

1. 调研现有代码，了解当前系统能力边界
2. 明确需求的背景、目标、验收标准
3. 写入 `requirements/{YYYY-MM-DD}-{功能名}.md`

## 文件格式

```markdown
# {功能名称}

**提出来源**: {loop-discover / loop-evaluate / 用户}
**提出时间**: {ISO datetime}
**优先级**: {高 / 中 / 低}

## 背景
{为什么需要这个功能}

## 目标
{做完后能干什么}

## 现有能力
{当前系统已有的相关能力，涉及哪些文件}

## 需求描述
{具体要做什么}

## 验收标准
- [ ] {标准 1}
- [ ] {标准 2}

## 涉及模块
- {crate / 文件路径}
```

## 注意

- 文件名用英文小写短横线：`2026-03-19-email-notify.md`
- 先搜索 requirements/ 有无类似需求，避免重复
- 需求文档是委托书，写清楚让任何 Agent 都能理解并实现
