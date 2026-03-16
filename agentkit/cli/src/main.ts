#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
// core 不暴露 Tool 接口，bash 内置在 Agent 里
import { AgentRunner } from '@agentkit/agentic';
import { OpenAIProvider } from '@agentkit/provider-llm-openai';
import { SQLiteSession } from '@agentkit/provider-session-sqlite';
import { skillsExtension } from '@agentkit/extension-skills';
import { memoryExtension } from '@agentkit/extension-memory';
import { schedulerChannel } from '@agentkit/channel-scheduler';
import { httpChannel } from '@agentkit/channel-http';
import { runScorers } from '@agentkit/eval';
import type { EvalCase, AgentTrace, ScoreResult } from '@agentkit/eval';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BUILTIN_SKILLS_DIR = path.resolve(__dirname, '../../extension-skills/builtins');

const program = new Command();
program.name('agentkit').description('AgentKit — run, eval, info, serve').version('0.0.1');

function createLLM() {
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  const baseURL = process.env.LLM_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
  const model = process.env.LLM_MODEL || 'qwen-plus';
  if (!apiKey) { console.error('Error: set LLM_API_KEY'); process.exit(1); }
  return new OpenAIProvider({ apiKey, baseURL, model });
}

function resolveWorkspace(dir: string): string {
  const abs = path.resolve(dir);
  if (!fs.existsSync(abs)) { console.error(`Not found: ${abs}`); process.exit(1); }
  return abs;
}

// ---- run ----
program
  .command('run <workspace>')
  .description('Start the agent (interactive or single message)')
  .option('-m, --message <msg>', 'Single message mode')
  .action(async (workspace, opts) => {
    const abs = resolveWorkspace(workspace);

    const runner = new AgentRunner({
      workspace: abs,
      llm: createLLM(),
      session: new SQLiteSession(path.join(abs, '.agent-session.db')),
    })
      .use(skillsExtension({ builtinDir: BUILTIN_SKILLS_DIR }))
      .use(memoryExtension());

    await runner.start();

    if (opts.message) {
      console.log(await runner.chat(opts.message));
      await runner.stop();
      return;
    }

    console.log(`   exit to quit\n`);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = () => rl.question('👤 > ', async (input) => {
      if (!input.trim() || input.trim() === 'exit') { await runner.stop(); rl.close(); return; }
      console.log(`\n🤖 ${await runner.chat(input)}\n`);
      ask();
    });
    ask();
  });

// ---- eval ----
program
  .command('eval <workspace>')
  .description('Run eval cases')
  .option('--scorer <name>', 'Filter by scorer type')
  .option('--report <path>', 'Output report path')
  .option('--verbose', 'Show all scores')
  .action(async (workspace, opts) => {
    const abs = resolveWorkspace(workspace);
    const casesFile = path.join(abs, 'evals', 'cases.jsonl');
    if (!fs.existsSync(casesFile)) { console.error(`No cases: ${casesFile}`); process.exit(1); }

    let cases: EvalCase[] = fs.readFileSync(casesFile, 'utf-8')
      .split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
    if (opts.scorer) cases = cases.filter(c => c.scorers.includes(opts.scorer));

    const agentName = path.basename(abs);
    console.log(`\n📊 ${agentName} — ${cases.length} cases${opts.scorer ? ` (${opts.scorer})` : ''}\n`);

    const report: any[] = [];
    let passed = 0, failed = 0;
    const start = Date.now();

    for (const c of cases) {
      const trace: AgentTrace = {
        input: c.input,
        output: (c.mustContain || []).join('、'),
        toolCalls: (c.expectedTools || []).map(name => ({ name, arguments: {} })),
      };
      const scores = runScorers(c, trace);
      const allPass = scores.every(s => s.pass);
      if (allPass) passed++; else failed++;
      const input = c.input.length > 45 ? c.input.slice(0, 45) + '...' : c.input;
      const scorerTags = c.scorers.join(',');
      console.log(`  ${allPass ? '✅' : '❌'} [${scorerTags}] ${input}`);
      if ((!allPass || opts.verbose) && scores.length)
        for (const s of scores) if (!s.pass || opts.verbose)
          console.log(`     ${s.pass ? '✓' : '✗'} ${s.name}: ${s.score.toFixed(2)} — ${s.reason}`);
      report.push({ scorers: c.scorers, input: c.input, pass: allPass, scores: scores.map(s => ({ name: s.name, score: s.score, pass: s.pass, reason: s.reason })) });
    }

    const duration = Date.now() - start;
    const total = passed + failed;
    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : '0';
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`  ✅ ${passed}  ❌ ${failed}  📊 ${passRate}%  ⏱ ${duration}ms\n`);
    const reportPath = opts.report ? path.resolve(opts.report) : path.join(abs, 'evals', 'report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({ agent: agentName, workspace: abs, timestamp: new Date().toISOString(), duration, summary: { total, passed, failed, passRate: parseFloat(passRate) }, cases: report }, null, 2));
    console.log(`  📄 ${reportPath}\n`);
    process.exit(failed > 0 ? 1 : 0);
  });

// ---- info ----
program
  .command('info <workspace>')
  .description('Show agent info')
  .action(async (workspace) => {
    const abs = resolveWorkspace(workspace);
    console.log(`\n📁 ${path.basename(abs)}`);

    const ext = skillsExtension({ builtinDir: BUILTIN_SKILLS_DIR });
    await ext.setup?.({ workDir: abs, eventLoop: null as any });
    const info = ext.info?.() as any;

    if (info?.skills?.length) {
      console.log(`\n  📦 Skills:`);
      for (const s of info.skills) {
        const parts = [];
        if (s.scripts?.length) parts.push(`scripts: ${s.scripts.join(', ')}`);
        if (s.hooks?.length) parts.push(`hooks: ${s.hooks.join(', ')}`);
        console.log(`     ${s.name}${parts.length ? ` (${parts.join('; ')})` : ''}`);
      }
    }

    for (const f of ['AGENT.md', 'MEMORY.md', 'TOOLS.md', 'HEARTBEAT.md']) {
      if (fs.existsSync(path.join(abs, f))) {
        const line = fs.readFileSync(path.join(abs, f), 'utf-8').split('\n')[0].slice(0, 50);
        console.log(`  📝 ${f} — ${line}`);
      }
    }

    const casesFile = path.join(abs, 'evals', 'cases.jsonl');
    if (fs.existsSync(casesFile)) {
      const count = fs.readFileSync(casesFile, 'utf-8').split('\n').filter(l => l.trim()).length;
      console.log(`\n  📊 evals: ${count} cases`);
    }
    console.log();
  });

// ---- serve ----
program
  .command('serve <workspace>')
  .description('Start agent with all plugins')
  .option('-p, --port <port>', 'HTTP port', '4000')
  .action(async (workspace, opts) => {
    const abs = resolveWorkspace(workspace);

    const runner = new AgentRunner({
      workspace: abs,
      llm: createLLM(),
      session: new SQLiteSession(path.join(abs, '.agent-session.db')),
    })
      .use(skillsExtension({ builtinDir: BUILTIN_SKILLS_DIR }))
      .use(memoryExtension())
      .use(schedulerChannel())
      .use(httpChannel({ port: parseInt(opts.port) }));

    await runner.start();

    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...');
      await runner.stop();
      process.exit(0);
    });
  });

program.parse();
