export interface ScheduledTask {
  name: string;
  cron: string;           // cron 表达式
  prompt: string;         // 发给 Agent 的提示词
  nextRun?: Date;
  lastRun?: Date;
  lastResult?: string;
}
