---
name: claw-forge
description: >
  OpenClaw 技能锻造炉 — 完整的技能生产→测试→宣传→上架闭环。
  Use when asked to: create an OpenClaw skill, test a skill, generate a promo video
  for a skill, publish a skill to ClawHub, or do the full forge pipeline.
  Triggers: "造个技能", "创建技能", "forge skill", "做个宣传片",
  "上架技能", "发布技能", "测试技能", "forge", "claw-forge".
  Sub-commands: create, test, promote, publish, forge (full pipeline).
---

# Claw Forge — OpenClaw 技能锻造炉

## Overview

Claw Forge 是一个端到端的 OpenClaw 技能生产线，覆盖从创建到上架的完整流程。支持 5 个子命令，可单独执行或串联为全自动 forge 流水线。

## Sub-commands

### create — 生产 OpenClaw 技能

输入：一句话需求描述

```bash
python3 {baseDir}/scripts/create.py --name <skill-name> --description "<desc>" --output ./output/
```

内部流程：
1. 调用 OpenClaw 的 `init_skill.py` 生成骨架目录
2. 用 LLM 填充 SKILL.md 和 scripts
3. 输出 `output/{skill-name}/` 完整技能目录

### test — 测试技能

输入：技能目录路径

```bash
python3 {baseDir}/scripts/test.py --skill-dir <path>
```

测试分层：
- **L1** 静态检查：SKILL.md 存在、frontmatter 合法、name/description 有效
- **L2** 脚本语法：scripts/ 下所有 .py 文件通过 py_compile 检查
- **L3** Promptfoo 评估（如果配置了 promptfooconfig.yaml）

输出：测试报告 + 总分

### promote — 生成宣传视频

输入：技能目录路径（读取 SKILL.md 获取 name/description）

```bash
python3 {baseDir}/scripts/promote.py --skill-dir <path> --output ./output/
```

Pipeline（3 步）：
1. **Seed-2.0-pro** — 根据技能描述生成创意方案（tagline、首帧提示词、视频提示词）
2. **Seedream** — 根据首帧提示词生成 1920x1080 首帧图片
3. **Seedance** — 首帧 + 视频提示词生成 5 秒宣传视频

环境变量：`ARK_API_KEY`（火山引擎 Ark API Key）

输出：`promo.mp4`

### publish — 上架 ClawHub

输入：技能目录路径

```bash
python3 {baseDir}/scripts/publish.py --skill-dir <path>
```

内部流程：
1. `quick_validate.py` 验证技能结构
2. `package_skill.py` 打包为 `.skill` 文件
3. `clawhub publish` 上传到 ClawHub（如果 CLI 可用）

输出：ClawHub URL

### forge — 全自动闭环

输入：一句话需求描述

按顺序执行完整流水线：

```
create → test → promote → publish
```

输出：技能目录 + 测试报告 + promo.mp4 + ClawHub URL

任何步骤失败会中止流水线并报告错误。

### forge-cycle — 自动循环（配合 /loop 使用）

每次调用执行一轮：取下一个 idea → forge → 记录结果。

```bash
python3 {baseDir}/scripts/forge-cycle.py
```

配合 `/loop` 实现全自动：
```
/loop 30m python3 {baseDir}/scripts/forge-cycle.py
```

数据文件：
- `ideas.jsonl` — 待造技能列表（每行一个 JSON）
- `history.jsonl` — 执行历史记录

添加新 idea：直接往 ideas.jsonl 追加一行 JSON 即可。

## Resources

### scripts/

| 脚本 | 用途 |
|------|------|
| `create.py` | 创建技能骨架 |
| `test.py` | L1/L2 测试 |
| `promote.py` | 3 步宣传视频生成 |
| `publish.py` | 验证 + 打包 + 上架 |
| `poll_task.py` | 火山引擎异步任务轮询器 |

### references/

| 文件 | 用途 |
|------|------|
| `seedance-prompts.md` | Seedance 视频提示词指南 |
| `skill-quality-rubric.md` | 技能质量评估标准（8 大类别） |
