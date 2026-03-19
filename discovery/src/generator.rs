use serde::Deserialize;
use std::collections::HashMap;

/// 参数维度定义
pub struct ParamSpec {
    pub name: String,
    pub min: f64,
    pub max: f64,
    pub step: f64,
}

/// 搜索配置（从 JSON 反序列化）
#[derive(Debug, Deserialize)]
pub struct SearchConfig {
    pub strategy: String,
    pub symbols: Vec<String>,
    #[serde(default = "default_days")]
    pub days: u32,
    #[serde(default = "default_timeframes")]
    pub timeframes: Vec<String>,
    pub params: HashMap<String, ParamRange>,
}

fn default_days() -> u32 {
    90
}

fn default_timeframes() -> Vec<String> {
    vec!["5m".to_string()]
}

/// 参数范围定义
#[derive(Debug, Deserialize)]
pub struct ParamRange {
    pub min: f64,
    pub max: f64,
    pub step: f64,
}

impl ParamSpec {
    /// 该维度的取值个数
    fn count(&self) -> usize {
        ((self.max - self.min) / self.step).round() as usize + 1
    }

    /// 该维度的所有取值
    fn values(&self) -> Vec<f64> {
        let n = self.count();
        (0..n).map(|i| self.min + i as f64 * self.step).collect()
    }
}

/// 策略类型
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StrategyType {
    Trend,
    Breakout,
    Rsi,
}

impl StrategyType {
    /// 返回该策略类型的参数搜索空间
    pub fn param_space(&self) -> Vec<ParamSpec> {
        match self {
            StrategyType::Trend => vec![
                ParamSpec { name: "ema_fast".into(), min: 8.0, max: 34.0, step: 2.0 },
                ParamSpec { name: "ema_slow".into(), min: 34.0, max: 120.0, step: 4.0 },
                ParamSpec { name: "atr_period".into(), min: 10.0, max: 20.0, step: 5.0 },
                ParamSpec { name: "atr_sl_mult".into(), min: 1.0, max: 3.0, step: 0.5 },
                ParamSpec { name: "atr_tp_mult".into(), min: 1.5, max: 4.0, step: 0.5 },
            ],
            StrategyType::Breakout => vec![
                ParamSpec { name: "lookback".into(), min: 10.0, max: 40.0, step: 2.0 },
                ParamSpec { name: "atr_period".into(), min: 10.0, max: 20.0, step: 2.0 },
                ParamSpec { name: "atr_filter".into(), min: 0.3, max: 1.0, step: 0.1 },
                ParamSpec { name: "trail_atr".into(), min: 1.5, max: 4.0, step: 0.5 },
            ],
            StrategyType::Rsi => vec![
                ParamSpec { name: "rsi_period".into(), min: 10.0, max: 20.0, step: 2.0 },
                ParamSpec { name: "rsi_oversold".into(), min: 20.0, max: 35.0, step: 5.0 },
                ParamSpec { name: "rsi_overbought".into(), min: 65.0, max: 80.0, step: 5.0 },
                ParamSpec { name: "trend_ema".into(), min: 100.0, max: 200.0, step: 50.0 },
                ParamSpec { name: "atr_period".into(), min: 10.0, max: 20.0, step: 5.0 },
                ParamSpec { name: "atr_sl_mult".into(), min: 1.0, max: 3.0, step: 0.5 },
                ParamSpec { name: "atr_tp_mult".into(), min: 1.5, max: 4.0, step: 0.5 },
            ],
        }
    }

    /// 返回引擎策略名称（对应 signal.json 的 engine_strategy）
    pub fn engine_name(&self) -> &'static str {
        match self {
            StrategyType::Trend => "default",
            StrategyType::Breakout => "breakout",
            StrategyType::Rsi => "rsi",
        }
    }

    /// 参数约束检查
    pub fn is_valid_combo(&self, params: &HashMap<String, f64>) -> bool {
        match self {
            StrategyType::Trend => {
                let fast = params.get("ema_fast").copied().unwrap_or(0.0);
                let slow = params.get("ema_slow").copied().unwrap_or(0.0);
                fast < slow && (slow - fast) >= 10.0
            }
            StrategyType::Breakout => true,
            StrategyType::Rsi => {
                let oversold = params.get("rsi_oversold").copied().unwrap_or(0.0);
                let overbought = params.get("rsi_overbought").copied().unwrap_or(100.0);
                oversold < overbought
            }
        }
    }

    /// 从字符串解析
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "trend" | "default" => Some(StrategyType::Trend),
            "breakout" => Some(StrategyType::Breakout),
            "rsi" => Some(StrategyType::Rsi),
            _ => None,
        }
    }

    /// 所有类型
    pub fn all() -> Vec<Self> {
        vec![StrategyType::Trend, StrategyType::Breakout, StrategyType::Rsi]
    }
}

