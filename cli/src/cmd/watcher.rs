use clawchat_shared::paths::{strategies_dir, engine_bin};
use std::collections::HashMap;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

const INTERVAL_SECS: u64 = 60;

fn now() -> String {
    chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string()
}

struct WatcherState {
    running_engines: HashMap<String, Child>,
}

impl WatcherState {
    fn new() -> Self {
        Self {
            running_engines: HashMap::new(),
        }
    }

    fn scan_strategies(&self) -> HashMap<String, serde_json::Value> {
        let mut strategies = HashMap::new();
        let sdir = strategies_dir();
        if !sdir.exists() {
            return strategies;
        }
        if let Ok(entries) = std::fs::read_dir(&sdir) {
            let mut dirs: Vec<_> = entries.filter_map(|e| e.ok()).collect();
            dirs.sort_by_key(|e| e.path());
            for entry in dirs {
                let sf = entry.path().join("signal.json");
                if !sf.exists() {
                    continue;
                }
                match std::fs::read_to_string(&sf) {
                    Ok(content) => match serde_json::from_str::<serde_json::Value>(&content) {
                        Ok(mut cfg) => {
                            let name = cfg
                                .get("name")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string())
                                .unwrap_or_else(|| {
                                    entry
                                        .path()
                                        .file_name()
                                        .and_then(|n| n.to_str())
                                        .unwrap_or("?")
                                        .to_string()
                                });
                            cfg.as_object_mut().map(|o| {
                                o.insert(
                                    "_path".to_string(),
                                    serde_json::Value::String(sf.to_string_lossy().to_string()),
                                )
                            });
                            strategies.insert(name, cfg);
                        }
                        Err(e) => {
                            println!("  [{}] 解析失败 {}: {e}", now(), sf.display());
                        }
                    },
                    Err(e) => {
                        println!("  [{}] 读取失败 {}: {e}", now(), sf.display());
                    }
                }
            }
        }
        strategies
    }

    fn start_engine(&mut self, name: &str, cfg: &serde_json::Value) {
        let config_path = cfg
            .get("_path")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let log_file = format!("/tmp/rust-{name}.log");

        println!("  [{}] 启动引擎: {name} -> {config_path}", now());
        println!("  [{}]   日志: {log_file}", now());

        let bin = engine_bin();
        match std::fs::File::options()
            .create(true)
            .append(true)
            .open(&log_file)
        {
            Ok(lf) => {
                let lf2 = lf.try_clone().unwrap_or_else(|_| {
                    std::fs::File::open("/dev/null").unwrap()
                });
                match Command::new(&bin)
                    .args(["--config", &config_path])
                    .stdout(Stdio::from(lf))
                    .stderr(Stdio::from(lf2))
                    .spawn()
                {
                    Ok(child) => {
                        let symbol = cfg
                            .get("symbol")
                            .and_then(|v| v.as_str())
                            .unwrap_or("?");
                        let strategy = cfg
                            .get("engine_strategy")
                            .or_else(|| cfg.get("strategy"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("unknown");
                        println!(
                            "  [{}]   PID={} symbol={symbol} strategy={strategy}",
                            now(),
                            child.id(),
                        );
                        self.running_engines.insert(name.to_string(), child);
                    }
                    Err(e) => println!("  [{}]   启动失败: {e}", now()),
                }
            }
            Err(e) => println!("  [{}]   无法打开日志文件: {e}", now()),
        }
    }

    fn stop_engine(&mut self, name: &str) {
        if let Some(mut child) = self.running_engines.remove(name) {
            println!("  [{}] 停止引擎: {name} PID={}", now(), child.id());
            let _ = child.kill();
            let _ = child.wait();
        }
    }

    fn check_engine_health(&mut self) -> Vec<String> {
        let mut dead = Vec::new();
        for (name, child) in &mut self.running_engines {
            match child.try_wait() {
                Ok(Some(status)) => {
                    println!(
                        "  [{}] 引擎已退出: {name} PID={} code={}",
                        now(),
                        child.id(),
                        status.code().unwrap_or(-1)
                    );
                    dead.push(name.clone());
                }
                Ok(None) => {} // still running
                Err(_) => {
                    dead.push(name.clone());
                }
            }
        }
        for name in &dead {
            self.running_engines.remove(name);
        }
        dead
    }

    fn reconcile(&mut self) {
        let strategies = self.scan_strategies();

        let should_run: HashMap<String, &serde_json::Value> = strategies
            .iter()
            .filter(|(_, cfg)| {
                let status = cfg.get("status").and_then(|v| v.as_str()).unwrap_or("");
                status == "approved" || status == "active"
            })
            .map(|(k, v)| (k.clone(), v))
            .collect();

        let _restarted = self.check_engine_health();

        // Start new strategies
        for (name, cfg) in &should_run {
            if !self.running_engines.contains_key(name.as_str()) {
                self.start_engine(name, cfg);
            }
        }

        // Stop removed/rejected/suspended strategies
        let to_stop: Vec<String> = self
            .running_engines
            .keys()
            .filter(|name| !should_run.contains_key(name.as_str()))
            .cloned()
            .collect();
        for name in to_stop {
            self.stop_engine(&name);
        }

        let n_approved = should_run.len();
        let n_running = self.running_engines.len();
        let engines: Vec<&String> = self.running_engines.keys().collect();
        println!(
            "  [{}] approved={n_approved} running={n_running} engines={engines:?}",
            now()
        );
    }

    fn stop_all(&mut self) {
        let names: Vec<String> = self.running_engines.keys().cloned().collect();
        for name in names {
            self.stop_engine(&name);
        }
    }
}

/// 策略监听器 — 守护进程模式，监控策略信号
pub async fn watcher() -> Result<(), Box<dyn std::error::Error>> {
    let bin = engine_bin();
    if !bin.exists() {
        println!("  引擎未编译: {}", bin.display());
        println!("  请先运行 make build");
        return Ok(());
    }

    println!("\n{}", "=".repeat(60));
    println!("  策略监听器启动  间隔={INTERVAL_SECS}s");
    println!("  策略目录: {}", strategies_dir().display());
    println!("  引擎: {}", bin.display());
    println!("{}\n", "=".repeat(60));

    let mut state = WatcherState::new();
    let running = Arc::new(AtomicBool::new(true));
    let r = running.clone();

    tokio::spawn(async move {
        let _ = tokio::signal::ctrl_c().await;
        r.store(false, Ordering::SeqCst);
    });

    while running.load(Ordering::SeqCst) {
        state.reconcile();
        // Sleep in small increments to check the running flag
        for _ in 0..INTERVAL_SECS {
            if !running.load(Ordering::SeqCst) {
                break;
            }
            tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
        }
    }

    println!("\n  [{}] 收到停止信号，正在停止所有引擎...", now());
    state.stop_all();
    println!("  [{}] 策略监听器已退出", now());

    Ok(())
}
