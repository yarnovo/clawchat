import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { skillsExtension, type Skill } from '../index.js';
import type { AgenticContext } from '@agentkit/agentic';

// ---- helpers ----

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'skills-test-'));
}

function rmrf(dir: string) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function writeFile(filepath: string, content: string) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, content);
}

function writeExecutable(filepath: string, content: string) {
  writeFile(filepath, content);
  fs.chmodSync(filepath, 0o755);
}

function makeCtx(workDir: string): AgenticContext {
  return { workDir, eventLoop: null as any };
}

// ---- tests ----

describe('skillsExtension', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    rmrf(tmpDir);
  });

  // ---- basic ----

  it('returns Extension with correct name', () => {
    const ext = skillsExtension();
    expect(ext.name).toBe('skills');
  });

  // ---- setup: load skills ----

  describe('setup', () => {
    it('loads skills from workspace/skills/ directory', async () => {
      writeFile(path.join(tmpDir, 'skills/greeting/SKILL.md'), 'Say hello');
      writeFile(path.join(tmpDir, 'skills/farewell/SKILL.md'), 'Say goodbye');

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const info = ext.info!() as { skills: { name: string }[] };
      expect(info.skills).toHaveLength(2);
      const names = info.skills.map(s => s.name).sort();
      expect(names).toEqual(['farewell', 'greeting']);
    });

    it('loads skills from builtinDir as fallback', async () => {
      const builtinDir = makeTmpDir();
      try {
        writeFile(path.join(builtinDir, 'builtin-tool/SKILL.md'), 'A builtin tool');

        const ext = skillsExtension({ builtinDir });
        await ext.setup!(makeCtx(tmpDir));

        const info = ext.info!() as { skills: { name: string }[] };
        expect(info.skills).toHaveLength(1);
        expect(info.skills[0].name).toBe('builtin-tool');
      } finally {
        rmrf(builtinDir);
      }
    });

    it('workspace skills override builtin skills with same name', async () => {
      const builtinDir = makeTmpDir();
      try {
        writeFile(path.join(tmpDir, 'skills/greet/SKILL.md'), 'workspace version');
        writeFile(path.join(builtinDir, 'greet/SKILL.md'), 'builtin version');

        const ext = skillsExtension({ builtinDir });
        await ext.setup!(makeCtx(tmpDir));

        const info = ext.info!() as { skills: { name: string }[] };
        expect(info.skills).toHaveLength(1);
        expect(info.skills[0].name).toBe('greet');

        // The prompt should come from the workspace version
        const prompt = ext.systemPrompt!();
        expect(prompt).toContain('workspace version');
        expect(prompt).not.toContain('builtin version');
      } finally {
        rmrf(builtinDir);
      }
    });

    it('loads persona files (AGENT.md, TOOLS.md, HEARTBEAT.md)', async () => {
      writeFile(path.join(tmpDir, 'AGENT.md'), 'You are a helpful agent');
      writeFile(path.join(tmpDir, 'TOOLS.md'), 'Available tools: search');
      writeFile(path.join(tmpDir, 'HEARTBEAT.md'), 'Check every 5 minutes');

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const prompt = ext.systemPrompt!();
      expect(prompt).toContain('## AGENT');
      expect(prompt).toContain('You are a helpful agent');
      expect(prompt).toContain('## TOOLS');
      expect(prompt).toContain('Available tools: search');
      expect(prompt).toContain('## HEARTBEAT');
      expect(prompt).toContain('Check every 5 minutes');
    });

    it('truncates persona files exceeding MAX_FILE_SIZE', async () => {
      const bigContent = 'x'.repeat(25_000);
      writeFile(path.join(tmpDir, 'AGENT.md'), bigContent);

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const prompt = ext.systemPrompt!();
      expect(prompt).toContain('[truncated]');
      // The content should be capped (20000 chars of content + header)
      expect(prompt!.length).toBeLessThan(25_000);
    });

    it('runs setup.sh hooks', async () => {
      const markerFile = path.join(tmpDir, 'setup-ran.txt');
      writeFile(path.join(tmpDir, 'skills/my-skill/SKILL.md'), 'A skill');
      writeExecutable(
        path.join(tmpDir, 'skills/my-skill/hooks/setup.sh'),
        `#!/bin/bash\necho "setup executed" > "${markerFile}"\nexit 0`,
      );

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      expect(fs.existsSync(markerFile)).toBe(true);
      expect(fs.readFileSync(markerFile, 'utf-8').trim()).toBe('setup executed');
    });

    it('skips directories without SKILL.md', async () => {
      // Create a directory that has scripts but no SKILL.md
      fs.mkdirSync(path.join(tmpDir, 'skills/incomplete/scripts'), { recursive: true });
      writeFile(path.join(tmpDir, 'skills/incomplete/scripts/run.sh'), 'echo hi');

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const info = ext.info!() as { skills: { name: string }[] };
      expect(info.skills).toHaveLength(0);
    });

    it('skips SKILL.md with empty content', async () => {
      writeFile(path.join(tmpDir, 'skills/empty/SKILL.md'), '   \n  \n ');

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const info = ext.info!() as { skills: { name: string }[] };
      expect(info.skills).toHaveLength(0);
    });

    it('ignores non-directory entries in skills/', async () => {
      writeFile(path.join(tmpDir, 'skills/not-a-dir.txt'), 'just a file');

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const info = ext.info!() as { skills: { name: string }[] };
      expect(info.skills).toHaveLength(0);
    });

    it('handles missing workspace skills/ directory gracefully', async () => {
      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const info = ext.info!() as { skills: { name: string }[] };
      expect(info.skills).toHaveLength(0);
    });

    it('handles missing builtinDir gracefully', async () => {
      const ext = skillsExtension({ builtinDir: '/nonexistent/dir' });
      await ext.setup!(makeCtx(tmpDir));

      const info = ext.info!() as { skills: { name: string }[] };
      expect(info.skills).toHaveLength(0);
    });
  });

  // ---- systemPrompt ----

  describe('systemPrompt', () => {
    it('combines persona sections + skill prompts', async () => {
      writeFile(path.join(tmpDir, 'AGENT.md'), 'I am an agent');
      writeFile(path.join(tmpDir, 'skills/search/SKILL.md'), 'Search the web');
      writeFile(path.join(tmpDir, 'skills/calc/SKILL.md'), 'Do math');

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const prompt = ext.systemPrompt!();
      expect(prompt).toBeDefined();

      // Persona section comes first
      expect(prompt).toContain('## AGENT');
      expect(prompt).toContain('I am an agent');

      // Then skill prompts
      expect(prompt).toContain('## Skill: search');
      expect(prompt).toContain('Search the web');
      expect(prompt).toContain('## Skill: calc');
      expect(prompt).toContain('Do math');

      // Persona should appear before skills
      const agentIdx = prompt!.indexOf('## AGENT');
      const skillIdx = prompt!.indexOf('## Skill:');
      expect(agentIdx).toBeLessThan(skillIdx);
    });

    it('returns undefined when nothing loaded', async () => {
      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const prompt = ext.systemPrompt!();
      expect(prompt).toBeUndefined();
    });

    it('returns prompt with only persona files (no skills)', async () => {
      writeFile(path.join(tmpDir, 'AGENT.md'), 'Just persona');

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const prompt = ext.systemPrompt!();
      expect(prompt).toContain('Just persona');
      expect(prompt).not.toContain('## Skill:');
    });

    it('returns prompt with only skills (no persona)', async () => {
      writeFile(path.join(tmpDir, 'skills/only-skill/SKILL.md'), 'Skill only');

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const prompt = ext.systemPrompt!();
      expect(prompt).toContain('## Skill: only-skill');
      expect(prompt).toContain('Skill only');
    });
  });

  // ---- preBash ----

  describe('preBash', () => {
    it('runs pre-tool.sh hooks, blocks if exit 2', async () => {
      writeFile(path.join(tmpDir, 'skills/guard/SKILL.md'), 'A guard skill');
      writeExecutable(
        path.join(tmpDir, 'skills/guard/hooks/pre-tool.sh'),
        '#!/bin/bash\necho "dangerous command" >&2\nexit 2',
      );

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const result = await ext.preBash!('rm -rf /');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('dangerous command');
    });

    it('allows if no hooks', async () => {
      writeFile(path.join(tmpDir, 'skills/simple/SKILL.md'), 'A simple skill');

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const result = await ext.preBash!('echo hello');
      expect(result.allowed).toBe(true);
    });

    it('allows if hook exits 0', async () => {
      writeFile(path.join(tmpDir, 'skills/permissive/SKILL.md'), 'A permissive skill');
      writeExecutable(
        path.join(tmpDir, 'skills/permissive/hooks/pre-tool.sh'),
        '#!/bin/bash\nexit 0',
      );

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const result = await ext.preBash!('echo hello');
      expect(result.allowed).toBe(true);
    });

    it('allows if hook exits with non-zero non-2 code', async () => {
      writeFile(path.join(tmpDir, 'skills/loose/SKILL.md'), 'A skill');
      writeExecutable(
        path.join(tmpDir, 'skills/loose/hooks/pre-tool.sh'),
        '#!/bin/bash\nexit 1',
      );

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const result = await ext.preBash!('echo hello');
      expect(result.allowed).toBe(true);
    });

    it('allows if no skills loaded at all', async () => {
      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const result = await ext.preBash!('echo hello');
      expect(result.allowed).toBe(true);
    });

    it('provides default "Blocked" reason when stderr is empty', async () => {
      writeFile(path.join(tmpDir, 'skills/blocker/SKILL.md'), 'Block skill');
      writeExecutable(
        path.join(tmpDir, 'skills/blocker/hooks/pre-tool.sh'),
        '#!/bin/bash\nexit 2',
      );

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const result = await ext.preBash!('some command');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Blocked');
    });

    it('stops at first blocking hook across multiple skills', async () => {
      const markerFile = path.join(tmpDir, 'second-ran.txt');
      writeFile(path.join(tmpDir, 'skills/aaa-first/SKILL.md'), 'First');
      writeExecutable(
        path.join(tmpDir, 'skills/aaa-first/hooks/pre-tool.sh'),
        '#!/bin/bash\necho "blocked by first" >&2\nexit 2',
      );
      writeFile(path.join(tmpDir, 'skills/zzz-second/SKILL.md'), 'Second');
      writeExecutable(
        path.join(tmpDir, 'skills/zzz-second/hooks/pre-tool.sh'),
        `#!/bin/bash\ntouch "${markerFile}"\nexit 0`,
      );

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const result = await ext.preBash!('test cmd');
      expect(result.allowed).toBe(false);
      // Second hook should NOT have run because first blocked
      expect(fs.existsSync(markerFile)).toBe(false);
    });
  });

  // ---- postBash ----

  describe('postBash', () => {
    it('runs post-tool.sh hooks', async () => {
      const markerFile = path.join(tmpDir, 'post-ran.txt');
      writeFile(path.join(tmpDir, 'skills/logger/SKILL.md'), 'A logger skill');
      writeExecutable(
        path.join(tmpDir, 'skills/logger/hooks/post-tool.sh'),
        `#!/bin/bash\ncat > "${markerFile}"\nexit 0`,
      );

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      await ext.postBash!('echo hi', 'hello world', false);

      expect(fs.existsSync(markerFile)).toBe(true);
      const content = JSON.parse(fs.readFileSync(markerFile, 'utf-8').trim());
      expect(content.event).toBe('post-bash');
      expect(content.command).toBe('echo hi');
      expect(content.output).toBe('hello world');
      expect(content.isError).toBe(false);
    });

    it('does nothing when no post-tool hooks exist', async () => {
      writeFile(path.join(tmpDir, 'skills/bare/SKILL.md'), 'Bare skill');

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      // Should not throw
      await ext.postBash!('echo test', 'test', false);
    });
  });

  // ---- teardown ----

  describe('teardown', () => {
    it('runs teardown.sh hooks', async () => {
      const markerFile = path.join(tmpDir, 'teardown-ran.txt');
      writeFile(path.join(tmpDir, 'skills/cleanup/SKILL.md'), 'A cleanup skill');
      writeExecutable(
        path.join(tmpDir, 'skills/cleanup/hooks/teardown.sh'),
        `#!/bin/bash\necho "torn down" > "${markerFile}"\nexit 0`,
      );

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));
      await ext.teardown!();

      expect(fs.existsSync(markerFile)).toBe(true);
      expect(fs.readFileSync(markerFile, 'utf-8').trim()).toBe('torn down');
    });

    it('does nothing when no teardown hooks exist', async () => {
      writeFile(path.join(tmpDir, 'skills/noteardown/SKILL.md'), 'No teardown');

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      // Should not throw
      await ext.teardown!();
    });
  });

  // ---- info ----

  describe('info', () => {
    it('returns skills list with scripts and hooks', async () => {
      writeFile(path.join(tmpDir, 'skills/multi/SKILL.md'), 'Multi skill');
      writeFile(path.join(tmpDir, 'skills/multi/scripts/run.sh'), 'echo run');
      writeFile(path.join(tmpDir, 'skills/multi/scripts/deploy.sh'), 'echo deploy');
      writeExecutable(
        path.join(tmpDir, 'skills/multi/hooks/setup.sh'),
        '#!/bin/bash\nexit 0',
      );
      writeExecutable(
        path.join(tmpDir, 'skills/multi/hooks/pre-tool.sh'),
        '#!/bin/bash\nexit 0',
      );

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const info = ext.info!() as {
        skills: { name: string; scripts: string[]; hooks: string[] }[];
      };

      expect(info.skills).toHaveLength(1);
      const skill = info.skills[0];
      expect(skill.name).toBe('multi');
      expect(skill.scripts.sort()).toEqual(['deploy.sh', 'run.sh']);
      expect(skill.hooks.sort()).toEqual(['pre-tool', 'setup']);
    });

    it('returns empty skills list when none loaded', async () => {
      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const info = ext.info!() as { skills: unknown[] };
      expect(info.skills).toEqual([]);
    });
  });

  // ---- Skill loading: discovers SKILL.md, scripts/, hooks/ ----

  describe('Skill loading', () => {
    it('discovers SKILL.md, scripts/, hooks/ directories', async () => {
      // Create a complete skill structure
      writeFile(path.join(tmpDir, 'skills/complete/SKILL.md'), 'Complete skill prompt');
      writeFile(path.join(tmpDir, 'skills/complete/scripts/build.sh'), 'echo build');
      writeFile(path.join(tmpDir, 'skills/complete/scripts/test.sh'), 'echo test');
      writeExecutable(
        path.join(tmpDir, 'skills/complete/hooks/setup.sh'),
        '#!/bin/bash\nexit 0',
      );
      writeExecutable(
        path.join(tmpDir, 'skills/complete/hooks/teardown.sh'),
        '#!/bin/bash\nexit 0',
      );
      writeExecutable(
        path.join(tmpDir, 'skills/complete/hooks/pre-tool.sh'),
        '#!/bin/bash\nexit 0',
      );
      writeExecutable(
        path.join(tmpDir, 'skills/complete/hooks/post-tool.sh'),
        '#!/bin/bash\nexit 0',
      );

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const info = ext.info!() as {
        skills: { name: string; scripts: string[]; hooks: string[] }[];
      };

      expect(info.skills).toHaveLength(1);
      const skill = info.skills[0];
      expect(skill.name).toBe('complete');
      expect(skill.scripts.sort()).toEqual(['build.sh', 'test.sh']);
      expect(skill.hooks.sort()).toEqual(['post-tool', 'pre-tool', 'setup', 'teardown']);
    });

    it('only loads recognized hook events', async () => {
      writeFile(path.join(tmpDir, 'skills/selective/SKILL.md'), 'Selective');
      // Create a recognized hook
      writeExecutable(
        path.join(tmpDir, 'skills/selective/hooks/setup.sh'),
        '#!/bin/bash\nexit 0',
      );
      // Create an unrecognized hook file (should be ignored)
      writeExecutable(
        path.join(tmpDir, 'skills/selective/hooks/custom-event.sh'),
        '#!/bin/bash\nexit 0',
      );

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const info = ext.info!() as {
        skills: { name: string; hooks: string[] }[];
      };

      expect(info.skills[0].hooks).toEqual(['setup']);
    });

    it('loads scripts but ignores subdirectories in scripts/', async () => {
      writeFile(path.join(tmpDir, 'skills/scripts-test/SKILL.md'), 'Test');
      writeFile(path.join(tmpDir, 'skills/scripts-test/scripts/run.sh'), 'echo run');
      // Create a subdirectory inside scripts/ (should be ignored)
      fs.mkdirSync(path.join(tmpDir, 'skills/scripts-test/scripts/subdir'), { recursive: true });
      writeFile(path.join(tmpDir, 'skills/scripts-test/scripts/subdir/nested.sh'), 'echo nested');

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const info = ext.info!() as {
        skills: { name: string; scripts: string[] }[];
      };

      // Only top-level files in scripts/ should be loaded
      expect(info.skills[0].scripts).toEqual(['run.sh']);
    });

    it('loads multiple skills with mixed structures', async () => {
      // Skill with everything
      writeFile(path.join(tmpDir, 'skills/full/SKILL.md'), 'Full skill');
      writeFile(path.join(tmpDir, 'skills/full/scripts/run.sh'), 'echo run');
      writeExecutable(
        path.join(tmpDir, 'skills/full/hooks/pre-tool.sh'),
        '#!/bin/bash\nexit 0',
      );

      // Skill with only SKILL.md
      writeFile(path.join(tmpDir, 'skills/minimal/SKILL.md'), 'Minimal skill');

      // Skill with scripts only (no hooks)
      writeFile(path.join(tmpDir, 'skills/scripted/SKILL.md'), 'Scripted skill');
      writeFile(path.join(tmpDir, 'skills/scripted/scripts/deploy.sh'), 'echo deploy');

      const ext = skillsExtension();
      await ext.setup!(makeCtx(tmpDir));

      const info = ext.info!() as {
        skills: { name: string; scripts: string[]; hooks: string[] }[];
      };

      expect(info.skills).toHaveLength(3);

      const byName = Object.fromEntries(info.skills.map(s => [s.name, s]));
      expect(byName['full'].scripts).toEqual(['run.sh']);
      expect(byName['full'].hooks).toEqual(['pre-tool']);
      expect(byName['minimal'].scripts).toEqual([]);
      expect(byName['minimal'].hooks).toEqual([]);
      expect(byName['scripted'].scripts).toEqual(['deploy.sh']);
      expect(byName['scripted'].hooks).toEqual([]);
    });
  });
});
