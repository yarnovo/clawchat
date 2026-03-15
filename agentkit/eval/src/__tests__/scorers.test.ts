import { describe, it, expect } from 'vitest';
import {
  toolCorrectness,
  trajectoryMatch,
  contentCheck,
  runScorers,
  type AgentTrace,
  type EvalCase,
} from '../scorers.js';

// ---- helpers ----

function makeTrace(
  toolNames: string[] = [],
  output = '',
  input = 'test input',
): AgentTrace {
  return {
    input,
    output,
    toolCalls: toolNames.map(name => ({ name, arguments: {} })),
  };
}

// ============================================================
// toolCorrectness
// ============================================================

describe('toolCorrectness', () => {
  it('no tools expected, no tools called -> score 1, pass', () => {
    const result = toolCorrectness(makeTrace([]), []);
    expect(result).toEqual({
      name: 'toolCorrectness',
      score: 1,
      pass: true,
      reason: 'No tools expected or called',
    });
  });

  it('all expected tools called -> score 1, pass', () => {
    const result = toolCorrectness(
      makeTrace(['search', 'read']),
      ['search', 'read'],
    );
    expect(result.score).toBe(1);
    expect(result.pass).toBe(true);
    expect(result.reason).toBe('All tools matched');
  });

  it('some expected tools missing -> score < 1, reports missing', () => {
    const result = toolCorrectness(
      makeTrace(['search']),
      ['search', 'read', 'write'],
    );
    // matched: ['search'], expected: 3 -> score = 1/3
    expect(result.score).toBeCloseTo(1 / 3);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('Missing');
    expect(result.reason).toContain('read');
    expect(result.reason).toContain('write');
  });

  it('no tools expected but some called -> score 0', () => {
    const result = toolCorrectness(makeTrace(['search', 'read']), []);
    // expected.length === 0, called.length > 0 -> score 0
    expect(result.score).toBe(0);
    expect(result.pass).toBe(false);
  });

  it('pass threshold is 0.8 — 4/5 matched passes', () => {
    const result = toolCorrectness(
      makeTrace(['a', 'b', 'c', 'd']),
      ['a', 'b', 'c', 'd', 'e'],
    );
    expect(result.score).toBe(4 / 5);
    expect(result.pass).toBe(true);
    expect(result.reason).toContain('Missing');
    expect(result.reason).toContain('e');
  });

  it('pass threshold is 0.8 — 3/5 matched fails', () => {
    const result = toolCorrectness(
      makeTrace(['a', 'b', 'c']),
      ['a', 'b', 'c', 'd', 'e'],
    );
    expect(result.score).toBe(3 / 5);
    expect(result.pass).toBe(false);
  });
});

// ============================================================
// trajectoryMatch
// ============================================================