/// 参数组合生成器（网格搜索）
pub struct ParamGenerator {
    strategy_type: StrategyType,
    specs: Vec<ParamSpec>,
}

impl ParamGenerator {
    pub fn new(strategy_type: StrategyType) -> Self {
        let specs = strategy_type.param_space();
        Self {
            strategy_type,
            specs,
        }
    }

    /// 从 SearchConfig 构建，用配置中的参数范围覆盖默认值
    pub fn from_config(strategy_type: StrategyType, config: &SearchConfig) -> Self {
        let default_specs = strategy_type.param_space();
        let specs = if config.params.is_empty() {
            default_specs
        } else {
            // 用配置覆盖默认参数，配置中没有的参数用默认值
            default_specs
                .into_iter()
                .map(|spec| {
                    if let Some(range) = config.params.get(&spec.name) {
                        ParamSpec {
                            name: spec.name,
                            min: range.min,
                            max: range.max,
                            step: range.step,
                        }
                    } else {
                        spec
                    }
                })
                .collect()
        };
        Self {
            strategy_type,
            specs,
        }
    }

    /// 返回总组合数（过滤前）
    pub fn total_combinations(&self) -> usize {
        self.specs.iter().map(|s| s.count()).product()
    }

    /// 生成所有有效参数组合
    pub fn generate(&self) -> Vec<HashMap<String, f64>> {
        let all_values: Vec<Vec<f64>> = self.specs.iter().map(|s| s.values()).collect();
        let names: Vec<&str> = self.specs.iter().map(|s| s.name.as_str()).collect();

        let mut results = Vec::new();
        let mut indices = vec![0usize; self.specs.len()];

        loop {
            // Build current combo
            let combo: HashMap<String, f64> = names
                .iter()
                .enumerate()
                .map(|(i, &name)| (name.to_string(), all_values[i][indices[i]]))
                .collect();

            if self.strategy_type.is_valid_combo(&combo) {
                results.push(combo);
            }

            // Advance indices (odometer-style)
            let mut pos = indices.len();
            loop {
                if pos == 0 {
                    return results;
                }
                pos -= 1;
                indices[pos] += 1;
                if indices[pos] < all_values[pos].len() {
                    break;
                }
                indices[pos] = 0;
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn trend_param_space_size_reasonable() {
        let pg = ParamGenerator::new(StrategyType::Trend);
        let total = pg.total_combinations();
        assert!(total > 0);
        assert!(total <= 50000, "total={total} exceeds 50000");
    }

    #[test]
    fn breakout_param_space_size_reasonable() {
        let pg = ParamGenerator::new(StrategyType::Breakout);
        let total = pg.total_combinations();
        assert!(total > 0);
        assert!(total <= 50000, "total={total} exceeds 50000");
    }

    #[test]
    fn rsi_param_space_size_reasonable() {
        let pg = ParamGenerator::new(StrategyType::Rsi);
        let total = pg.total_combinations();
        assert!(total > 0);
        assert!(total <= 50000, "total={total} exceeds 50000");
    }

    #[test]
    fn trend_constraint_filters_invalid() {
        let pg =ParamGenerator::new(StrategyType::Trend);
        let combos = pg.generate();
        let total = pg.total_combinations();
        // Some combos should be filtered (ema_fast >= ema_slow or gap < 10)
        assert!(combos.len() < total, "expected filtering to reduce combos");
        // All remaining combos must be valid
        for combo in &combos {
            let fast = combo["ema_fast"];
            let slow = combo["ema_slow"];
            assert!(fast < slow, "ema_fast={fast} >= ema_slow={slow}");
            assert!(
                slow - fast >= 10.0,
                "gap={} < 10 for fast={fast}, slow={slow}",
                slow - fast
            );
        }
    }

    #[test]
    fn all_generated_combos_are_valid() {
        for st in StrategyType::all() {
            let pg =ParamGenerator::new(st);
            let combos = pg.generate();
            assert!(!combos.is_empty(), "{:?} produced no combos", st);
            for combo in &combos {
                assert!(st.is_valid_combo(combo), "invalid combo for {:?}: {:?}", st, combo);
            }
        }
    }

    #[test]
    fn from_str_parses_correctly() {
        assert_eq!(StrategyType::from_str("trend"), Some(StrategyType::Trend));
        assert_eq!(StrategyType::from_str("default"), Some(StrategyType::Trend));
        assert_eq!(StrategyType::from_str("breakout"), Some(StrategyType::Breakout));
        assert_eq!(StrategyType::from_str("Breakout"), Some(StrategyType::Breakout));
        assert_eq!(StrategyType::from_str("rsi"), Some(StrategyType::Rsi));
        assert_eq!(StrategyType::from_str("RSI"), Some(StrategyType::Rsi));
        assert_eq!(StrategyType::from_str("unknown"), None);
    }

    #[test]
    fn engine_names_match() {
        assert_eq!(StrategyType::Trend.engine_name(), "default");
        assert_eq!(StrategyType::Breakout.engine_name(), "breakout");
        assert_eq!(StrategyType::Rsi.engine_name(), "rsi");
    }

    #[test]
    fn all_returns_three_types() {
        assert_eq!(StrategyType::all().len(), 3);
    }

    #[test]
    fn rsi_constraint_filters_invalid() {
        // All RSI combos should have oversold < overbought
        let pg =ParamGenerator::new(StrategyType::Rsi);
        let combos = pg.generate();
        for combo in &combos {
            let os = combo["rsi_oversold"];
            let ob = combo["rsi_overbought"];
            assert!(os < ob, "rsi_oversold={os} >= rsi_overbought={ob}");
        }
    }

    #[test]
    fn breakout_generates_all_combos() {
        // Breakout has no constraints, so generated == total
        let pg =ParamGenerator::new(StrategyType::Breakout);
        let combos = pg.generate();
        let total = pg.total_combinations();
        assert_eq!(combos.len(), total);
    }

    #[test]
    fn search_config_deserialize() {
        let json = r#"{
            "strategy": "trend",
            "symbols": ["NTRNUSDT", "BARDUSDT"],
            "days": 60,
            "timeframes": ["5m", "15m"],
            "params": {
                "ema_fast": { "min": 5, "max": 25, "step": 5 },
                "ema_slow": { "min": 40, "max": 80, "step": 10 }
            }
        }"#;
        let config: SearchConfig = serde_json::from_str(json).unwrap();
        assert_eq!(config.strategy, "trend");
        assert_eq!(config.symbols.len(), 2);
        assert_eq!(config.days, 60);
        assert_eq!(config.timeframes.len(), 2);
        assert_eq!(config.params.len(), 2);
        assert_eq!(config.params["ema_fast"].min, 5.0);
        assert_eq!(config.params["ema_fast"].max, 25.0);
        assert_eq!(config.params["ema_fast"].step, 5.0);
    }

    #[test]
    fn search_config_defaults() {
        let json = r#"{
            "strategy": "breakout",
            "symbols": ["SUIUSDT"],
            "params": {}
        }"#;
        let config: SearchConfig = serde_json::from_str(json).unwrap();
        assert_eq!(config.days, 90);
        assert_eq!(config.timeframes, vec!["5m"]);
    }

    #[test]
    fn from_config_overrides_params() {
        let json = r#"{
            "strategy": "trend",
            "symbols": ["NTRNUSDT"],
            "params": {
                "ema_fast": { "min": 10, "max": 20, "step": 5 }
            }
        }"#;
        let config: SearchConfig = serde_json::from_str(json).unwrap();
        let pg = ParamGenerator::from_config(StrategyType::Trend, &config);
        // ema_fast should have 3 values: 10, 15, 20
        // Other params keep defaults
        let combos = pg.generate();
        assert!(!combos.is_empty());
        // Check ema_fast values are within config range
        for combo in &combos {
            let fast = combo["ema_fast"];
            assert!(fast >= 10.0 && fast <= 20.0, "ema_fast={fast} out of config range");
        }
    }

    #[test]
    fn from_config_empty_params_uses_defaults() {
        let json = r#"{
            "strategy": "trend",
            "symbols": ["NTRNUSDT"],
            "params": {}
        }"#;
        let config: SearchConfig = serde_json::from_str(json).unwrap();
        let pg_config = ParamGenerator::from_config(StrategyType::Trend, &config);
        let pg_default = ParamGenerator::new(StrategyType::Trend);
        assert_eq!(pg_config.total_combinations(), pg_default.total_combinations());
    }
}
