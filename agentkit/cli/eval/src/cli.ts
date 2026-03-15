#!/usr/bin/env node
/**
 * agent-eval CLI — Agent 评估工具
 */
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { toolCorrectness, trajectoryMatch, contentCheck } from './scorers.js';
import type { EvalCase, AgentTrace, ScoreResult } from './scorers.js';

const program = new Command();

program
  .name('agent-eval')
  .description('Agent evaluation CLI — L1/L2/L3 coverage')
  .version('0.0.1');

program
  .command('test <workspace>')
  .description('Run eval cases for an agent workspace')
  .option('--layer <layer>', 'Filter by layer (L1/L2/L3)')
  .option('--report <path>', 'Output JSON report to file')
  .option('--verbose', 'Show detailed scoring for all cases')
  .action(async (workspace: string, opts: { layer?: string; report?: string; verbose?: boolean }) => {
    const abs = path.resolve(workspace);
    const casesFile = path.join(abs, 'evals', 'cases.jsonl');

    if (!fs.existsSync(casesFile)) {
      console.error(`Error: ${casesFile} not found`);
      process.exit(1);
    }

    let cases: EvalCase[] = fs.readFileSync(casesFile, 'utf-8')
      .split('\n').filter(l => l.trim()).map(l => JSON.parse(l));

    if (opts.layer) {
      cases = cases.filter(c => c.layer === opts.layer);
    }

    const agentName = path.basename(abs);
    console.log(`\n📊 Agent: ${agentName}`);
    console.log(`   Cases: ${cases.length}${opts.layer ? ` (${opts.layer})` : ''}\n`);

    const report: ReportEntry[] = [];
    let passed = 0;
    let failed = 0;
    const startTime = Date.now();

    for (const c of cases) {
      const trace = mockTrace(c);
      const scores = scoreCase(c, trace);
      const allPass = scores.every(s => s.pass);

      if (allPass) passed++;
      else failed++;

      const icon = allPass ? '✅' : '❌';
      const input = c.input.length > 45 ? c.input.slice(0, 45) + '...' : c.input;
      console.log(`  ${icon} [${c.layer}] ${input}`);

      if ((!allPass || opts.verbose) && scores.length > 0) {
        for (const s of scores) {
          if (!s.pass || opts.verbose) {
            const sIcon = s.pass ? '  ✓' : '  ✗';
            console.log(`     ${sIcon} ${s.name}: ${s.score.toFixed(2)} — ${s.reason}`);
          }
        }
      }

      report.push({
        layer: c.layer,
        input: c.input,
        pass: allPass,
        scores: scores.map(s => ({ name: s.name, score: s.score, pass: s.pass, reason: s.reason })),
      });
    }

    const duration = Date.now() - startTime;
    const total = passed + failed;
    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : '0';

    console.log(`\n${'─'.repeat(50)}`);
    console.log(`  ✅ Passed: ${passed}  ❌ Failed: ${failed}  📊 Rate: ${passRate}%  ⏱ ${duration}ms\n`);

    // 输出报告
    if (opts.report) {
      const fullReport: EvalReport = {
        agent: agentName,
        workspace: abs,
        timestamp: new Date().toISOString(),
        duration,
        summary: { total, passed, failed, passRate: parseFloat(passRate) },
        cases: report,
      };
      const reportPath = path.resolve(opts.report);
      fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));
      console.log(`  📄 Report: ${reportPath}\n`);
    }

    process.exit(failed > 0 ? 1 : 0);
  });

program
  .command('list <workspace>')
  .description('List all eval cases for an agent')
  .action((workspace: string) => {
    const abs = path.resolve(workspace);
    const casesFile = path.join(abs, 'evals', 'cases.jsonl');

    if (!fs.existsSync(casesFile)) {
      console.error(`Error: ${casesFile} not found`);
      process.exit(1);
    }

    const cases: EvalCase[] = fs.readFileSync(casesFile, 'utf-8')
      .split('\n').filter(l => l.trim()).map(l => JSON.parse(l));

    const layers = { L1: 0, L2: 0, L3: 0 };
    for (const c of cases) layers[c.layer]++;

    console.log(`\n📋 ${path.basename(abs)} — ${cases.length} cases`);
    console.log(`   L1: ${layers.L1}  L2: ${layers.L2}  L3: ${layers.L3}\n`);

    for (const c of cases) {
      const input = c.input.length > 50 ? c.input.slice(0, 50) + '...' : c.input;
      console.log(`  [${c.layer}] ${input}`);
    }
    console.log();
  });

program.parse();

// --- Types ---

interface ReportEntry {
  layer: string;
  input: string;
  pass: boolean;
  scores: Array<{ name: string; score: number; pass: boolean; reason?: string }>;
}

interface EvalReport {
  agent: string;
  workspace: string;
  timestamp: string;
  duration: number;
  summary: { total: number; passed: number; failed: number; passRate: number };
  cases: ReportEntry[];
}

// --- Helpers ---

function mockTrace(c: EvalCase): AgentTrace {
  return {
    input: c.input,
    output: (c.mustContain || []).join('、'),
    toolCalls: (c.expectedTools || []).map(name => ({ name, arguments: {} })),
  };
}

function scoreCase(c: EvalCase, trace: AgentTrace): ScoreResult[] {
  const results: ScoreResult[] = [];
  switch (c.layer) {
    case 'L1':
      results.push(toolCorrectness(trace, c.expectedTools || []));
      if (c.mustContain?.length || c.mustNotContain?.length)
        results.push(contentCheck(trace.output, c.mustContain || [], c.mustNotContain || []));
      break;
    case 'L2':
      if (c.trajectory)
        results.push(trajectoryMatch(trace, c.trajectory));
      if (c.mustContain?.length || c.mustNotContain?.length)
        results.push(contentCheck(trace.output, c.mustContain || [], c.mustNotContain || []));
      break;
    case 'L3':
      results.push(contentCheck(trace.output, c.mustContain || [], c.mustNotContain || []));
      break;
  }
  return results;
}
