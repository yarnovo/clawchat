#!/usr/bin/env node
/**
 * agent-eval CLI
 *
 * Usage:
 *   agent-eval test <workspace>           跑该 Agent 的所有评估用例
 *   agent-eval test <workspace> --layer L1  只跑某一层
 */
import fs from 'fs';
import path from 'path';
import { toolCorrectness, trajectoryMatch, contentCheck, llmJudge } from './scorers.js';
import type { EvalCase, AgentTrace, ScoreResult } from './scorers.js';

const [,, command, workDir, ...rest] = process.argv;

if (!command || command === '--help') {
  console.log(`
  agent-eval — Agent evaluation CLI

  Usage:
    agent-eval test <workspace>              Run all eval cases
    agent-eval test <workspace> --layer L1   Run only L1 cases
    agent-eval test <workspace> --layer L2   Run only L2 cases
    agent-eval test <workspace> --layer L3   Run only L3 cases
  `);
  process.exit(0);
}

function loadCases(dir: string): EvalCase[] {
  const file = path.join(dir, 'evals', 'cases.jsonl');
  if (!fs.existsSync(file)) {
    console.error(`No eval cases found: ${file}`);
    process.exit(1);
  }
  return fs.readFileSync(file, 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

/**
 * 模拟 Agent trace（实际应调 agent-core run 拿真实输出）
 * 这里先用确定性评估，不需要真实 Agent
 */
function mockTrace(c: EvalCase): AgentTrace {
  return {
    input: c.input,
    output: c.mustContain?.join(', ') || '',
    toolCalls: (c.expectedTools || []).map(name => ({ name, arguments: {} })),
  };
}

function scoreCase(c: EvalCase, trace: AgentTrace): ScoreResult[] {
  const results: ScoreResult[] = [];

  switch (c.layer) {
    case 'L1':
      results.push(toolCorrectness(trace, c.expectedTools || []));
      if (c.mustContain?.length || c.mustNotContain?.length) {
        results.push(contentCheck(trace.output, c.mustContain || [], c.mustNotContain || []));
      }
      break;
    case 'L2':
      if (c.trajectory) {
        results.push(trajectoryMatch(trace, c.trajectory));
      }
      if (c.mustContain?.length || c.mustNotContain?.length) {
        results.push(contentCheck(trace.output, c.mustContain || [], c.mustNotContain || []));
      }
      break;
    case 'L3':
      results.push(contentCheck(trace.output, c.mustContain || [], c.mustNotContain || []));
      break;
  }

  return results;
}

async function testCommand() {
  const abs = path.resolve(workDir!);
  const layerFilter = rest.indexOf('--layer') !== -1 ? rest[rest.indexOf('--layer') + 1] : null;

  let cases = loadCases(abs);
  if (layerFilter) {
    cases = cases.filter(c => c.layer === layerFilter);
  }

  console.log(`\n📊 Evaluating: ${abs}`);
  console.log(`   Cases: ${cases.length}${layerFilter ? ` (layer: ${layerFilter})` : ''}\n`);

  let passed = 0;
  let failed = 0;

  for (const c of cases) {
    const trace = mockTrace(c);
    const scores = scoreCase(c, trace);

    const allPass = scores.every(s => s.pass);
    const icon = allPass ? '✅' : '❌';
    const input = c.input.slice(0, 40);

    if (allPass) {
      passed++;
      console.log(`  ${icon} [${c.layer}] ${input}`);
    } else {
      failed++;
      console.log(`  ${icon} [${c.layer}] ${input}`);
      for (const s of scores.filter(s => !s.pass)) {
        console.log(`     ↳ ${s.name}: ${s.score.toFixed(2)} — ${s.reason}`);
      }
    }
  }

  console.log(`\n  Results: ${passed} passed, ${failed} failed, ${cases.length} total\n`);
  process.exit(failed > 0 ? 1 : 0);
}

async function main() {
  switch (command) {
    case 'test':
      if (!workDir) { console.error('Usage: agent-eval test <workspace>'); process.exit(1); }
      await testCommand();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
