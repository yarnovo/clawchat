//! 跨策略相关性计算 — 计算策略间收益 Pearson 相关系数矩阵

use std::collections::HashMap;

use crate::indicators::pearson_correlation;

/// 策略日收益数据：strategy_name → Vec<(date, pnl)>
pub type DailyPnlMap = HashMap<String, Vec<f64>>;

/// 相关性矩阵条目
#[derive(Debug, Clone)]
pub struct CorrelationEntry {
    pub strategy_a: String,
    pub strategy_b: String,
    pub correlation: f64,
}

/// 相关性矩阵结果
#[derive(Debug, Clone)]
pub struct CorrelationMatrix {
    /// 策略名列表（有序）
    pub strategies: Vec<String>,
    /// 矩阵数据 [i][j] = correlation between strategy i and j
    pub matrix: Vec<Vec<Option<f64>>>,
}

impl CorrelationMatrix {
    /// 获取两个策略之间的相关性
    pub fn get(&self, a: &str, b: &str) -> Option<f64> {
        let i = self.strategies.iter().position(|s| s == a)?;
        let j = self.strategies.iter().position(|s| s == b)?;
        self.matrix[i][j]
    }

    /// 找出所有高相关性策略对（|correlation| >= threshold）
    pub fn high_correlation_pairs(&self, threshold: f64) -> Vec<CorrelationEntry> {
        let mut pairs = Vec::new();
        let n = self.strategies.len();
        for i in 0..n {
            for j in (i + 1)..n {
                if let Some(corr) = self.matrix[i][j] {
                    if corr.abs() >= threshold {
                        pairs.push(CorrelationEntry {
                            strategy_a: self.strategies[i].clone(),
                            strategy_b: self.strategies[j].clone(),
                            correlation: corr,
                        });
                    }
                }
            }
        }
        pairs.sort_by(|a, b| b.correlation.abs().partial_cmp(&a.correlation.abs()).unwrap_or(std::cmp::Ordering::Equal));
        pairs
    }
}

/// 从对齐的日收益数据计算相关性矩阵
///
/// `aligned_pnl`: strategy_name → 按日期对齐的收益序列（所有 Vec 等长，缺失日用 0.0 填充）
/// 最少需要 3 个数据点才能计算相关性
pub fn compute_correlation_matrix(aligned_pnl: &HashMap<String, Vec<f64>>) -> CorrelationMatrix {
    let mut strategies: Vec<String> = aligned_pnl.keys().cloned().collect();
    strategies.sort();

    let n = strategies.len();
    let mut matrix = vec![vec![None; n]; n];

    for i in 0..n {
        matrix[i][i] = Some(1.0);
        for j in (i + 1)..n {
            let x = &aligned_pnl[&strategies[i]];
            let y = &aligned_pnl[&strategies[j]];

            // 两序列需等长且至少 3 个数据点
            if x.len() >= 3 && x.len() == y.len() {
                let corr = pearson_correlation(x, y);
                matrix[i][j] = corr;
                matrix[j][i] = corr;
            }
        }
    }

    CorrelationMatrix { strategies, matrix }
}

/// 从日期索引的 PnL 数据对齐为等长序列
///
/// `daily_pnl`: strategy_name → (date → pnl)
/// 返回: strategy_name → Vec<f64>（按公共日期排序对齐）
pub fn align_daily_pnl(
    daily_pnl: &HashMap<String, HashMap<String, f64>>,
) -> HashMap<String, Vec<f64>> {
    // 收集所有日期
    let mut all_dates: std::collections::BTreeSet<String> = std::collections::BTreeSet::new();
    for pnl_map in daily_pnl.values() {
        for d in pnl_map.keys() {
            if d != "unknown" {
                all_dates.insert(d.clone());
            }
        }
    }
    let sorted_dates: Vec<String> = all_dates.into_iter().collect();

    let mut result = HashMap::new();
    for (strat, pnl_map) in daily_pnl {
        let series: Vec<f64> = sorted_dates
            .iter()
            .map(|d| *pnl_map.get(d).unwrap_or(&0.0))
            .collect();
        result.insert(strat.clone(), series);
    }
    result
}

