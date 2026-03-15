import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { loadPersonaFiles, loadSkills, buildPersonaPrompt, appendMemory } from '../persona.js';

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

describe('loadSkills', () => {
  it('loads SKILL.md from subdirectories', () => {
    setup({ 'AGENT.md': 'base' });
    fs.mkdirSync(path.join(testDir, 'skills', 'legal'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'skills', 'legal', 'SKILL.md'), '审查合同条款');
    const skills = loadSkills(testDir);
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('skill:legal');
    expect(skills[0].content).toBe('审查合同条款');
  });

  it('loads flat .md files from skills/', () => {
    setup({ 'AGENT.md': 'base' });
    fs.mkdirSync(path.join(testDir, 'skills'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'skills', 'translate.md'), '翻译技能');
    const skills = loadSkills(testDir);
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('skill:translate');
  });

  it('loads multiple skills', () => {
    setup({ 'AGENT.md': 'base' });
    fs.mkdirSync(path.join(testDir, 'skills', 'a'), { recursive: true });
    fs.mkdirSync(path.join(testDir, 'skills', 'b'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'skills', 'a', 'SKILL.md'), 'skill a');
    fs.writeFileSync(path.join(testDir, 'skills', 'b', 'SKILL.md'), 'skill b');
    const skills = loadSkills(testDir);
    expect(skills).toHaveLength(2);
  });

  it('returns empty for no skills dir', () => {
    setup({ 'AGENT.md': 'base' });
    expect(loadSkills(testDir)).toHaveLength(0);
  });

  it('skills appear in persona prompt with Skill: header', () => {
    setup({ 'AGENT.md': 'identity' });
    fs.mkdirSync(path.join(testDir, 'skills', 'legal'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'skills', 'legal', 'SKILL.md'), '审查合同');
    const files = loadPersonaFiles(testDir);
    const prompt = buildPersonaPrompt(files);
    expect(prompt).toContain('## Skill: legal');
    expect(prompt).toContain('审查合同');
  });

  it('skills load between MEMORY and HEARTBEAT', () => {
    setup({ 'AGENT.md': 'a', 'MEMORY.md': 'm', 'HEARTBEAT.md': 'h' });
    fs.mkdirSync(path.join(testDir, 'skills', 'x'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'skills', 'x', 'SKILL.md'), 's');
    const files = loadPersonaFiles(testDir);
    const names = files.map(f => f.name);
    expect(names).toEqual(['AGENT.md', 'MEMORY.md', 'skill:x', 'HEARTBEAT.md']);
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
