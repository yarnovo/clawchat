use crate::selector::CandidateResult;
use clawchat_shared::config_util::timeframe_to_ms;
use serde_json::json;
use std::path::Path;

/// 为每个候选生成 signal.json 文件
/// 返回成功创建的策略名称列表
pub fn write_strategy_files(
    candidates: &[CandidateResult],
    output_dir: &Path,
) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let mut created = Vec::new();

    for candidate in candidates {
        let name = format_strategy_name(candidate);
        let dir = output_dir.join(&name);

        // 不覆盖已有策略
        if dir.exists() {
            eprintln!("  跳过 {name}（目录已存在）");
            continue;
        }

        let json = build_strategy_json(candidate, &name);
        let json_str = serde_json::to_string_pretty(&json)?;

        std::fs::create_dir_all(&dir)?;
        std::fs::write(dir.join("signal.json"), json_str)?;
        created.push(name);
    }

    Ok(created)
}

/// 生成发现报告（文本格式）
pub fn print_report(candidates: &[CandidateResult]) {
    if candidates.is_empty() {
        println!("=== Discovery Results ===\n\nNo candidates found.");
        return;
    }

    println!("=== Discovery Results ===\n");

    for (i, c) in candidates.iter().enumerate() {
        let val_str = match &c.validation_metrics {
            Some(vm) => format!("ROI={:.1}% Sharpe={:.1}", vm.roi, vm.sharpe),
            None => "N/A".to_string(),
        };

        println!(
            "#{:<2} {} {} {}  Sharpe={:.1}  ROI={:.1}%  DD={:.1}%  Trades={}  Stability={:.2}",
            i + 1,
            c.symbol,
            c.strategy_type,
            c.timeframe,
            c.train_metrics.sharpe,
            c.train_metrics.roi,
            c.train_metrics.max_drawdown_pct,
            c.train_metrics.total_trades,
            c.stability_score,
        );

        // 输出参数
        let mut param_strs: Vec<String> = c
            .params
            .iter()
            .map(|(k, v)| {
                if *v == (*v as i64) as f64 {
                    format!("{k}={}", *v as i64)
                } else {
                    format!("{k}={v}")
                }
            })
            .collect();
        param_strs.sort();
        println!("    params: {}", param_strs.join(" "));
        println!("    validation: {val_str}");
        println!();
    }
}

// ── Internal helpers ────────────────────────────────────────

fn format_strategy_name(c: &CandidateResult) -> String {
    let sym = c.symbol.to_lowercase().replace("usdt", "");
    let stype = match c.strategy_type.as_str() {
        "default" => "trend",
        other => other,
    };

    // 加核心参数后缀区分同类策略
    let suffix = match stype {
        "trend" => {
            let fast = c.params.get("ema_fast").copied().unwrap_or(0.0) as i64;
            let slow = c.params.get("ema_slow").copied().unwrap_or(0.0) as i64;
            format!("ema{fast}{slow}")
        }
        "breakout" => {
            let lb = c.params.get("lookback").copied().unwrap_or(0.0) as i64;
            format!("lb{lb}")
        }
        "rsi" => {
            let period = c.params.get("rsi_period").copied().unwrap_or(0.0) as i64;
            let os = c.params.get("oversold").copied().unwrap_or(0.0) as i64;
            format!("rsi{period}os{os}")
        }
        _ => String::new(),
    };

    if suffix.is_empty() {
        format!("{sym}-{stype}-{}", c.timeframe)
    } else {
        format!("{sym}-{stype}-{suffix}-{}", c.timeframe)
    }
}

fn build_strategy_json(c: &CandidateResult, name: &str) -> serde_json::Value {
    let engine_strategy = c.strategy_type.clone();
    let tf_ms = timeframe_to_ms(&c.timeframe).unwrap_or(300_000);
    let now = chrono::Utc::now().format("%Y-%m-%d").to_string();

    // 构建参数 JSON（数值转为 JSON number）
    let params: serde_json::Map<String, serde_json::Value> = c
        .params
        .iter()
        .map(|(k, v)| {
            let jv = if *v == (*v as i64) as f64 {
                json!(*v as i64)
            } else {
                json!(v)
            };
            (k.clone(), jv)
        })
        .collect();

    json!({
        "name": name,
        "engine_strategy": engine_strategy,
        "symbol": c.symbol,
        "timeframe": c.timeframe,
        "timeframe_ms": tf_ms,
        "leverage": 3,
        "position_size": 0.3,
        "capital": 200,
        "params": params,
        "backtest": {
            "return_pct": round2(c.train_metrics.roi),
            "sharpe": round2(c.train_metrics.sharpe),
            "max_drawdown_pct": round2(c.train_metrics.max_drawdown_pct),
            "trades": c.train_metrics.total_trades,
            "win_rate": round2(c.train_metrics.win_rate),
            "profit_factor": round2(c.train_metrics.profit_factor),
        },
        "status": "pending",
        "lifecycle": {
            "discovered_at": now,
            "discovery_engine": "v1",
        }
    })
}

fn round2(v: f64) -> f64 {
    (v * 100.0).round() / 100.0
}

#[cfg(test)]
mod tests {
    use super::*;
    use clawchat_shared::criteria::BacktestMetrics;
    use tempfile::TempDir;

