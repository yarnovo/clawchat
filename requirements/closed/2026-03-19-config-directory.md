# config/ 目录 — 引擎配置统一管理

**提出来源**: 架构讨论
**优先级**: 高

## 背景
symbols.json 和 schedule.json 散落在不同位置，应统一到 config/ 目录。config/ 是 agent 写、引擎读的配置层。

## 需求

### 目录结构
```
config/
├── symbols.json      ← 币种注册表（agent 写，data-engine/discovery 读）
├── schedule.json     ← 运维级调度（心跳读）
```

### 改动
1. 创建 config/ 目录
2. 搬 accounts/binance-main/symbols.json → config/symbols.json
3. 搬根目录 schedule.json → config/schedule.json
4. shared/src/paths.rs 新增 config_dir()、symbols_json()、schedule_json()
5. 所有引用路径更新（data-engine、ops、discovery）
6. CLAUDE.md / ARCHITECTURE.md 更新

### 不动的
- accounts/binance-main/schedule.json 保留（业务级调度）
- accounts/ 下的策略配置不动

## 验收标准
- [ ] config/ 目录存在且包含 symbols.json + schedule.json
- [ ] 所有引擎从 config/ 读取
- [ ] cargo build + test 通过