describe('trajectoryMatch', () => {
  it('empty expected trajectory -> score 1, pass', () => {
    const result = trajectoryMatch(makeTrace(['a', 'b']), []);
    expect(result).toEqual({
      name: 'trajectoryMatch',
      score: 1,
      pass: true,
      reason: 'No trajectory expected',
    });
  });

  it('exact match -> score 1', () => {
    const result = trajectoryMatch(
      makeTrace(['search', 'read']),
      [{ tool: 'search' }, { tool: 'read' }],
    );
    expect(result.score).toBe(1);
    expect(result.pass).toBe(true);
    expect(result.reason).toBe('Trajectory matched');
  });

  it('subsequence match (extra tools in actual) -> score 1', () => {
    const result = trajectoryMatch(
      makeTrace(['init', 'search', 'validate', 'read', 'cleanup']),
      [{ tool: 'search' }, { tool: 'read' }],
    );
    expect(result.score).toBe(1);
    expect(result.pass).toBe(true);
    expect(result.reason).toBe('Trajectory matched');
  });

  it('partial match -> score between 0 and 1', () => {
    // expected: [search, read, write], actual: [search, write]
    // subsequence scan: search matches (j=1), write != read (skip) -> j=1
    // score = 1/3
    const result = trajectoryMatch(
      makeTrace(['search', 'write']),
      [{ tool: 'search' }, { tool: 'read' }, { tool: 'write' }],
    );
    expect(result.score).toBeCloseTo(1 / 3);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('Expected');
    expect(result.reason).toContain('Actual');
  });

  it('partial match with reordered subsequence', () => {
    // expected: [a, b, c], actual: [a, c, b]
    // subsequence: a matches (j=1), c != b, b == b (j=2) -> score=2/3
    const result = trajectoryMatch(
      makeTrace(['a', 'c', 'b']),
      [{ tool: 'a' }, { tool: 'b' }, { tool: 'c' }],
    );
    expect(result.score).toBeCloseTo(2 / 3);
    expect(result.pass).toBe(false);
  });

  it('no match -> score 0', () => {
    const result = trajectoryMatch(
      makeTrace(['x', 'y', 'z']),
      [{ tool: 'a' }, { tool: 'b' }],
    );
    expect(result.score).toBe(0);
    expect(result.pass).toBe(false);
  });

  it('pass threshold is 0.8 — 4/5 matched passes', () => {
    // expected: [a, b, c, d, e], actual: [a, b, c, d]
    // subsequence matching: a,b,c,d all match -> j=4, score=4/5=0.8
    const result = trajectoryMatch(
      makeTrace(['a', 'b', 'c', 'd']),
      [{ tool: 'a' }, { tool: 'b' }, { tool: 'c' }, { tool: 'd' }, { tool: 'e' }],
    );
    expect(result.score).toBe(4 / 5);
    expect(result.pass).toBe(true);
  });

  it('reason includes arrow-separated tool names when score < 1', () => {
    const result = trajectoryMatch(
      makeTrace(['a']),
      [{ tool: 'a' }, { tool: 'b' }],
    );
    expect(result.reason).toContain('a \u2192 b'); // expected arrow format
    expect(result.reason).toContain('Actual: [a]');
  });
});

// ============================================================
// contentCheck
// ============================================================

describe('contentCheck', () => {
  it('all mustContain present -> pass', () => {
    const result = contentCheck(
      'The quick brown fox jumps over the lazy dog',
      ['quick', 'fox', 'dog'],
      [],
    );
    expect(result.pass).toBe(true);
    expect(result.score).toBe(1);
    expect(result.reason).toBe('All checks passed');
  });

  it('some mustContain missing -> fail, reports missing', () => {
    const result = contentCheck(
      'The quick brown fox',
      ['quick', 'fox', 'dog', 'cat'],
      [],
    );
    expect(result.pass).toBe(false);
    expect(result.score).toBe(2 / 4); // 2 of 4 mustContain present
    expect(result.reason).toContain('Missing');
    expect(result.reason).toContain('dog');
    expect(result.reason).toContain('cat');
  });

  it('mustNotContain present -> fail, reports forbidden', () => {
    const result = contentCheck(
      'The quick brown fox',
      [],
      ['quick', 'missing'],
    );
    expect(result.pass).toBe(false);
    // total = 2, failures = 1 (quick is present = forbidden), score = 1/2
    expect(result.score).toBe(1 / 2);
    expect(result.reason).toContain('Forbidden');
    expect(result.reason).toContain('quick');
  });

  it('empty arrays -> pass with score 1', () => {
    const result = contentCheck('anything', [], []);
    expect(result.pass).toBe(true);
    expect(result.score).toBe(1);
    expect(result.reason).toBe('All checks passed');
  });

  it('both mustContain and mustNotContain checks combined', () => {
    const output = 'hello world';
    const result = contentCheck(
      output,
      ['hello', 'missing'],   // 1 present, 1 missing
      ['world', 'absent'],    // 1 forbidden (world present), 1 ok (absent not present)
    );
    // total = 4, failures = 2 (missing + world), score = 2/4 = 0.5
    expect(result.score).toBe(0.5);
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('Missing');
    expect(result.reason).toContain('missing');
    expect(result.reason).toContain('Forbidden');
    expect(result.reason).toContain('world');
  });

  it('all mustNotContain absent -> pass', () => {
    const result = contentCheck(
      'hello world',
      [],
      ['foo', 'bar'],
    );
    expect(result.pass).toBe(true);
    expect(result.score).toBe(1);
    expect(result.reason).toBe('All checks passed');
  });
});