    fn sample_candidate() -> CandidateResult {
        CandidateResult {
            strategy_type: "default".to_string(),
            symbol: "NTRNUSDT".to_string(),
            timeframe: "5m".to_string(),
            params: [
                ("ema_fast".into(), 18.0),
                ("ema_slow".into(), 52.0),
                ("atr_period".into(), 14.0),
                ("atr_sl_mult".into(), 2.0),
                ("atr_tp_mult".into(), 3.0),
            ]
            .into_iter()
            .collect(),
            train_metrics: BacktestMetrics {
                roi: 45.3,
                sharpe: 8.2,
                max_drawdown_pct: 12.1,
                total_trades: 35,
                win_rate: 55.0,
                profit_factor: 2.5,
            },
            validation_metrics: Some(BacktestMetrics {
                roi: 22.1,
                sharpe: 5.1,
                max_drawdown_pct: 8.0,
                total_trades: 12,
                win_rate: 50.0,
                profit_factor: 2.0,
            }),
            stability_score: 0.85,
        }
    }

    // 1. 策略名称格式正确（含参数后缀）
    #[test]
    fn strategy_name_format() {
        let c = sample_candidate();
        assert_eq!(format_strategy_name(&c), "ntrn-trend-ema1852-5m");

        let mut c2 = c.clone();
        c2.strategy_type = "breakout".to_string();
        c2.symbol = "BARDUSDT".to_string();
        c2.timeframe = "15m".to_string();
        c2.params.insert("lookback".into(), 24.0);
        assert_eq!(format_strategy_name(&c2), "bard-breakout-lb24-15m");

        let mut c3 = c.clone();
        c3.strategy_type = "rsi".to_string();
        c3.params.insert("rsi_period".into(), 14.0);
        c3.params.insert("oversold".into(), 30.0);
        assert_eq!(format_strategy_name(&c3), "ntrn-rsi-rsi14os30-5m");
    }

    // 2. JSON 格式正确
    #[test]
    fn strategy_json_format() {
        let c = sample_candidate();
        let name = format_strategy_name(&c);
        let json = build_strategy_json(&c, &name);

        assert_eq!(json["name"], "ntrn-trend-ema1852-5m");
        assert_eq!(json["engine_strategy"], "default");
        assert_eq!(json["symbol"], "NTRNUSDT");
        assert_eq!(json["timeframe"], "5m");
        assert_eq!(json["timeframe_ms"], 300_000);
        assert_eq!(json["leverage"], 3);
        assert_eq!(json["position_size"], 0.3);
        assert_eq!(json["capital"], 200);
        assert_eq!(json["status"], "pending");
        assert_eq!(json["lifecycle"]["discovery_engine"], "v1");

        // params
        assert_eq!(json["params"]["ema_fast"], 18);
        assert_eq!(json["params"]["ema_slow"], 52);

        // backtest
        assert_eq!(json["backtest"]["sharpe"], 8.2);
        assert_eq!(json["backtest"]["trades"], 35);
    }

    // 3. 写入文件并验证
    #[test]
    fn write_creates_directory_and_file() {
        let tmp = TempDir::new().unwrap();
        let candidates = vec![sample_candidate()];

        let created = write_strategy_files(&candidates, tmp.path()).unwrap();
        assert_eq!(created, vec!["ntrn-trend-ema1852-5m"]);

        let file = tmp.path().join("ntrn-trend-ema1852-5m/signal.json");
        assert!(file.exists());

        let contents = std::fs::read_to_string(&file).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&contents).unwrap();
        assert_eq!(parsed["name"], "ntrn-trend-ema1852-5m");
        assert_eq!(parsed["status"], "pending");
    }

    // 4. 已存在的策略目录不被覆盖
    #[test]
    fn existing_directory_not_overwritten() {
        let tmp = TempDir::new().unwrap();
        let candidates = vec![sample_candidate()];

        // 先创建目录
        let dir = tmp.path().join("ntrn-trend-ema1852-5m");
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("signal.json"), r#"{"name":"original"}"#).unwrap();

        let created = write_strategy_files(&candidates, tmp.path()).unwrap();
        assert!(created.is_empty(), "should not overwrite existing");

        // 验证文件未被覆盖
        let contents = std::fs::read_to_string(dir.join("signal.json")).unwrap();
        assert!(contents.contains("original"));
    }

    // 5. 空候选列表
    #[test]
    fn empty_candidates_no_output() {
        let tmp = TempDir::new().unwrap();
        let created = write_strategy_files(&[], tmp.path()).unwrap();
        assert!(created.is_empty());
    }

    // 6. 多个候选
    #[test]
    fn multiple_candidates() {
        let tmp = TempDir::new().unwrap();
        let c1 = sample_candidate();
        let mut c2 = sample_candidate();
        c2.symbol = "BARDUSDT".to_string();
        c2.strategy_type = "breakout".to_string();
        c2.timeframe = "15m".to_string();
        c2.params.insert("lookback".into(), 24.0);

        let created = write_strategy_files(&[c1, c2], tmp.path()).unwrap();
        assert_eq!(created.len(), 2);
        assert!(tmp.path().join("ntrn-trend-ema1852-5m/signal.json").exists());
        assert!(tmp.path().join("bard-breakout-lb24-15m/signal.json").exists());
    }

    // 7. report 不 panic
    #[test]
    fn print_report_no_panic() {
        let candidates = vec![sample_candidate()];
        print_report(&candidates);
        print_report(&[]);
    }
}
