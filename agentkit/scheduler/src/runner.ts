/**
 * Scheduler — 监听 HEARTBEAT.md 变化，自动解析 + cron 执行
 *
 * HEARTBEAT.md 格式：
 * ```
 * ## 每日新闻简报
 * cron: 0 9 * * *
 * prompt: 从 Hacker News 抓取今日热门，生成简报发给我
 * ```
 *
 * - Agent 用 write 工具编辑 HEARTBEAT.md
 * - Scheduler 通过 fs.watch 监听变化，自动重新加载
 * - 格式错误的条目静默跳过，日志写入 logs/scheduler.log
 */
import fs from 'fs';
import path from 'path';
import { CronExpressionParser } from 'cron-parser';
import type { ScheduledTask } from './types.js';

const POLL_INTERVAL = 60_000;

/**
 * 从 HEARTBEAT.md 解析定时任务
 */
export function parseHeartbeat(content: string): { tasks: ScheduledTask[]; errors: string[] } {
  const tasks: ScheduledTask[] = [];
  const errors: string[] = [];
  const sections = content.split(/^## /m).filter(s => s.trim());

  for (const section of sections) {
    const lines = section.trim().split('\n');
    const name = lines[0].trim();
    let cron = '';
    let prompt = '';

    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('cron:')) cron = trimmed.slice(5).trim();
      else if (trimmed.startsWith('prompt:')) prompt = trimmed.slice(7).trim();
    }

    if (!cron || !prompt) {
      if (name) errors.push(`"${name}": missing cron or prompt`);
      continue;
    }

    // 验证 cron 格式
    try {
      CronExpressionParser.parse(cron);
      tasks.push({ name, cron, prompt });
    } catch {
      errors.push(`"${name}": invalid cron "${cron}"`);
    }
  }

  return { tasks, errors };
}

/**
 * 写日志到 logs/scheduler.log
 */
function appendLog(workDir: string, message: string): void {
  const logsDir = path.join(workDir, 'logs');
  fs.mkdirSync(logsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
  fs.appendFileSync(
    path.join(logsDir, 'scheduler.log'),
    `[${timestamp}] ${message}\n`,
  );
}

/**
 * 从 HEARTBEAT.md 加载任务
 */
function loadAndInit(workDir: string): ScheduledTask[] {
  const file = path.join(workDir, 'HEARTBEAT.md');
  if (!fs.existsSync(file)) return [];

  const { tasks, errors } = parseHeartbeat(fs.readFileSync(file, 'utf-8'));

  for (const err of errors) {
    console.log(`  ⚠️  Skipped: ${err}`);
    appendLog(workDir, `⚠️ Skipped: ${err}`);
  }

  // 初始化 nextRun
  for (const task of tasks) {
    try {
      task.nextRun = CronExpressionParser.parse(task.cron).next().toDate();
    } catch { /* already validated */ }
  }

  return tasks;
}

/**
 * 启动调度器 — 监听 HEARTBEAT.md + cron 轮询
 */
export function startScheduler(
  workDir: string,
  onTask: (task: ScheduledTask) => Promise<string>,
  onResult?: (task: ScheduledTask, result: string) => void,
): { stop: () => void } {
  let tasks = loadAndInit(workDir);

  console.log(`⏰ Scheduler: ${tasks.length} tasks loaded`);
  for (const t of tasks) {
    console.log(`   ${t.name} [${t.cron}] → next: ${t.nextRun?.toLocaleString() || '?'}`);
  }
  appendLog(workDir, `Started: ${tasks.length} tasks loaded`);

  // 监听 HEARTBEAT.md 变化
  const heartbeatFile = path.join(workDir, 'HEARTBEAT.md');
  let watcher: fs.FSWatcher | null = null;

  if (fs.existsSync(heartbeatFile)) {
    watcher = fs.watch(heartbeatFile, () => {
      console.log('⏰ HEARTBEAT.md changed, reloading...');
      appendLog(workDir, 'HEARTBEAT.md changed, reloading');
      tasks = loadAndInit(workDir);
      console.log(`⏰ Reloaded: ${tasks.length} tasks`);
      appendLog(workDir, `Reloaded: ${tasks.length} tasks`);
    });
  } else {
    // 如果文件不存在，监听目录等它被创建
    const dirWatcher = fs.watch(workDir, (_, filename) => {
      if (filename === 'HEARTBEAT.md') {
        console.log('⏰ HEARTBEAT.md created, loading...');
        appendLog(workDir, 'HEARTBEAT.md created');
        tasks = loadAndInit(workDir);
        dirWatcher.close();
        // 开始监听文件变化
        watcher = fs.watch(heartbeatFile, () => {
          tasks = loadAndInit(workDir);
          appendLog(workDir, `Reloaded: ${tasks.length} tasks`);
        });
      }
    });
  }

  // cron 轮询
  const timer = setInterval(async () => {
    const now = new Date();

    for (const task of tasks) {
      if (!task.nextRun || now < task.nextRun) continue;

      console.log(`⏰ Running: ${task.name}`);
      appendLog(workDir, `▶ ${task.name}`);
      task.lastRun = now;

      try {
        const result = await onTask(task);
        task.lastResult = result;
        appendLog(workDir, `✅ ${task.name} — done`);
        onResult?.(task, result);
      } catch (err: any) {
        task.lastResult = `Error: ${err.message}`;
        appendLog(workDir, `❌ ${task.name} — ${err.message}`);
      }

      // 计算下次执行
      try {
        task.nextRun = CronExpressionParser.parse(task.cron).next().toDate();
      } catch { /* skip */ }
    }
  }, POLL_INTERVAL);

  return {
    stop: () => {
      clearInterval(timer);
      watcher?.close();
      appendLog(workDir, 'Stopped');
    },
  };
}

// 便捷导出
export { loadAndInit as loadTasks };
