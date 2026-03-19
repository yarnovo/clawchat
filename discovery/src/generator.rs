use std::collections::HashMap;

/// 参数维度定义
pub struct ParamSpec {
    pub name: &'static str,
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
                ParamSpec { name: "ema_fast", min: 8.0, max: 34.0, step: 2.0 },
                ParamSpec { name: "ema_slow", min: 34.0, max: 120.0, step: 4.0 },
                ParamSpec { name: "atr_period", min: 10.0, max: 20.0, step: 5.0 },
                ParamSpec { name: "atr_sl_mult", min: 1.0, max: 3.0, step: 0.5 },
                ParamSpec { name: "atr_tp_mult", min: 1.5, max: 4.0, step: 0.5 },
            ],
            StrategyType::Breakout => vec![
                ParamSpec { name: "lookback", min: 10.0, max: 40.0, step: 2.0 },
                ParamSpec { name: "atr_period", min: 10.0, max: 20.0, step: 2.0 },
                ParamSpec { name: "atr_filter", min: 0.3, max: 1.0, step: 0.1 },
                ParamSpec { name: "trail_atr", min: 1.5, max: 4.0, step: 0.5 },
            ],
            StrategyType::Rsi => vec![
                ParamSpec { name: "rsi_period", min: 10.0, max: 20.0, step: 2.0 },
                ParamSpec { name: "rsi_oversold", min: 20.0, max: 35.0, step: 5.0 },
                ParamSpec { name: "rsi_overbought", min: 65.0, max: 80.0, step: 5.0 },
                ParamSpec { name: "trend_ema", min: 100.0, max: 200.0, step: 50.0 },
                ParamSpec { name: "atr_period", min: 10.0, max: 20.0, step: 5.0 },
                ParamSpec { name: "atr_sl_mult", min: 1.0, max: 3.0, step: 0.5 },
                ParamSpec { name: "atr_tp_mult", min: 1.5, max: 4.0, step: 0.5 },
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

    /// 返回总组合数（过滤前）
    pub fn total_combinations(&self) -> usize {
        self.specs.iter().map(|s| s.count()).product()
    }

    /// 生成所有有效参数组合
    pub fn generate(&self) -> Vec<HashMap<String, f64>> {
        let all_values: Vec<Vec<f64>> = self.specs.iter().map(|s| s.values()).collect();
        let names: Vec<&str> = self.specs.iter().map(|s| s.name).collect();

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
}
