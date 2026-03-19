/// 策略容量计算
///
/// 规则：策略单笔下单量 < 币种 24h ADV 的 0.1%
/// max_capacity = adv_24h * 0.001 / leverage

/// 计算策略最大可承载资金
/// 规则：策略单笔下单量 < 币种 24h ADV 的 0.1%
pub fn max_capacity(adv_24h: f64, leverage: f64) -> f64 {
    if leverage <= 0.0 || adv_24h <= 0.0 {
        return 0.0;
    }
    adv_24h * 0.001 / leverage
}

/// 计算当前利用率
pub fn utilization(allocated: f64, max_capacity: f64) -> f64 {
    if max_capacity <= 0.0 {
        return f64::INFINITY;
    }
    allocated / max_capacity
}

/// 容量状态标记
#[derive(Debug, Clone, PartialEq)]
pub enum CapacityStatus {
    /// 利用率 < 30%，可扩仓
    Expandable,
    /// 30% <= 利用率 <= 80%，正常
    Normal,
    /// 80% < 利用率 <= 120%，警告
    Warning,
    /// 利用率 > 120%，需要缩仓
    Overcapacity,
}

impl CapacityStatus {
    pub fn from_utilization(util: f64) -> Self {
        if util > 1.2 {
            Self::Overcapacity
        } else if util > 0.8 {
            Self::Warning
        } else if util < 0.3 {
            Self::Expandable
        } else {
            Self::Normal
        }
    }

    pub fn label(&self) -> &'static str {
        match self {
            Self::Expandable => "expandable",
            Self::Normal => "normal",
            Self::Warning => "warning",
            Self::Overcapacity => "overcapacity",
        }
    }
}

/// 缩仓至目标利用率时的目标资金
pub fn scale_down_target(max_capacity: f64, target_utilization: f64) -> f64 {
    max_capacity * target_utilization
}

/// 发现引擎容量过滤阈值（动态）
///
/// 随着 AUM 增长，动态提高过滤阈值：
/// - AUM < $1K → $500
/// - AUM < $10K → $1K
/// - AUM < $100K → $5K
/// - AUM >= $100K → $10K
pub fn min_capacity_threshold(aum: f64) -> f64 {
    if aum < 1_000.0 {
        500.0
    } else if aum < 10_000.0 {
        1_000.0
    } else if aum < 100_000.0 {
        5_000.0
    } else {
        10_000.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn max_capacity_basic() {
        // ADV=$10M, leverage=3 → $10M * 0.001 / 3 = $3333.33
        let cap = max_capacity(10_000_000.0, 3.0);
        assert!((cap - 3333.333333).abs() < 0.01);
    }

    #[test]
    fn max_capacity_no_leverage() {
        let cap = max_capacity(10_000_000.0, 1.0);
        assert!((cap - 10_000.0).abs() < 0.01);
    }

    #[test]
    fn max_capacity_zero_adv() {
        assert_eq!(max_capacity(0.0, 3.0), 0.0);
    }

    #[test]
    fn max_capacity_zero_leverage() {
        assert_eq!(max_capacity(10_000_000.0, 0.0), 0.0);
    }

    #[test]
    fn max_capacity_negative_leverage() {
        assert_eq!(max_capacity(10_000_000.0, -1.0), 0.0);
    }

    #[test]
    fn utilization_basic() {
        // allocated=500, max_cap=1000 → 50%
        let util = utilization(500.0, 1000.0);
        assert!((util - 0.5).abs() < f64::EPSILON);
    }

    #[test]
    fn utilization_overcapacity() {
        // allocated=1500, max_cap=1000 → 150%
        let util = utilization(1500.0, 1000.0);
        assert!((util - 1.5).abs() < f64::EPSILON);
    }

    #[test]
    fn utilization_zero_capacity() {
        let util = utilization(500.0, 0.0);
        assert!(util.is_infinite());
    }

    #[test]
    fn status_expandable() {
        assert_eq!(CapacityStatus::from_utilization(0.2), CapacityStatus::Expandable);
    }

    #[test]
    fn status_normal() {
        assert_eq!(CapacityStatus::from_utilization(0.5), CapacityStatus::Normal);
    }

    #[test]
    fn status_warning() {
        assert_eq!(CapacityStatus::from_utilization(0.9), CapacityStatus::Warning);
    }

    #[test]
    fn status_overcapacity() {
        assert_eq!(CapacityStatus::from_utilization(1.5), CapacityStatus::Overcapacity);
    }

    #[test]
    fn status_boundary_30() {
        // Exactly 0.3 → Normal (not Expandable)
        assert_eq!(CapacityStatus::from_utilization(0.3), CapacityStatus::Normal);
    }

    #[test]
    fn status_boundary_80() {
        // Exactly 0.8 → Normal (not Warning)
        assert_eq!(CapacityStatus::from_utilization(0.8), CapacityStatus::Normal);
    }

    #[test]
    fn status_boundary_120() {
        // Exactly 1.2 → Warning (not Overcapacity)
        assert_eq!(CapacityStatus::from_utilization(1.2), CapacityStatus::Warning);
    }

    #[test]
    fn scale_down_target_basic() {
        // max_cap=1000, target=80% → 800
        let target = scale_down_target(1000.0, 0.8);
        assert!((target - 800.0).abs() < f64::EPSILON);
    }

    #[test]
    fn min_capacity_threshold_tiers() {
        assert_eq!(min_capacity_threshold(222.0), 500.0);
        assert_eq!(min_capacity_threshold(999.0), 500.0);
        assert_eq!(min_capacity_threshold(5_000.0), 1_000.0);
        assert_eq!(min_capacity_threshold(50_000.0), 5_000.0);
        assert_eq!(min_capacity_threshold(200_000.0), 10_000.0);
    }
}
