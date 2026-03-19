//! Worker — 策略 Worker 管理
//!
//! 每个策略一个独立的 tokio task，从 broadcast channel 接收行情，
//! 聚合 K 线，运行策略，过滤信号，通过 mpsc channel 发送给 Order Router。

use tokio::sync::{broadcast, mpsc};
use tracing::{info, warn};

use crate::filter::{FilterResult, SignalFilter};
use crate::strategy::{CandleAggregator, Signal, Strategy};
use crate::types::MarketEvent;

// ── StrategySignal ───────────────────────────────────────────

/// Worker 输出的信号（带策略元数据）
#[derive(Debug, Clone)]
pub struct StrategySignal {
    pub strategy_name: String,
    pub symbol: String,
    pub signal: Signal,
    pub current_price: f64,
    pub atr: Option<f64>,
}

// ── WorkerConfig ─────────────────────────────────────────────

/// 策略 Worker 配置
pub struct WorkerConfig {
    pub strategy_name: String,
    pub symbol: String,
    pub timeframe_ms: u64,
    pub strategy: Box<dyn Strategy + Send>,
    pub filter: SignalFilter,
}

// ── spawn_worker ─────────────────────────────────────────────

/// 启动一个策略 Worker
///
/// Worker 是一个 tokio task：
/// 1. 从 broadcast::Receiver 接收行情
/// 2. CandleAggregator 聚合 K 线
/// 3. strategy.on_candle() 生成信号
/// 4. SignalFilter 过滤
/// 5. 通过 mpsc::Sender 发送 StrategySignal 给 Order Router
pub fn spawn_worker(
    config: WorkerConfig,
    market_rx: broadcast::Receiver<MarketEvent>,
    signal_tx: mpsc::Sender<StrategySignal>,
) -> tokio::task::JoinHandle<()> {
    tokio::spawn(async move {
        worker_loop(config, market_rx, signal_tx).await;
    })
}

