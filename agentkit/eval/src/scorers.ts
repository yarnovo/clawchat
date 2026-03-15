/**
 * Scorers — L1/L2/L3 评估评分器
 */

export interface EvalCase {
  layer: 'L1' | 'L2' | 'L3';
  input: string;
  expectedTools?: string[];
  trajectory?: Array<{ tool: string }>;
  mustContain?: string[];
  mustNotContain?: string[];
  scenario?: string;
}

export interface AgentTrace {
  input: string;
  output: string;
  toolCalls: Array<{ name: string; arguments: Record<string, unknown> }>;
}

export interface ScoreResult {
  name: string;
  score: number;
  pass: boolean;
  reason?: string;
}

export function toolCorrectness(trace: AgentTrace, expected: string[]): ScoreResult {
  if (expected.length === 0 && trace.toolCalls.length === 0)
    return { name: 'toolCorrectness', score: 1, pass: true, reason: 'No tools expected or called' };
  const called = trace.toolCalls.map(t => t.name);
  const matched = expected.filter(e => called.includes(e));
  const score = expected.length > 0 ? matched.length / expected.length : (called.length === 0 ? 1 : 0);
  const missing = expected.filter(e => !called.includes(e));
  return { name: 'toolCorrectness', score, pass: score >= 0.8, reason: missing.length > 0 ? `Missing: ${missing.join(', ')}` : 'All tools matched' };
}

export function trajectoryMatch(trace: AgentTrace, expected: Array<{ tool: string }>): ScoreResult {
  const actual = trace.toolCalls.map(t => t.name);
  const expectedNames = expected.map(e => e.tool);
  if (expectedNames.length === 0) return { name: 'trajectoryMatch', score: 1, pass: true, reason: 'No trajectory expected' };
  let j = 0;
  for (let i = 0; i < actual.length && j < expectedNames.length; i++) {
    if (actual[i] === expectedNames[j]) j++;
  }
  const score = j / expectedNames.length;
  return { name: 'trajectoryMatch', score, pass: score >= 0.8, reason: score < 1 ? `Expected: [${expectedNames.join(' → ')}] | Actual: [${actual.join(' → ')}]` : 'Trajectory matched' };
}

export function contentCheck(output: string, mustContain: string[], mustNotContain: string[]): ScoreResult {
  const missing = mustContain.filter(k => !output.includes(k));
  const forbidden = mustNotContain.filter(k => output.includes(k));
  const total = mustContain.length + mustNotContain.length;
  const failures = missing.length + forbidden.length;
  const score = total > 0 ? (total - failures) / total : 1;
  const reasons: string[] = [];
  if (missing.length) reasons.push(`Missing: ${missing.join(', ')}`);
  if (forbidden.length) reasons.push(`Forbidden: ${forbidden.join(', ')}`);
  return { name: 'contentCheck', score, pass: failures === 0, reason: reasons.join(' | ') || 'All checks passed' };
}
