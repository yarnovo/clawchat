---
name: create-issue
description: 创建问题上报到 issues/ 目录。loop 进程发现问题时调用，或用户手动说"记个 issue"。
user-invocable: true
---

# 创建 Issue

往 `issues/` 写入问题记录。

## 触发场景

- loop 进程（patrol/health-check/evaluate）发现异常时自动调用
- 用户说"记个 issue"、"这有个问题"时调用

## 流程

1. 分析问题（如果是代码问题，搜索相关文件定位）
2. 写入 `issues/open/{YYYY-MM-DD}-{简述}.md`

## 文件格式

```markdown
# {问题简述}

**发现来源**: {loop-patrol / loop-health-check / loop-evaluate / 用户上报}
**发现时间**: {ISO datetime}
**严重程度**: {高 / 中 / 低}

## 现象
{具体发生了什么}

## 上下文
{发现时的数据、日志片段、指标数值}

## 涉及文件
- {file_path}

## 建议处理方向
{怎么修 / 需要关注什么}
```

## 注意

- 文件名用英文小写短横线：`2026-03-19-ntrn-slippage-high.md`
- 不要重复创建同一问题（先检查 issues/ 有无类似记录）
- issues/ 是现场记录，不是待办清单