/// Worker 主循环
async fn worker_loop(
    mut config: WorkerConfig,
    mut market_rx: broadcast::Receiver<MarketEvent>,
    signal_tx: mpsc::Sender<StrategySignal>,
) {
    let mut aggregator = CandleAggregator::new(config.timeframe_ms);

    info!(
        strategy = %config.strategy_name,
        symbol = %config.symbol,
        timeframe_ms = config.timeframe_ms,
        "worker started"
    );

    loop {
        match market_rx.recv().await {
            Ok(MarketEvent::Tick(tick)) => {
                // 只处理本策略 symbol 的 tick
                if tick.symbol != config.symbol {
                    continue;
                }

                // 聚合 K 线
                if let Some(candle) = aggregator.update(&tick) {
                    // 每根 K 线递减 cooldown
                    config.filter.on_bar();

                    // 策略计算
                    if let Some(signal) = config.strategy.on_candle(&candle) {
                        if signal != Signal::None {
                            // 过滤
                            let filter_result =
                                config.filter.allows(&signal, Some(&candle), None);
                            if filter_result == FilterResult::Pass {
                                let strategy_signal = StrategySignal {
                                    strategy_name: config.strategy_name.clone(),
                                    symbol: config.symbol.clone(),
                                    signal,
                                    current_price: candle.close,
                                    atr: None,
                                };
                                if signal_tx.send(strategy_signal).await.is_err() {
                                    info!(
                                        strategy = %config.strategy_name,
                                        "signal channel closed, worker stopping"
                                    );
                                    return;
                                }
                            } else if let FilterResult::Blocked(reason) = filter_result {
                                info!(
                                    strategy = %config.strategy_name,
                                    %reason,
                                    "signal filtered"
                                );
                            }
                        }
                    }
                }
            }
            Ok(_) => {
                // Depth, Trade, MarkPrice 等其他事件，K 线策略忽略
            }
            Err(broadcast::error::RecvError::Lagged(n)) => {
                warn!(
                    strategy = %config.strategy_name,
                    lagged = n,
                    "worker lagged, skipped messages"
                );
            }
            Err(broadcast::error::RecvError::Closed) => {
                info!(
                    strategy = %config.strategy_name,
                    "market channel closed, worker stopping"
                );
                break;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::filter::TradeDirection;
    use crate::strategy::Candle;
    use crate::types::TickData;

    /// 简单测试策略：每根 K 线都产生 Buy 信号
    struct AlwaysBuyStrategy;

    impl Strategy for AlwaysBuyStrategy {
        fn on_candle(&mut self, _candle: &Candle) -> Option<Signal> {
            Some(Signal::Order(crate::types::OrderRequest {
                symbol: "BTCUSDT".to_string(),
                side: crate::types::Side::Buy,
                order_type: crate::types::OrderType::Market,
                qty: 1.0,
                price: None,
            }))
        }

        fn name(&self) -> &str {
            "AlwaysBuy"
        }
    }

    /// 不产生信号的策略
    struct NeverSignalStrategy;

    impl Strategy for NeverSignalStrategy {
        fn on_candle(&mut self, _candle: &Candle) -> Option<Signal> {
            Some(Signal::None)
        }

        fn name(&self) -> &str {
            "NeverSignal"
        }
    }

    fn make_tick(symbol: &str, price: f64, ts: u64) -> TickData {
        TickData {
            symbol: symbol.to_string(),
            price,
            qty: 1.0,
            timestamp: ts,
            is_buyer_maker: false,
        }
    }

    #[tokio::test]
    async fn worker_produces_signal_on_candle_close() {
        let (market_tx, _) = broadcast::channel::<MarketEvent>(64);
        let (signal_tx, mut signal_rx) = mpsc::channel::<StrategySignal>(64);

        let config = WorkerConfig {
            strategy_name: "test-buy".to_string(),
            symbol: "BTCUSDT".to_string(),
            timeframe_ms: 1000, // 1s K 线
            strategy: Box::new(AlwaysBuyStrategy),
            filter: SignalFilter::new(TradeDirection::Both, 0, 0.0, 0.0, 0.0),
        };

        let market_rx = market_tx.subscribe();
        let handle = spawn_worker(config, market_rx, signal_tx);

        // 发送两个 tick（同一个 K 线区间）
        market_tx
            .send(MarketEvent::Tick(make_tick("BTCUSDT", 100.0, 0)))
            .unwrap();
        market_tx
            .send(MarketEvent::Tick(make_tick("BTCUSDT", 101.0, 500)))
            .unwrap();

        // 发送第三个 tick（新区间，触发旧 K 线收盘）
        market_tx
            .send(MarketEvent::Tick(make_tick("BTCUSDT", 102.0, 1000)))
            .unwrap();

        // 应该收到一个信号
        let sig = tokio::time::timeout(std::time::Duration::from_secs(1), signal_rx.recv())
            .await
            .expect("timeout waiting for signal")
            .expect("channel closed");

        assert_eq!(sig.strategy_name, "test-buy");
        assert_eq!(sig.symbol, "BTCUSDT");
        assert!((sig.current_price - 101.0).abs() < 0.01); // 上一根 K 线的 close

        // 清理
        drop(market_tx);
        let _ = handle.await;
    }

    #[tokio::test]
    async fn worker_ignores_other_symbol_ticks() {
        let (market_tx, _) = broadcast::channel::<MarketEvent>(64);
        let (signal_tx, mut signal_rx) = mpsc::channel::<StrategySignal>(64);

        let config = WorkerConfig {
            strategy_name: "test-btc".to_string(),
            symbol: "BTCUSDT".to_string(),
            timeframe_ms: 1000,
            strategy: Box::new(AlwaysBuyStrategy),
            filter: SignalFilter::new(TradeDirection::Both, 0, 0.0, 0.0, 0.0),
        };

        let market_rx = market_tx.subscribe();
        let handle = spawn_worker(config, market_rx, signal_tx);

        // 发送 ETHUSDT ticks（应该被忽略）
        market_tx
            .send(MarketEvent::Tick(make_tick("ETHUSDT", 3000.0, 0)))
            .unwrap();
        market_tx
            .send(MarketEvent::Tick(make_tick("ETHUSDT", 3001.0, 1000)))
            .unwrap();

        // 不应该收到信号
        let result = tokio::time::timeout(
            std::time::Duration::from_millis(100),
            signal_rx.recv(),
        )
        .await;
        assert!(result.is_err(), "should not receive signal for wrong symbol");

        drop(market_tx);
        let _ = handle.await;
    }

    #[tokio::test]
    async fn worker_handles_broadcast_lag_without_panic() {
        // 用很小的 channel 容量来制造 lag
        let (market_tx, _) = broadcast::channel::<MarketEvent>(2);
        let (signal_tx, _signal_rx) = mpsc::channel::<StrategySignal>(64);

        let config = WorkerConfig {
            strategy_name: "test-lag".to_string(),
            symbol: "BTCUSDT".to_string(),
            timeframe_ms: 1000,
            strategy: Box::new(NeverSignalStrategy),
            filter: SignalFilter::new(TradeDirection::Both, 0, 0.0, 0.0, 0.0),
        };

        let market_rx = market_tx.subscribe();
        let handle = spawn_worker(config, market_rx, signal_tx);

        // 快速发送超过 channel 容量的消息，制造 lag
        for i in 0..10u64 {
            let _ = market_tx.send(MarketEvent::Tick(make_tick("BTCUSDT", 100.0, i * 100)));
        }

        // 给 worker 一点时间处理 lag
        tokio::time::sleep(std::time::Duration::from_millis(50)).await;

        // 关闭 channel，worker 应该优雅退出
        drop(market_tx);
        let result = tokio::time::timeout(std::time::Duration::from_secs(1), handle).await;
        assert!(result.is_ok(), "worker should exit gracefully after lag");
    }

    #[tokio::test]
    async fn worker_stops_on_channel_close() {
        let (market_tx, _) = broadcast::channel::<MarketEvent>(64);
        let (signal_tx, _signal_rx) = mpsc::channel::<StrategySignal>(64);

        let config = WorkerConfig {
            strategy_name: "test-close".to_string(),
            symbol: "BTCUSDT".to_string(),
            timeframe_ms: 1000,
            strategy: Box::new(NeverSignalStrategy),
            filter: SignalFilter::new(TradeDirection::Both, 0, 0.0, 0.0, 0.0),
        };

        let market_rx = market_tx.subscribe();
        let handle = spawn_worker(config, market_rx, signal_tx);

        // 立即关闭 market channel
        drop(market_tx);

        // Worker 应该在合理时间内退出
        let result = tokio::time::timeout(std::time::Duration::from_secs(1), handle).await;
        assert!(result.is_ok(), "worker should stop when channel closes");
    }

    #[tokio::test]
    async fn worker_filter_blocks_signal() {
        let (market_tx, _) = broadcast::channel::<MarketEvent>(64);
        let (signal_tx, mut signal_rx) = mpsc::channel::<StrategySignal>(64);

        // LongOnly filter — AlwaysBuyStrategy 产生 Buy 信号，应该通过
        // 但第一个信号通过后，cooldown=5 会阻塞后续信号
        let config = WorkerConfig {
            strategy_name: "test-filter".to_string(),
            symbol: "BTCUSDT".to_string(),
            timeframe_ms: 1000,
            strategy: Box::new(AlwaysBuyStrategy),
            filter: SignalFilter::new(TradeDirection::Both, 5, 0.0, 0.0, 0.0),
        };

        let market_rx = market_tx.subscribe();
        let handle = spawn_worker(config, market_rx, signal_tx);

        // 第一根 K 线
        market_tx
            .send(MarketEvent::Tick(make_tick("BTCUSDT", 100.0, 0)))
            .unwrap();
        market_tx
            .send(MarketEvent::Tick(make_tick("BTCUSDT", 101.0, 1000)))
            .unwrap();

        // 应收到第一个信号
        let sig = tokio::time::timeout(std::time::Duration::from_secs(1), signal_rx.recv())
            .await
            .expect("timeout")
            .expect("closed");
        assert_eq!(sig.strategy_name, "test-filter");

        // 第二根 K 线（cooldown 应该阻塞）
        market_tx
            .send(MarketEvent::Tick(make_tick("BTCUSDT", 102.0, 2000)))
            .unwrap();

        let result = tokio::time::timeout(
            std::time::Duration::from_millis(100),
            signal_rx.recv(),
        )
        .await;
        assert!(result.is_err(), "second signal should be blocked by cooldown");

        drop(market_tx);
        let _ = handle.await;
    }
}