// ============================================================
// runScorers
// ============================================================

describe('runScorers', () => {
  it('dispatches toolCorrectness', () => {
    const evalCase: EvalCase = {
      scorers: ['toolCorrectness'],
      input: 'test',
      expectedTools: ['search'],
    };
    const trace = makeTrace(['search'], 'output');
    const results = runScorers(evalCase, trace);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('toolCorrectness');
    expect(results[0].score).toBe(1);
    expect(results[0].pass).toBe(true);
  });

  it('dispatches trajectoryMatch', () => {
    const evalCase: EvalCase = {
      scorers: ['trajectoryMatch'],
      input: 'test',
      trajectory: [{ tool: 'a' }, { tool: 'b' }],
    };
    const trace = makeTrace(['a', 'b'], 'output');
    const results = runScorers(evalCase, trace);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('trajectoryMatch');
    expect(results[0].score).toBe(1);
    expect(results[0].pass).toBe(true);
  });

  it('dispatches contentCheck', () => {
    const evalCase: EvalCase = {
      scorers: ['contentCheck'],
      input: 'test',
      mustContain: ['hello'],
      mustNotContain: ['bad'],
    };
    const trace = makeTrace([], 'hello world');
    const results = runScorers(evalCase, trace);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('contentCheck');
    expect(results[0].pass).toBe(true);
  });

  it('multiple scorers in one case', () => {
    const evalCase: EvalCase = {
      scorers: ['toolCorrectness', 'trajectoryMatch', 'contentCheck'],
      input: 'test',
      expectedTools: ['search'],
      trajectory: [{ tool: 'search' }],
      mustContain: ['result'],
    };
    const trace = makeTrace(['search'], 'result found');
    const results = runScorers(evalCase, trace);
    expect(results).toHaveLength(3);
    expect(results[0].name).toBe('toolCorrectness');
    expect(results[1].name).toBe('trajectoryMatch');
    expect(results[2].name).toBe('contentCheck');
    results.forEach(r => {
      expect(r.pass).toBe(true);
      expect(r.score).toBe(1);
    });
  });

  it('empty scorers array -> empty results', () => {
    const evalCase: EvalCase = {
      scorers: [],
      input: 'test',
    };
    const trace = makeTrace(['anything'], 'output');
    const results = runScorers(evalCase, trace);
    expect(results).toEqual([]);
  });

  it('defaults to empty arrays when optional fields are omitted', () => {
    // toolCorrectness with no expectedTools -> defaults to []
    const tc: EvalCase = { scorers: ['toolCorrectness'], input: 'test' };
    const traceNoTools = makeTrace([], '');
    const r1 = runScorers(tc, traceNoTools);
    expect(r1[0].score).toBe(1); // no expected, no called

    // trajectoryMatch with no trajectory -> defaults to []
    const tm: EvalCase = { scorers: ['trajectoryMatch'], input: 'test' };
    const r2 = runScorers(tm, makeTrace(['a'], ''));
    expect(r2[0].score).toBe(1); // empty expected -> pass

    // contentCheck with no mustContain/mustNotContain -> defaults to []
    const cc: EvalCase = { scorers: ['contentCheck'], input: 'test' };
    const r3 = runScorers(cc, makeTrace([], 'any'));
    expect(r3[0].score).toBe(1); // empty arrays -> pass
  });
});
