#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { Agent, OpenAIProvider, SQLiteSession, loadPersonaFiles } from '@agentkit/core';
import { builtinTools } from '@agentkit/tools';
import { toolCorrectness, trajectoryMatch, contentCheck } from '@agentkit/eval';
import type { EvalCase, AgentTrace, ScoreResult } from '@agentkit/eval';

const program = new Command();
program.name('agentkit').description('AgentKit — run, eval, info').version('0.0.1');

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
  .description('Start the agent')
  .option('-m, --message <msg>', 'Single message mode')
  .action(async (workspace, opts) => {
    const abs = resolveWorkspace(workspace);
    const session = new SQLiteSession(path.join(abs, '.agent-session.db'));
    const agent = new Agent({
      llm: createLLM(), tools: builtinTools(), workDir: abs, session,
      onToolCall: (n, a) => console.log(`  🔧 ${n}(${JSON.stringify(a).slice(0, 80)})`),
      onToolResult: (n, r) => console.log(`  ✅ ${n} → ${r.content.slice(0, 80)}`),
    });

    if (opts.message) {
      console.log(await agent.run(opts.message));
      session.close();
      return;
    }

    const files = loadPersonaFiles(abs);
    console.log(`\n🤖 ${path.basename(abs)}  [${files.map(f => f.name).join(', ')}]`);
    console.log(`   exit to quit\n`);
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const ask = () => rl.question('👤 > ', async (input) => {
      if (!input.trim() || input.trim() === 'exit') { session.close(); rl.close(); return; }
      console.log(`\n🤖 ${await agent.run(input)}\n`);
      ask();
    });
    ask();
  });

// ---- eval ----
program
  .command('eval <workspace>')
  .description('Run eval cases')
  .option('--layer <layer>', 'Filter by layer (L1/L2/L3)')
  .option('--report <path>', 'Output report path (default: workspace/evals/report.json)')
  .option('--verbose', 'Show all scores')
  .action(async (workspace, opts) => {
    const abs = resolveWorkspace(workspace);
    const casesFile = path.join(abs, 'evals', 'cases.jsonl');
    if (!fs.existsSync(casesFile)) { console.error(`No cases: ${casesFile}`); process.exit(1); }

    let cases: EvalCase[] = fs.readFileSync(casesFile, 'utf-8')
      .split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
    if (opts.layer) cases = cases.filter(c => c.layer === opts.layer);

    const agentName = path.basename(abs);
    console.log(`\n📊 ${agentName} — ${cases.length} cases${opts.layer ? ` (${opts.layer})` : ''}\n`);

    const report: any[] = [];
    let passed = 0, failed = 0;
    const start = Date.now();

    for (const c of cases) {
      const trace: AgentTrace = {
        input: c.input,
        output: (c.mustContain || []).join('、'),
        toolCalls: (c.expectedTools || []).map(name => ({ name, arguments: {} })),
      };

      const scores: ScoreResult[] = [];
      if (c.layer === 'L1') {
        scores.push(toolCorrectness(trace, c.expectedTools || []));
        if (c.mustContain?.length || c.mustNotContain?.length)
          scores.push(contentCheck(trace.output, c.mustContain || [], c.mustNotContain || []));
      } else if (c.layer === 'L2') {
        if (c.trajectory) scores.push(trajectoryMatch(trace, c.trajectory));
        if (c.mustContain?.length || c.mustNotContain?.length)
          scores.push(contentCheck(trace.output, c.mustContain || [], c.mustNotContain || []));
      } else {
        scores.push(contentCheck(trace.output, c.mustContain || [], c.mustNotContain || []));
      }

      const allPass = scores.every(s => s.pass);
      if (allPass) passed++; else failed++;
      const input = c.input.length > 45 ? c.input.slice(0, 45) + '...' : c.input;
      console.log(`  ${allPass ? '✅' : '❌'} [${c.layer}] ${input}`);
      if ((!allPass || opts.verbose) && scores.length)
        for (const s of scores) if (!s.pass || opts.verbose)
          console.log(`     ${s.pass ? '✓' : '✗'} ${s.name}: ${s.score.toFixed(2)} — ${s.reason}`);

      report.push({ layer: c.layer, input: c.input, pass: allPass, scores: scores.map(s => ({ name: s.name, score: s.score, pass: s.pass, reason: s.reason })) });
    }

    const duration = Date.now() - start;
    const total = passed + failed;
    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : '0';
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`  ✅ ${passed}  ❌ ${failed}  📊 ${passRate}%  ⏱ ${duration}ms\n`);

    const reportPath = opts.report ? path.resolve(opts.report) : path.join(abs, 'evals', 'report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify({
      agent: agentName, workspace: abs, timestamp: new Date().toISOString(), duration,
      summary: { total, passed, failed, passRate: parseFloat(passRate) }, cases: report,
    }, null, 2));
    console.log(`  📄 ${reportPath}\n`);
    process.exit(failed > 0 ? 1 : 0);
  });

// ---- info ----
program
  .command('info <workspace>')
  .description('Show agent info')
  .action((workspace) => {
    const abs = resolveWorkspace(workspace);
    const files = loadPersonaFiles(abs);
    console.log(`\n📁 ${path.basename(abs)}`);
    for (const f of files) console.log(`  ${f.protected ? '🔒' : '📝'} ${f.name} — ${f.content.split('\n')[0].slice(0, 50)}`);
    const casesFile = path.join(abs, 'evals', 'cases.jsonl');
    if (fs.existsSync(casesFile)) {
      const count = fs.readFileSync(casesFile, 'utf-8').split('\n').filter(l => l.trim()).length;
      console.log(`  📊 evals: ${count} cases`);
    }
    console.log();
  });

program.parse();
