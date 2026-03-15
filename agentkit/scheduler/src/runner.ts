/**
 * Scheduler — 从 HEARTBEAT.md 读取定时任务，cron 轮询执行
 *
 * HEARTBEAT.md 格式：
 * ```
 * ## 每日新闻简报
 * cron: 0 9 * * *
 * prompt: 从 Hacker News 抓取今日热门，生成简报发给我
 *
 * ## 每周 README 检查
 * cron: 0 10 * * 5
 * prompt: 检查代码仓库，如果有 drift 就更新 README
 * ```
 */
import fs from 'fs';
import path from 'path';
import { CronExpressionParser } from 'cron-parser';
import type { ScheduledTask } from './types.js';

const POLL_INTERVAL = 60_000; // 每分钟检查一次

/**
 * 从 HEARTBEAT.md 解析定时任务
 */
export function parseHeartbeat(content: string): ScheduledTask[] {
  const tasks: ScheduledTask[] = [];
  const sections = content.split(/^## /m).filter(s => s.trim());

  for (const section of sections) {
    const lines = section.trim().split('\n');
    const name = lines[0].trim();
    let cron = '';
    let prompt = '';

    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      if (trimmed.startsWith('cron:')) {
        cron = trimmed.slice(5).trim();
      } else if (trimmed.startsWith('prompt:')) {
        prompt = trimmed.slice(7).trim();
      }
    }

    if (cron && prompt) {
      tasks.push({ name, cron, prompt });
    }
  }

  return tasks;
}

/**
 * 加载 HEARTBEAT.md
 */
export function loadTasks(workDir: string): ScheduledTask[] {
  const file = path.join(workDir, 'HEARTBEAT.md');
  if (!fs.existsSync(file)) return [];
  return parseHeartbeat(fs.readFileSync(file, 'utf-8'));
}

/**
 * 计算下次执行时间
 */
function getNextRun(cronExpr: string): Date | null {
  try {
    const interval = CronExpressionParser.parse(cronExpr);
    return interval.next().toDate();
  } catch {
    return null;
  }
}

/**
 * 启动调度器
 */
export function startScheduler(
  workDir: string,
  onTask: (task: ScheduledTask) => Promise<string>,
  onResult?: (task: ScheduledTask, result: string) => void,
): { stop: () => void } {
  const tasks = loadTasks(workDir);

  if (tasks.length === 0) {
    return { stop: () => {} };
  }

  // 初始化 nextRun
  for (const task of tasks) {
    const next = getNextRun(task.cron);
    if (next) task.nextRun = next;
  }

  console.log(`⏰ Scheduler: ${tasks.length} tasks loaded`);
  for (const t of tasks) {
    console.log(`   ${t.name} [${t.cron}] → next: ${t.nextRun?.toLocaleString() || 'invalid'}`);
  }

  const timer = setInterval(async () => {
    const now = new Date();

    for (const task of tasks) {
      if (!task.nextRun || now < task.nextRun) continue;

      console.log(`⏰ Running: ${task.name}`);
      task.lastRun = now;

      try {
        const result = await onTask(task);
        task.lastResult = result;
        onResult?.(task, result);
      } catch (err: any) {
        task.lastResult = `Error: ${err.message}`;
      }

      // 计算下次执行
      const next = getNextRun(task.cron);
      if (next) task.nextRun = next;
    }
  }, POLL_INTERVAL);

  return {
    stop: () => clearInterval(timer),
  };
}
