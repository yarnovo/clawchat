import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { loadPersonaFiles, buildPersonaPrompt, appendMemory } from '../persona.js';

const testDir = '/tmp/test-persona-vitest';

function setup(files: Record<string, string>) {
  fs.mkdirSync(testDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(testDir, name), content);
  }
}

afterEach(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

describe('loadPersonaFiles', () => {
  it('loads AGENT.md as protected', () => {
    setup({ 'AGENT.md': '# Test Agent\nBe helpful.' });
    const files = loadPersonaFiles(testDir);
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('AGENT.md');
    expect(files[0].protected).toBe(true);
    expect(files[0].content).toContain('Test Agent');
  });

  it('loads files in order: AGENT → TOOLS → MEMORY → HEARTBEAT', () => {
    setup({
      'HEARTBEAT.md': 'every 30min',
      'AGENT.md': 'identity',
      'MEMORY.md': 'remember this',
      'TOOLS.md': 'bash, read',
    });
    const files = loadPersonaFiles(testDir);
    expect(files.map(f => f.name)).toEqual(['AGENT.md', 'TOOLS.md', 'MEMORY.md', 'HEARTBEAT.md']);
  });

  it('skips missing files', () => {
    setup({ 'AGENT.md': 'only this' });
    const files = loadPersonaFiles(testDir);
    expect(files).toHaveLength(1);
  });

  it('skips empty files', () => {
    setup({ 'AGENT.md': '', 'TOOLS.md': 'has content' });
    const files = loadPersonaFiles(testDir);
    expect(files).toHaveLength(1);
    expect(files[0].name).toBe('TOOLS.md');
  });

  it('truncates large files', () => {
    const bigContent = 'x'.repeat(30_000);
    setup({ 'AGENT.md': bigContent });
    const files = loadPersonaFiles(testDir);
    expect(files[0].content.length).toBeLessThan(25_000);
    expect(files[0].content).toContain('[truncated]');
  });
});

describe('buildPersonaPrompt', () => {
  it('builds system prompt with headers', () => {
    setup({ 'AGENT.md': 'Be a lawyer', 'TOOLS.md': 'bash available' });
    const files = loadPersonaFiles(testDir);
    const prompt = buildPersonaPrompt(files);
    expect(prompt).toContain('# Agent Context');
    expect(prompt).toContain('## Agent Identity');
    expect(prompt).toContain('Be a lawyer');
    expect(prompt).toContain('## Available Tools');
    expect(prompt).toContain('bash available');
  });

  it('returns empty string for no files', () => {
    expect(buildPersonaPrompt([])).toBe('');
  });
});

describe('appendMemory', () => {
  it('appends with date header', () => {
    setup({});
    appendMemory(testDir, 'learned something');
    const content = fs.readFileSync(path.join(testDir, 'MEMORY.md'), 'utf-8');
    expect(content).toContain('learned something');
    expect(content).toMatch(/## \d{4}-\d{2}-\d{2}/);
  });
});
