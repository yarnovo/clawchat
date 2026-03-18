# ClawChat 量化基金

CLI 工具：`cd cli && uv run clawchat --help` 查看所有命令。

策略配置格式规范见 [engine/SCHEMA.md](engine/SCHEMA.md)（strategy.json + trade.json + risk.json）。

## 规则

- **配置/标准只在一处定义，其他地方引用，不重复写。** 准入标准源头：`cli/src/clawchat/criteria.py` + `engine/SCHEMA.md`
- **TODO.md 只有 team-lead 维护**，成员不能修改
- **git commit 只有 team-lead 做**，成员完成后汇报等验收
- **策略 status 只有 team-lead 能改为 approved**，成员产出写 `status=pending`
- **回测数据必须真实可复现**，team-lead 会亲自验证
- **需要全团队看到的规则写在这里（CLAUDE.md）**，不要散落在其他文件
