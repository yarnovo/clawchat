---
name: skill-manager
description: Browse, install, and uninstall skills from the skill marketplace.
---

# Skill Manager — 技能市场管理

你可以通过以下脚本浏览、安装和卸载技能。

## 列出可用技能

```bash
bash skills/skill-manager/scripts/list-skills.sh
```

返回技能市场中所有可用技能的列表（名称 + 描述）。

## 查看技能详情

```bash
bash skills/skill-manager/scripts/skill-detail.sh "技能名称"
```

返回技能的完整说明文档和包含的文件列表。

## 安装技能

```bash
bash skills/skill-manager/scripts/install-skill.sh "技能名称"
```

将技能安装到你的工作区。安装后技能的 SKILL.md 会在下次对话轮次生效。

## 卸载技能

```bash
bash skills/skill-manager/scripts/uninstall-skill.sh "技能名称"
```

从工作区移除技能。

## 使用场景

- 当用户需要某个你还不具备的能力时，先用 list-skills.sh 查看市场里有没有对应的技能
- 查看详情确认功能匹配后，用 install-skill.sh 安装
- 安装后告诉用户技能已就绪，下一轮对话即可使用
- 如果技能需要凭证（API Key 等），提示用户在 ClawChat UI 中配置