/// 检测高相关性策略组中的总敞口风险
///
/// 返回: Vec<(策略组, 相关系数, 合计敞口占比)>
pub fn check_correlation_exposure(
    correlation_matrix: &CorrelationMatrix,
    strategy_exposures: &HashMap<String, f64>,
    total_portfolio: f64,
    threshold: f64,
) -> Vec<(Vec<String>, f64, f64)> {
    if total_portfolio <= 0.0 {
        return Vec::new();
    }

    let pairs = correlation_matrix.high_correlation_pairs(threshold);
    let mut warnings = Vec::new();

    // 对每对高相关策略，计算合计敞口占比
    for pair in &pairs {
        let exp_a = strategy_exposures.get(&pair.strategy_a).copied().unwrap_or(0.0);
        let exp_b = strategy_exposures.get(&pair.strategy_b).copied().unwrap_or(0.0);
        let total_exp = (exp_a + exp_b) / total_portfolio;

        warnings.push((
            vec![pair.strategy_a.clone(), pair.strategy_b.clone()],
            pair.correlation,
            total_exp,
        ));
    }

    warnings
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compute_matrix_identical_series() {
        let mut data = HashMap::new();
        data.insert("s1".to_string(), vec![1.0, 2.0, 3.0, 4.0, 5.0]);
        data.insert("s2".to_string(), vec![1.0, 2.0, 3.0, 4.0, 5.0]);

        let matrix = compute_correlation_matrix(&data);
        assert_eq!(matrix.strategies.len(), 2);
        let corr = matrix.get("s1", "s2").unwrap();
        assert!((corr - 1.0).abs() < 1e-9, "identical series should have corr=1.0, got {corr}");
    }

    #[test]
    fn compute_matrix_opposite_series() {
        let mut data = HashMap::new();
        data.insert("s1".to_string(), vec![1.0, 2.0, 3.0, 4.0, 5.0]);
        data.insert("s2".to_string(), vec![5.0, 4.0, 3.0, 2.0, 1.0]);

        let matrix = compute_correlation_matrix(&data);
        let corr = matrix.get("s1", "s2").unwrap();
        assert!((corr - (-1.0)).abs() < 1e-9, "opposite series should have corr=-1.0, got {corr}");
    }

    #[test]
    fn compute_matrix_single_strategy() {
        let mut data = HashMap::new();
        data.insert("s1".to_string(), vec![1.0, 2.0, 3.0]);

        let matrix = compute_correlation_matrix(&data);
        assert_eq!(matrix.strategies.len(), 1);
        assert_eq!(matrix.get("s1", "s1"), Some(1.0));
    }

    #[test]
    fn compute_matrix_too_short() {
        let mut data = HashMap::new();
        data.insert("s1".to_string(), vec![1.0, 2.0]);
        data.insert("s2".to_string(), vec![1.0, 2.0]);

        let matrix = compute_correlation_matrix(&data);
        // 不足 3 个数据点，相关性为 None
        assert!(matrix.get("s1", "s2").is_none());
    }

    #[test]
    fn high_correlation_pairs_above_threshold() {
        let mut data = HashMap::new();
        data.insert("s1".to_string(), vec![1.0, 2.0, 3.0, 4.0, 5.0]);
        data.insert("s2".to_string(), vec![1.1, 2.1, 3.1, 4.1, 5.1]); // highly correlated
        data.insert("s3".to_string(), vec![5.0, 4.0, 3.0, 2.0, 1.0]); // negatively correlated

        let matrix = compute_correlation_matrix(&data);
        let pairs = matrix.high_correlation_pairs(0.8);

        // s1-s2 should be highly correlated (>0.8)
        assert!(pairs.iter().any(|p|
            (p.strategy_a == "s1" && p.strategy_b == "s2") ||
            (p.strategy_a == "s2" && p.strategy_b == "s1")
        ), "s1-s2 should be highly correlated");

        // s1-s3 should also be caught (negative correlation, abs > 0.8)
        assert!(pairs.iter().any(|p|
            (p.strategy_a == "s1" && p.strategy_b == "s3") ||
            (p.strategy_a == "s3" && p.strategy_b == "s1")
        ), "s1-s3 should have high negative correlation");
    }

    #[test]
    fn align_daily_pnl_fills_gaps() {
        let mut daily = HashMap::new();
        let mut s1 = HashMap::new();
        s1.insert("2026-03-01".to_string(), 10.0);
        s1.insert("2026-03-02".to_string(), -5.0);
        daily.insert("s1".to_string(), s1);

        let mut s2 = HashMap::new();
        s2.insert("2026-03-01".to_string(), 3.0);
        // s2 missing 2026-03-02
        s2.insert("2026-03-03".to_string(), 7.0);
        daily.insert("s2".to_string(), s2);

        let aligned = align_daily_pnl(&daily);
        // 3 dates: 03-01, 03-02, 03-03
        assert_eq!(aligned["s1"].len(), 3);
        assert_eq!(aligned["s2"].len(), 3);
        // s1 missing 03-03 → 0.0
        assert!((aligned["s1"][2] - 0.0).abs() < f64::EPSILON);
        // s2 missing 03-02 → 0.0
        assert!((aligned["s2"][1] - 0.0).abs() < f64::EPSILON);
    }

    #[test]
    fn check_correlation_exposure_warns_on_high() {
        let mut data = HashMap::new();
        data.insert("s1".to_string(), vec![1.0, 2.0, 3.0, 4.0, 5.0]);
        data.insert("s2".to_string(), vec![1.0, 2.0, 3.0, 4.0, 5.0]);

        let matrix = compute_correlation_matrix(&data);

        let mut exposures = HashMap::new();
        exposures.insert("s1".to_string(), 50.0);
        exposures.insert("s2".to_string(), 50.0);

        let warnings = check_correlation_exposure(&matrix, &exposures, 200.0, 0.8);
        assert!(!warnings.is_empty(), "should warn about high correlation");
        let (_, _, total_exp) = &warnings[0];
        assert!((*total_exp - 0.5).abs() < 1e-9, "combined exposure should be 50%, got {total_exp}");
    }

    #[test]
    fn check_correlation_exposure_no_warn_when_low() {
        let mut data = HashMap::new();
        data.insert("s1".to_string(), vec![1.0, 2.0, 3.0, 4.0, 5.0]);
        data.insert("s2".to_string(), vec![5.0, 3.0, 1.0, 4.0, 2.0]); // low correlation

        let matrix = compute_correlation_matrix(&data);

        let mut exposures = HashMap::new();
        exposures.insert("s1".to_string(), 50.0);
        exposures.insert("s2".to_string(), 50.0);

        let warnings = check_correlation_exposure(&matrix, &exposures, 200.0, 0.8);
        assert!(warnings.is_empty(), "should not warn when correlation is low");
    }

    #[test]
    fn matrix_symmetric() {
        let mut data = HashMap::new();
        data.insert("a".to_string(), vec![1.0, 3.0, 5.0, 7.0]);
        data.insert("b".to_string(), vec![2.0, 4.0, 3.0, 8.0]);
        data.insert("c".to_string(), vec![9.0, 7.0, 5.0, 3.0]);

        let matrix = compute_correlation_matrix(&data);
        for i in 0..3 {
            for j in 0..3 {
                assert_eq!(
                    matrix.matrix[i][j], matrix.matrix[j][i],
                    "matrix should be symmetric at ({i},{j})"
                );
            }
        }
    }

    #[test]
    fn empty_data_produces_empty_matrix() {
        let data: HashMap<String, Vec<f64>> = HashMap::new();
        let matrix = compute_correlation_matrix(&data);
        assert!(matrix.strategies.is_empty());
        assert!(matrix.matrix.is_empty());
    }
}
