# Config Watcher 不检测新策略目录

**发现来源**: team-lead 上线新策略后
**严重程度**: 中

## 现象
新策略目录搬到 accounts/.../strategies/ 后，引擎没有自动加载。需要重启引擎。

## 根因
Config Watcher 只监听已有策略的文件变化，不监听 strategies/ 目录级别的新建/删除事件。

## 建议修复
Config Watcher 加一个目录级 watcher，检测 strategies/ 下新目录创建时自动：
1. 读 signal.json，检查 status=approved
2. 创建新的 Worker + EngineRiskGuard
3. 加入 Ledger

## 涉及文件
- engine/src/main.rs — Config Watcher 逻辑

## 已解决
Config Watcher 现在检测 signal.json 的 Create 事件，自动加载同 symbol 的新策略。全新 symbol 仍需重启（WS 连接限制）。
