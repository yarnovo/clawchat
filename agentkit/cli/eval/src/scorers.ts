/**
 * Scorers — 评估评分器
 *
 * L1: toolCorrectness   — 工具调用名称匹配
 * L1: argumentCorrectness — 工具参数匹配
 * L2: trajectoryMatch    — 调用链顺序匹配
 * L3: contentCheck       — 关键词包含/排除
 * L3: llmJudge           — LLM 作为裁判评分
 */

export interface EvalCase {
  layer: 'L1' | 'L2' | 'L3';
  input: string;
  expectedTools?: string[];
  trajectory?: Array<{ tool: string; args?: Record<string, unknown> }>;
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
  score: number; // 0-1
  pass: boolean;
  reason?: string;
}

/**
 * L1: 工具调用是否正确
 */
export function toolCorrectness(trace: AgentTrace, expected: string[]): ScoreResult {
  if (expected.length === 0 && trace.toolCalls.length === 0) {
    return { name: 'toolCorrectness', score: 1, pass: true, reason: 'No tools expected or called' };
  }

  const called = trace.toolCalls.map(t => t.name);
  const matched = expected.filter(e => called.includes(e));
  const score = expected.length > 0 ? matched.length / expected.length : (called.length === 0 ? 1 : 0);
  const missing = expected.filter(e => !called.includes(e));
  const extra = called.filter(c => !expected.includes(c));

  return {
    name: 'toolCorrectness',
    score,
    pass: score >= 0.8,
    reason: missing.length > 0
      ? `Missing: ${missing.join(', ')}${extra.length > 0 ? ` | Extra: ${extra.join(', ')}` : ''}`
      : extra.length > 0 ? `Extra tools: ${extra.join(', ')}` : 'All tools matched',
  };
}

/**
 * L2: 调用链顺序是否匹配
 */
export function trajectoryMatch(
  trace: AgentTrace,
  expected: Array<{ tool: string }>,
): ScoreResult {
  const actual = trace.toolCalls.map(t => t.name);
  const expectedNames = expected.map(e => e.tool);

  if (expectedNames.length === 0) {
    return { name: 'trajectoryMatch', score: 1, pass: true, reason: 'No trajectory expected' };
  }

  // 顺序子序列匹配
  let j = 0;
  for (let i = 0; i < actual.length && j < expectedNames.length; i++) {
    if (actual[i] === expectedNames[j]) j++;
  }
  const score = j / expectedNames.length;

  return {
    name: 'trajectoryMatch',
    score,
    pass: score >= 0.8,
    reason: score < 1
      ? `Expected: [${expectedNames.join(' → ')}] | Actual: [${actual.join(' → ')}]`
      : 'Trajectory matched',
  };
}

/**
 * L3: 关键词检查（确定性）
 */
export function contentCheck(
  output: string,
  mustContain: string[],
  mustNotContain: string[],
): ScoreResult {
  const missing = mustContain.filter(k => !output.includes(k));
  const forbidden = mustNotContain.filter(k => output.includes(k));
  const total = mustContain.length + mustNotContain.length;
  const failures = missing.length + forbidden.length;
  const score = total > 0 ? (total - failures) / total : 1;

  const reasons: string[] = [];
  if (missing.length) reasons.push(`Missing: ${missing.join(', ')}`);
  if (forbidden.length) reasons.push(`Forbidden found: ${forbidden.join(', ')}`);

  return {
    name: 'contentCheck',
    score,
    pass: failures === 0,
    reason: reasons.length > 0 ? reasons.join(' | ') : 'All checks passed',
  };
}

/**
 * L3: LLM 作为裁判（需要 LLM Provider）
 */
export async function llmJudge(
  input: string,
  output: string,
  llm: { chat: (messages: any[]) => Promise<{ content: string | null }> },
): Promise<ScoreResult> {
  const prompt = `You are an expert evaluator. Rate the quality of the AI assistant's response.

User input: ${input}

Assistant output: ${output}

Rate from 0 to 10 where:
- 0-3: Poor (incorrect, irrelevant, or harmful)
- 4-6: Acceptable (partially correct, could be better)
- 7-9: Good (correct, helpful, well-structured)
- 10: Excellent (perfect response)

Respond with ONLY a JSON object: {"score": <number>, "reason": "<brief explanation>"}`;

  try {
    const response = await llm.chat([{ role: 'user', content: prompt }]);
    const parsed = JSON.parse(response.content || '{}');
    const score = (parsed.score || 0) / 10;
    return {
      name: 'llmJudge',
      score,
      pass: score >= 0.7,
      reason: parsed.reason || 'No reason',
    };
  } catch {
    return { name: 'llmJudge', score: 0, pass: false, reason: 'LLM judge failed' };
  }
}
