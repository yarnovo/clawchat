/**
 * plugin-skills — Skill 加载 + Hook 执行
 *
 * Skill = SKILL.md (prompt) + scripts/ + hooks/
 */
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import type { Extension, AgenticContext, HookResult } from '@agentkit/agentic';

// ---- Skill 类型 ----

export interface Skill {
  name: string;
  dir: string;
  prompt: string;
  scripts: { name: string; path: string }[];
  hooks: { event: string; path: string }[];
}

// ---- 加载 ----

const HOOK_EVENTS = ['setup.sh', 'teardown.sh', 'pre-tool.sh', 'post-tool.sh'] as const;

function loadSkillDir(dir: string): Skill | null {
  const md = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(md)) return null;
  const prompt = fs.readFileSync(md, 'utf-8').trim();
  if (!prompt) return null;

  const scripts: Skill['scripts'] = [];
  const scriptsDir = path.join(dir, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    for (const f of fs.readdirSync(scriptsDir)) {
      if (fs.statSync(path.join(scriptsDir, f)).isFile()) {
        scripts.push({ name: f, path: path.join(scriptsDir, f) });
      }
    }
  }

  const hooks: Skill['hooks'] = [];
  const hooksDir = path.join(dir, 'hooks');
  if (fs.existsSync(hooksDir)) {
    for (const f of HOOK_EVENTS) {
      const fp = path.join(hooksDir, f);
      if (fs.existsSync(fp)) hooks.push({ event: f.replace('.sh', ''), path: fp });
    }
  }

  return { name: path.basename(dir), dir, prompt, scripts, hooks };
}

function loadAllSkills(workDir: string, builtinDir?: string): Skill[] {
  const skills: Skill[] = [];
  const loaded = new Set<string>();

  const wsDir = path.join(workDir, 'skills');
  if (fs.existsSync(wsDir)) {
    for (const e of fs.readdirSync(wsDir)) {
      const p = path.join(wsDir, e);
      if (fs.statSync(p).isDirectory()) {
        const s = loadSkillDir(p);
        if (s) { skills.push(s); loaded.add(s.name); }
      }
    }
  }

  if (builtinDir && fs.existsSync(builtinDir)) {
    for (const e of fs.readdirSync(builtinDir)) {
      if (loaded.has(e)) continue;
      const p = path.join(builtinDir, e);
      if (fs.statSync(p).isDirectory()) {
        const s = loadSkillDir(p);
        if (s) { skills.push(s); loaded.add(s.name); }
      }
    }
  }

  return skills;
}

// ---- Hook 执行 ----

async function runHookAsync(scriptPath: string, context: Record<string, unknown>, workDir: string): Promise<HookResult> {
  return new Promise((resolve) => {
    const child = spawn('bash', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'], cwd: workDir });

    let stderr = '';
    const timer = setTimeout(() => { child.kill('SIGTERM'); }, 10_000);

    child.stderr!.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve({ allowed: true });
      else if (code === 2) resolve({ allowed: false, reason: stderr.trim() || 'Blocked' });
      else resolve({ allowed: true });
    });

    child.on('error', () => {
      clearTimeout(timer);
      resolve({ allowed: true });
    });

    child.stdin!.write(JSON.stringify(context));
    child.stdin!.end();
  });
}

// ---- Plugin ----

// ---- Persona 文件加载（AGENT.md, MEMORY.md 等）----

const PERSONA_FILES = ['AGENT.md', 'TOOLS.md', 'HEARTBEAT.md'];
const MAX_FILE_SIZE = 20_000;

function loadPersonaFiles(workDir: string): string[] {
  const sections: string[] = [];
  for (const filename of PERSONA_FILES) {
    const fp = path.join(workDir, filename);
    if (!fs.existsSync(fp)) continue;
    let content = fs.readFileSync(fp, 'utf-8').trim();
    if (!content) continue;
    if (content.length > MAX_FILE_SIZE) content = content.slice(0, MAX_FILE_SIZE) + '\n[truncated]';
    const header = filename.replace('.md', '');
    sections.push(`## ${header}\n\n${content}`);
  }
  return sections;
}

// ---- Plugin ----

export interface SkillsPluginOptions {
  builtinDir?: string;
}

export function skillsExtension(opts: SkillsPluginOptions = {}): Extension {
  let skills: Skill[] = [];
  let personaSections: string[] = [];
  let workDir = '';

  return {
    name: 'skills',

    setup: async (ctx: AgenticContext) => {
      workDir = ctx.workDir;
      skills = loadAllSkills(ctx.workDir, opts.builtinDir);
      personaSections = loadPersonaFiles(ctx.workDir);

      for (const s of skills) {
        for (const h of s.hooks.filter(h => h.event === 'setup')) {
          await runHookAsync(h.path, { event: 'setup', skill: s.name, workDir }, workDir);
        }
      }

      if (skills.length > 0) {
        console.log(`   Skills: ${skills.map(s => s.name).join(', ')}`);
      }
    },

    teardown: async () => {
      for (const s of skills) {
        for (const h of s.hooks.filter(h => h.event === 'teardown')) {
          await runHookAsync(h.path, { event: 'teardown', skill: s.name, workDir }, workDir);
        }
      }
    },

    systemPrompt: () => {
      const parts = [
        ...personaSections,
        ...skills.map(s => `## Skill: ${s.name}\n\n${s.prompt}`),
      ];
      return parts.length > 0 ? parts.join('\n\n') : undefined;
    },

    preBash: async (command) => {
      for (const s of skills) {
        for (const h of s.hooks.filter(h => h.event === 'pre-tool')) {
          const result = await runHookAsync(h.path, { event: 'pre-bash', skill: s.name, workDir, command }, workDir);
          if (!result.allowed) return result;
        }
      }
      return { allowed: true };
    },

    postBash: async (command, output, isError) => {
      for (const s of skills) {
        for (const h of s.hooks.filter(h => h.event === 'post-tool')) {
          await runHookAsync(h.path, { event: 'post-bash', skill: s.name, workDir, command, output, isError }, workDir);
        }
      }
    },

    info: () => ({
      skills: skills.map(s => ({
        name: s.name,
        scripts: s.scripts.map(sc => sc.name),
        hooks: s.hooks.map(h => h.event),
      })),
    }),
  };
}
