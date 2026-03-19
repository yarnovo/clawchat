use crate::evaluator::{backtest, BacktestConfig};
use crate::generator::StrategyType;
use clawchat_shared::candle::Candle;
use clawchat_shared::criteria::{passes, BacktestMetrics};
use std::collections::HashMap;

/// 单个候选策略的完整结果
#[derive(Debug, Clone)]
pub struct CandidateResult {
    pub strategy_type: String,
    pub symbol: String,
    pub timeframe: String,
    pub params: HashMap<String, f64>,
    pub train_metrics: BacktestMetrics,
    pub validation_metrics: Option<BacktestMetrics>,
    pub stability_score: f64,
}

/// 筛选管道：准入 → 样本外验证 → 参数稳定性 → 排序 → 去重 → Top-N
pub fn select(
    candidates: &[(HashMap<String, f64>, Option<BacktestMetrics>)],
    candles: &[Candle],
    strategy_type: &str,
    symbol: &str,
    timeframe: &str,
    config: &BacktestConfig,
    days: u32,
) -> Vec<CandidateResult> {
    // Step 1: 准入标准过滤 — 只保留有 metrics 且通过 passes() 的候选
    let passing: Vec<(&HashMap<String, f64>, &BacktestMetrics)> = candidates
        .iter()
        .filter_map(|(params, metrics_opt)| {
            let m = metrics_opt.as_ref()?;
            if passes(m, days) {
                Some((params, m))
            } else {
                None
            }
        })
        .collect();

    if passing.is_empty() {
        return Vec::new();
    }

    // Step 2: 样本外验证 — 在后 30% candles 上重新回测
    let split_idx = (candles.len() as f64 * 0.7) as usize;
    let validation_candles = &candles[split_idx..];

    let mut validated: Vec<(
        &HashMap<String, f64>,
        &BacktestMetrics,
        Option<BacktestMetrics>,
    )> = Vec::new();

    for (params, train_m) in &passing {
        let val_metrics = backtest(validation_candles, strategy_type, params, config);
        match &val_metrics {
            Some(vm) if vm.roi > 0.0 && vm.sharpe > 2.0 => {
                validated.push((params, train_m, val_metrics));
            }
            _ => {} // 验证集不达标，过滤
        }
    }

    if validated.is_empty() {
        return Vec::new();
    }

    // Step 3: 参数稳定性检查
    let st = StrategyType::from_str(strategy_type).unwrap_or(StrategyType::Trend);
    let specs = st.param_space();

    let mut with_stability: Vec<CandidateResult> = Vec::new();

    for (params, train_m, val_m) in &validated {
        let neighbors = generate_neighbors(params, &specs);
        let total_neighbors = neighbors.len();

        if total_neighbors == 0 {
            // 没有邻居（不太可能但安全处理）
            continue;
        }

        let passing_neighbors = neighbors
            .iter()
            .filter(|n_params| {
                if !st.is_valid_combo(n_params) {
                    return false;
                }
                match backtest(candles, strategy_type, n_params, config) {
                    Some(m) => passes(&m, days),
                    None => false,
                }
            })
            .count();

        let stability = passing_neighbors as f64 / total_neighbors as f64;

        if stability < 0.3 {
            continue; // 孤立好参数，过滤
        }

        with_stability.push(CandidateResult {
            strategy_type: strategy_type.to_string(),
            symbol: symbol.to_string(),
            timeframe: timeframe.to_string(),
            params: (*params).clone(),
            train_metrics: BacktestMetrics {
                roi: train_m.roi,
                sharpe: train_m.sharpe,
                max_drawdown_pct: train_m.max_drawdown_pct,
                total_trades: train_m.total_trades,
                win_rate: train_m.win_rate,
                profit_factor: train_m.profit_factor,
            },
            validation_metrics: val_m.as_ref().map(|vm| BacktestMetrics {
                roi: vm.roi,
                sharpe: vm.sharpe,
                max_drawdown_pct: vm.max_drawdown_pct,
                total_trades: vm.total_trades,
                win_rate: vm.win_rate,
                profit_factor: vm.profit_factor,
            }),
            stability_score: stability,
        });
    }

    // Step 4: 排序 — Sharpe * stability 降序
    with_stability.sort_by(|a, b| {
        let score_a = a.train_metrics.sharpe * a.stability_score;
        let score_b = b.train_metrics.sharpe * b.stability_score;
        score_b
            .partial_cmp(&score_a)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    // Step 5: 去重 — 参数距离很近（每维差 < 2 step）的只保留 Sharpe 更高的
    let mut deduped: Vec<CandidateResult> = Vec::new();
    for candidate in with_stability {
        let is_dup = deduped.iter().any(|existing| {
            params_too_close(&candidate.params, &existing.params, &specs)
        });
        if !is_dup {
            deduped.push(candidate);
        }
    }

    // Step 6: Top-N
    deduped.truncate(10);
    deduped
}

/// 生成邻近参数组合：每个参数 ± 1 step
fn generate_neighbors(
    params: &HashMap<String, f64>,
    specs: &[crate::generator::ParamSpec],
) -> Vec<HashMap<String, f64>> {
    let mut neighbors = Vec::new();

    for spec in specs {
        let current = match params.get(spec.name) {
            Some(&v) => v,
            None => continue,
        };

        for delta in &[-1.0, 1.0] {
            let new_val = current + delta * spec.step;
            if new_val >= spec.min && new_val <= spec.max {
                let mut neighbor = params.clone();
                neighbor.insert(spec.name.to_string(), new_val);
                neighbors.push(neighbor);
            }
        }
    }

    neighbors
}

/// 检查两个参数组合是否"太近"（每个维度差值 < 2 step）
fn params_too_close(
    a: &HashMap<String, f64>,
    b: &HashMap<String, f64>,
    specs: &[crate::generator::ParamSpec],
) -> bool {
    specs.iter().all(|spec| {
        let va = a.get(spec.name).copied().unwrap_or(0.0);
        let vb = b.get(spec.name).copied().unwrap_or(0.0);
        (va - vb).abs() < 2.0 * spec.step
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_failing_metrics() -> BacktestMetrics {
        BacktestMetrics {
            roi: 5.0,
            sharpe: 1.0,
            max_drawdown_pct: 30.0,
            total_trades: 5,
            win_rate: 30.0,
            profit_factor: 0.5,
        }
    }

    fn make_candles(n: usize) -> Vec<Candle> {
        (0..n)
            .map(|i| {
                let price = 100.0 + (i as f64 * 0.3).sin() * 5.0;
                Candle {
                    open: price - 0.1,
                    high: price + 1.5,
                    low: price - 1.5,
                    close: price,
                    volume: 100.0,
                    timestamp: i as u64 * 300_000,
                }
            })
            .collect()
    }

    // 1. 准入标准过滤：failing metrics 被正确过滤
    #[test]
    fn admission_filters_failing() {
        let candidates = vec![
            (HashMap::new(), Some(make_failing_metrics())),
            (HashMap::new(), None),
        ];
        let candles = make_candles(200);
        let config = BacktestConfig::default();
        let results = select(&candidates, &candles, "default", "TEST", "5m", &config, 14);
        assert!(results.is_empty());
    }

    // 2. 排序：Sharpe * stability 降序
    #[test]
    fn sorted_by_sharpe_times_stability() {
        // 直接测试排序逻辑
        let mut results = vec![
            CandidateResult {
                strategy_type: "default".to_string(),
                symbol: "TEST".to_string(),
                timeframe: "5m".to_string(),
                params: HashMap::new(),
                train_metrics: BacktestMetrics {
                    roi: 20.0,
                    sharpe: 5.0,
                    max_drawdown_pct: 10.0,
                    total_trades: 30,
                    win_rate: 50.0,
                    profit_factor: 2.0,
                },
                validation_metrics: None,
                stability_score: 0.5,
            },
            CandidateResult {
                strategy_type: "default".to_string(),
                symbol: "TEST".to_string(),
                timeframe: "5m".to_string(),
                params: HashMap::new(),
                train_metrics: BacktestMetrics {
                    roi: 30.0,
                    sharpe: 8.0,
                    max_drawdown_pct: 10.0,
                    total_trades: 50,
                    win_rate: 55.0,
                    profit_factor: 2.5,
                },
                validation_metrics: None,
                stability_score: 0.8,
            },
        ];

        results.sort_by(|a, b| {
            let score_a = a.train_metrics.sharpe * a.stability_score;
            let score_b = b.train_metrics.sharpe * b.stability_score;
            score_b
                .partial_cmp(&score_a)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        // 8.0 * 0.8 = 6.4 > 5.0 * 0.5 = 2.5
        assert!(
            results[0].train_metrics.sharpe * results[0].stability_score
                > results[1].train_metrics.sharpe * results[1].stability_score
        );
    }

    // 3. 去重：相近参数只保留一个
    #[test]
    fn dedup_close_params() {
        let specs = StrategyType::Trend.param_space();

        let a: HashMap<String, f64> = [
            ("ema_fast".into(), 20.0),
            ("ema_slow".into(), 50.0),
            ("atr_period".into(), 14.0),
            ("atr_sl_mult".into(), 2.0),
            ("atr_tp_mult".into(), 3.0),
        ]
        .into_iter()
        .collect();

        // b 在每个维度都只差 1 step，应被视为"太近"
        let b: HashMap<String, f64> = [
            ("ema_fast".into(), 22.0),  // +1 step (step=2)
            ("ema_slow".into(), 54.0),  // +1 step (step=4)
            ("atr_period".into(), 15.0), // +1 step (step=5)
            ("atr_sl_mult".into(), 2.5), // +1 step (step=0.5)
            ("atr_tp_mult".into(), 3.5), // +1 step (step=0.5)
        ]
        .into_iter()
        .collect();

        assert!(params_too_close(&a, &b, &specs));

        // c 在一个维度差 >= 2 step，不应被视为"太近"
        let c: HashMap<String, f64> = [
            ("ema_fast".into(), 26.0),  // +3 steps
            ("ema_slow".into(), 50.0),
            ("atr_period".into(), 14.0),
            ("atr_sl_mult".into(), 2.0),
            ("atr_tp_mult".into(), 3.0),
        ]
        .into_iter()
        .collect();

        assert!(!params_too_close(&a, &c, &specs));
    }

    // 4. 邻居生成正确性
    #[test]
    fn neighbor_generation() {
        let specs = StrategyType::Trend.param_space();

        let params: HashMap<String, f64> = [
            ("ema_fast".into(), 20.0),
            ("ema_slow".into(), 50.0),
            ("atr_period".into(), 15.0),
            ("atr_sl_mult".into(), 2.0),
            ("atr_tp_mult".into(), 3.0),
        ]
        .into_iter()
        .collect();

        let neighbors = generate_neighbors(&params, &specs);

        // 5 params, each ±1 step (if within bounds) = up to 10 neighbors
        assert!(!neighbors.is_empty());
        assert!(neighbors.len() <= 10);

        // Each neighbor differs in exactly one param
        for n in &neighbors {
            let diffs: Vec<_> = specs
                .iter()
                .filter(|s| {
                    let orig = params.get(s.name).unwrap();
                    let new = n.get(s.name).unwrap();
                    (orig - new).abs() > 1e-9
                })
                .collect();
            assert_eq!(diffs.len(), 1, "neighbor should differ in exactly one param");
        }
    }

    // 5. 边界参数的邻居不超出范围
    #[test]
    fn neighbor_respects_bounds() {
        let specs = StrategyType::Trend.param_space();

        // ema_fast at min=8, ema_slow at max=120
        let params: HashMap<String, f64> = [
            ("ema_fast".into(), 8.0),
            ("ema_slow".into(), 120.0),
            ("atr_period".into(), 15.0),
            ("atr_sl_mult".into(), 1.0),
            ("atr_tp_mult".into(), 4.0),
        ]
        .into_iter()
        .collect();

        let neighbors = generate_neighbors(&params, &specs);

        for n in &neighbors {
            for spec in &specs {
                let v = n.get(spec.name).unwrap();
                assert!(
                    *v >= spec.min && *v <= spec.max,
                    "param {} = {} out of bounds [{}, {}]",
                    spec.name,
                    v,
                    spec.min,
                    spec.max
                );
            }
        }
    }

    // 6. 空 candidates 返回空
    #[test]
    fn empty_candidates_returns_empty() {
        let candles = make_candles(200);
        let config = BacktestConfig::default();
        let results = select(&[], &candles, "default", "TEST", "5m", &config, 14);
        assert!(results.is_empty());
    }
}
