/**
 * Eval Scorers — 按测试类型评分
 *
 * 三种评分器：
 * - toolCorrectness: Agent 是否调了正确的工具
 * - trajectoryMatch: 工具调用顺序是否匹配
 * - contentCheck: 回复是否包含/不包含关键词
 *
 * 每个用例直接声明用哪些评分器，不分层级。
 */

export type ScorerName = 'toolCorrectness' | 'trajectoryMatch' | 'contentCheck';

export interface EvalCase {
  /** 用哪些评分器 */
  scorers: ScorerName[];
  /** 输入 */
  input: string;
  /** 场景描述（可选） */
  scenario?: string;
  /** toolCorrectness: 期望调用的工具 */
  expectedTools?: string[];
  /** trajectoryMatch: 期望的调用轨迹 */
  trajectory?: Array<{ tool: string }>;
  /** contentCheck: 必须包含 */
  mustContain?: string[];
  /** contentCheck: 不能包含 */
  mustNotContain?: string[];
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

// ---- 评分器 ----

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

/** 根据用例声明的 scorers 运行评分 */
export function runScorers(c: EvalCase, trace: AgentTrace): ScoreResult[] {
  const results: ScoreResult[] = [];
  for (const name of c.scorers) {
    if (name === 'toolCorrectness') {
      results.push(toolCorrectness(trace, c.expectedTools || []));
    } else if (name === 'trajectoryMatch') {
      results.push(trajectoryMatch(trace, c.trajectory || []));
    } else if (name === 'contentCheck') {
      results.push(contentCheck(trace.output, c.mustContain || [], c.mustNotContain || []));
    }
  }
  return results;
}
