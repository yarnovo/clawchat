use std::path::Path;
use tracing_appender::non_blocking::WorkerGuard;
use tracing_appender::rolling;
use tracing_subscriber::fmt::writer::MakeWriterExt;

/// Initialize logging: output to both stderr and a daily-rotating file.
///
/// Returns a `WorkerGuard` that **must** be held alive in `main` for the
/// duration of the program — dropping it flushes and stops the file writer.
pub fn init_logging(log_dir: &Path, name: &str) -> WorkerGuard {
    let file_appender = rolling::daily(log_dir, format!("{name}.log"));
    let (non_blocking, guard) = tracing_appender::non_blocking(file_appender);

    let env_filter = tracing_subscriber::EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info"));

    tracing_subscriber::fmt()
        .with_env_filter(env_filter)
        .with_writer(std::io::stderr.and(non_blocking))
        .init();

    guard
}
