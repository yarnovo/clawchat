use colored::Colorize;

/// 格式化百分比，正数绿色，负数红色
pub fn fmt_pct(v: f64) -> String {
    let s = format!("{:+.2}%", v);
    if v >= 0.0 {
        s.green().to_string()
    } else {
        s.red().to_string()
    }
}

/// 格式化美元金额，正数绿色，负数红色
pub fn fmt_usd(v: f64) -> String {
    let s = format!("${}", format_with_commas(v));
    if v >= 0.0 {
        s.green().to_string()
    } else {
        s.red().to_string()
    }
}

/// 数字格式化：千位分隔 + 2 位小数
fn format_with_commas(v: f64) -> String {
    let abs = v.abs();
    let integer = abs as u64;
    let frac = format!("{:.2}", abs.fract());
    // frac = "0.xx"
    let decimals = &frac[1..]; // ".xx"

    let int_str = integer.to_string();
    let grouped: String = int_str
        .as_bytes()
        .rchunks(3)
        .rev()
        .map(|chunk| std::str::from_utf8(chunk).unwrap())
        .collect::<Vec<_>>()
        .join(",");

    if v < 0.0 {
        format!("-{grouped}{decimals}")
    } else {
        format!("{grouped}{decimals}")
    }
}

/// 格式化价格 — 自动选择合适的小数位
pub fn fmt_price(v: f64) -> String {
    if v >= 100.0 {
        format!("${:.2}", v)
    } else if v >= 1.0 {
        format!("${:.4}", v)
    } else if v >= 0.01 {
        format!("${:.6}", v)
    } else {
        format!("${:.8}", v)
    }
}

/// 打印带分割线的段标题
pub fn print_header(title: &str) {
    let line = "─".repeat(50);
    println!("\n{}", line.dimmed());
    println!("  {}", title.bold());
    println!("{}", line.dimmed());
}

/// 简单对齐的表格行输出
pub fn print_table_row(cols: &[(&str, &str)]) {
    for (label, value) in cols {
        print!("  {:<16} {}", format!("{}:", label).dimmed(), value);
    }
    println!();
}

/// 成功状态
pub fn ok(msg: &str) {
    println!("  {} {}", "[OK]".green().bold(), msg);
}

/// 警告状态
pub fn warn(msg: &str) {
    println!("  {} {}", "[WARN]".yellow().bold(), msg);
}

/// 告警状态
pub fn alert(msg: &str) {
    println!("  {} {}", "[ALERT]".red().bold(), msg);
}
