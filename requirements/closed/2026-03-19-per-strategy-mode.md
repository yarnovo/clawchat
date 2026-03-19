# Per-Strategy Mode — 每策略独立 dry-run/live 控制

**提出来源**: 架构讨论
**优先级**: 高

## 背景
当前 `--dry-run` 是引擎全局 flag，所有策略要么都不交易要么都交易。新策略应该先 dry-run 观察再切 live。

## 需求

### signal.json 新增 mode 字段
```json
{
  "mode": "dry-run",   // "dry-run" | "live"
  ...
}
```
- 新策略上线默认 `mode=dry-run`
- 引擎启动时 `--dry-run` flag 作为全局 override（强制所有策略 dry-run）
- 无 `--dry-run` flag 时，每个策略按自己的 mode 执行

### 引擎改造
- execute_signal() 检查策略的 mode
- mode=dry-run → 记录信号到日志，不下单
- mode=live → 正常下单
- mode 支持热更新（改 signal.json 即时生效）

### Agent 工作流
- 新策略上线 → mode=dry-run
- analyst 评估 dry-run 数据（信号质量、胜率方向、频率）
- 表现达标 → analyst 建议切 live → team-lead 确认 → 改 signal.json mode=live
- 引擎热更新，该策略开始真实交易

### evaluate skill 更新
- 评估时区分 dry-run 和 live 策略
- dry-run 策略跑满 N 天且表现达标 → 建议切 live

## 验收标准
- [ ] signal.json 支持 mode 字段
- [ ] 引擎按 per-strategy mode 决定是否下单
- [ ] 热更新 mode 不需要重启
- [ ] --dry-run 全局 flag 仍然生效（override）
- [ ] 新策略上线默认 dry-run

## 涉及模块
- engine/src/main.rs — execute_signal 逻辑
- shared/src/strategy.rs — StrategyFile 加 mode 字段
- .claude/skills/evaluate/SKILL.md — 评估流程更新
- .claude/skills/team/SKILL.md — analyst 工作流更新
