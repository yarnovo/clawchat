//! 从 clawchat-shared 重新导出引擎类型
//! autopilot 不再定义自己的类型，统一使用 shared crate

// ── state.json（引擎写，autopilot 读）──────────────────────────
pub use clawchat_shared::state::{EngineState, TradeStats};

// ── signal.json（autopilot 读写 position_size / status）──────
#[allow(unused_imports)]
pub use clawchat_shared::strategy::BacktestData;
pub use clawchat_shared::strategy::StrategyFile;

// ── trade.json（autopilot 写，引擎读）──────────────────────────
pub use clawchat_shared::trade::TradeOverride;

// ── risk.json（autopilot 读写 trailing_stop）───────────────────
/// Read-only view of risk.json (for trailing_stop)
pub use clawchat_shared::risk::RiskConfig as RiskFile;
