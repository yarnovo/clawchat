/**
 * plugin-scheduler — HEARTBEAT.md + cron → EventLoop 事件
 */
import fs from 'fs';
import path from 'path';
import { CronExpressionParser } from 'cron-parser';
import type { Channel, AgenticContext } from '@agentkit/agentic';
import { createEvent } from '@agentkit/event-loop';
import type { EventLoop } from '@agentkit/event-loop';

interface ScheduledTask {
  name: string;
  cron: string;
  prompt: string;
  nextRun?: Date;
  lastRun?: Date;
}

const POLL_INTERVAL = 60_000;

function parseHeartbeat(content: string): { tasks: ScheduledTask[]; errors: string[] } {
  const tasks: ScheduledTask[] = [];
  const errors: string[] = [];
  for (const section of content.split(/^## /m).filter(s => s.trim())) {
    const lines = section.trim().split('\n');
    const name = lines[0].trim();
    let cron = '', prompt = '';
    for (const line of lines.slice(1)) {
      const t = line.trim();
      if (t.startsWith('cron:')) cron = t.slice(5).trim();
      else if (t.startsWith('prompt:')) prompt = t.slice(7).trim();
    }
    if (!cron || !prompt) { if (name) errors.push(`"${name}": missing cron or prompt`); continue; }
    try { CronExpressionParser.parse(cron); tasks.push({ name, cron, prompt }); }
    catch { errors.push(`"${name}": invalid cron "${cron}"`); }
  }
  return { tasks, errors };
}

function appendLog(workDir: string, msg: string): void {
  const dir = path.join(workDir, 'logs');
  fs.mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  fs.appendFileSync(path.join(dir, 'scheduler.log'), `[${ts}] ${msg}\n`);
}

function loadTasks(workDir: string): ScheduledTask[] {
  const file = path.join(workDir, 'HEARTBEAT.md');
  if (!fs.existsSync(file)) return [];
  const { tasks, errors } = parseHeartbeat(fs.readFileSync(file, 'utf-8'));
  for (const e of errors) appendLog(workDir, `Skipped: ${e}`);
  for (const t of tasks) {
    try { t.nextRun = CronExpressionParser.parse(t.cron).next().toDate(); } catch {}
  }
  return tasks;
}

export function schedulerChannel(): Channel {
  let tasks: ScheduledTask[] = [];
  let timer: ReturnType<typeof setInterval>;
  let watcher: fs.FSWatcher | null = null;
  let workDir = '';
  let loop: EventLoop;

  return {
    name: 'scheduler',

    setup: async (ctx: AgenticContext) => {
      workDir = ctx.workDir;
      loop = ctx.eventLoop;
      tasks = loadTasks(workDir);
      appendLog(workDir, `Started: ${tasks.length} tasks`);

      if (tasks.length > 0) {
        console.log(`   Scheduler: ${tasks.length} tasks`);
      }

      // 监听 HEARTBEAT.md 变化
      const hbFile = path.join(workDir, 'HEARTBEAT.md');
      if (fs.existsSync(hbFile)) {
        watcher = fs.watch(hbFile, () => {
          tasks = loadTasks(workDir);
          appendLog(workDir, `Reloaded: ${tasks.length} tasks`);
        });
      }

      // cron 轮询
      timer = setInterval(async () => {
        const now = new Date();
        for (const task of tasks) {
          if (!task.nextRun || now < task.nextRun) continue;
          task.lastRun = now;
          appendLog(workDir, `▶ ${task.name}`);

          try {
            await loop.push(createEvent('timer', 'scheduler', {
              prompt: task.prompt,
              taskName: task.name,
            }));
            appendLog(workDir, `✅ ${task.name}`);
          } catch (err: any) {
            appendLog(workDir, `❌ ${task.name}: ${err.message}`);
          }

          try { task.nextRun = CronExpressionParser.parse(task.cron).next().toDate(); } catch {}
        }
      }, POLL_INTERVAL);
    },

    teardown: async () => {
      clearInterval(timer);
      watcher?.close();
      appendLog(workDir, 'Stopped');
    },

    info: () => ({
      tasks: tasks.map(t => ({ name: t.name, cron: t.cron, nextRun: t.nextRun?.toISOString() })),
    }),
  };
}
