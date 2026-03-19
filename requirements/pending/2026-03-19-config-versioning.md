# 配置版本管理与审计追踪

**优先级**: P1
**来源**: 架构调研（5/5 调研员全员标记）

## 问题

### 配置无版本管理
- signal.json / risk.json / trade.json 无 `schema_version` 字段
- 新增字段（如 `capital_mode`、`adaptive`）时，旧配置文件无法自动迁移
- 无法回滚配置（误改后只能手动恢复）
- config_watcher 热加载前不验证配置合法性

### 运维决策无审计
- autopilot 写 trade.json 改变策略状态，没有记录"决策理由"
- ops 命令手动修改配置，无日志记录修改者和原因
- 1 万年运营中，无法追溯某个策略为何被停机、参数为何改变

## 需求

### 1. 配置版本号

所有 JSON 配置文件新增 `version` 字段：
```json
{
  "version": 2,
  "name": "ntrn-trend-v2-5m",
  ...
}
```

### 2. 自动迁移

`shared/src/config_migration.rs`：
- 加载配置时自动检测版本，调用对应迁移函数
- v1 → v2：补全新字段默认值
- 支持向后兼容（可读旧版本）
- 废弃字段保留但日志警告

### 3. 配置备份与回滚

config_watcher 文件变更时：
- 验证新配置格式合法性（加载前先验证）
- 验证通过 → 归档旧版本到 `.history/` 目录
- 验证失败 → 拒绝加载，发告警

```
strategies/{name}/
├── signal.json                        (当前版本)
├── .history/
│   ├── signal.2026-03-19T10-30-00.json.bak
│   └── signal.2026-03-18T15-45-00.json.bak
```

ops 命令支持回滚：
```bash
cargo run -p clawchat-ops -- config-history ntrn-trend-v2-5m
cargo run -p clawchat-ops -- config-rollback ntrn-trend-v2-5m --to 2026-03-18
```

### 4. 审计日志

所有配置变更和运维决策记录到 `records/audit.jsonl`：
```json
{
  "timestamp": "2026-03-19T10:00:00Z",
  "actor": "autopilot",
  "action": "modify_trade_json",
  "strategy": "ntrn-trend-v2-5m",
  "change": {"action": "pause", "reason": "drawdown >= 15%"},
  "result": "success"
}
```

## 涉及文件

- 新增 `shared/src/config_migration.rs` — 版本检测 + 迁移函数
- 新增 `shared/src/audit.rs` — 审计日志写入
- `engine/src/config_watcher.rs` — 增强验证 + 备份
- `autopilot/src/writer.rs` — 写入时记录审计日志
- 新增 `ops/src/cmd/config_history.rs` — 历史查询 + 回滚命令

## 验收标准

- [ ] 所有 JSON 配置带 version 字段
- [ ] 旧版本配置自动迁移到新版本
- [ ] 配置变更时自动备份到 .history/
- [ ] ops config-rollback 可回滚到指定版本
- [ ] 所有变更记录到 audit.jsonl
