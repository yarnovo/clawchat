import { Hono } from 'hono';
import { eq, and, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { readdir, readFile, cp, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { db } from '../db/index.js';
import { agents, skillInstallations } from '../db/schema.js';
import { workspacePath } from '../orchestrator/index.js';
import type { AuthEnv } from '../middleware/auth.js';

const app = new Hono<AuthEnv>();

// ---------- Config ----------

const BUILTINS_DIR =
  process.env.SKILLS_BUILTINS_DIR ||
  join(process.cwd(), '..', 'agentkit', 'extension-skills', 'builtins');

// ---------- Validation ----------

const installSchema = z.object({
  agentId: z.string().uuid(),
});

// ---------- Helpers ----------

async function listBuiltinSkills(): Promise<
  { name: string; hasSkillMd: boolean; path: string }[]
> {
  try {
    const entries = await readdir(BUILTINS_DIR, { withFileTypes: true });
    const skills: { name: string; hasSkillMd: boolean; path: string }[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const skillPath = join(BUILTINS_DIR, entry.name);
      let hasSkillMd = false;
      try {
        await access(join(skillPath, 'SKILL.md'));
        hasSkillMd = true;
      } catch {
        // No SKILL.md
      }
      skills.push({ name: entry.name, hasSkillMd, path: skillPath });
    }

    return skills;
  } catch {
    return [];
  }
}

async function verifyAgentOwnership(agentId: string, userId: string) {
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, userId), isNull(agents.deletedAt)));
  return agent ?? null;
}

// ---------- Routes ----------

/** List available skills from builtins directory */
app.get('/', async (c) => {
  const skills = await listBuiltinSkills();

  const result = await Promise.all(
    skills.map(async (s) => {
      let description = '';
      if (s.hasSkillMd) {
        try {
          const content = await readFile(join(s.path, 'SKILL.md'), 'utf-8');
          // Extract first paragraph as description
          const lines = content.split('\n').filter((l) => l.trim());
          // Skip the title line (# ...)
          const descLine = lines.find((l) => !l.startsWith('#'));
          description = descLine?.trim() ?? '';
        } catch {
          // ignore
        }
      }
      return { name: s.name, description };
    }),
  );

  return c.json({ skills: result });
});

/** Skill detail — return SKILL.md content */
app.get('/:name', async (c) => {
  const name = c.req.param('name');
  const skillPath = join(BUILTINS_DIR, name);

  try {
    await access(skillPath);
  } catch {
    return c.json({ error: 'Skill not found' }, 404);
  }

  let content = '';
  try {
    content = await readFile(join(skillPath, 'SKILL.md'), 'utf-8');
  } catch {
    content = `# ${name}\n\nNo documentation available.`;
  }

  // List files in skill directory
  let files: string[] = [];
  try {
    const entries = await readdir(skillPath, { recursive: true });
    files = entries.map(String);
  } catch {
    // ignore
  }

  return c.json({ skill: { name, content, files } });
});

/** Install skill to agent workspace */
app.post('/:name/install', async (c) => {
  const userId = c.get('userId');
  const skillName = c.req.param('name');
  const body = await c.req.json();
  const parsed = installSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const { agentId } = parsed.data;

  // Verify ownership
  const agent = await verifyAgentOwnership(agentId, userId);
  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  // Verify skill exists
  const sourcePath = join(BUILTINS_DIR, skillName);
  try {
    await access(sourcePath);
  } catch {
    return c.json({ error: 'Skill not found' }, 404);
  }

  // Copy skill to agent workspace
  const destPath = join(workspacePath(agentId), 'skills', skillName);
  await cp(sourcePath, destPath, { recursive: true });

  // Record installation in DB
  const [installation] = await db
    .insert(skillInstallations)
    .values({
      agentId,
      skillName,
    })
    .returning();

  return c.json({ installed: true, skill: skillName, installation }, 201);
});

/** Uninstall skill from agent workspace */
app.delete('/:name/uninstall', async (c) => {
  const userId = c.get('userId');
  const skillName = c.req.param('name');
  const body = await c.req.json();
  const parsed = installSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const { agentId } = parsed.data;

  // Verify ownership
  const agent = await verifyAgentOwnership(agentId, userId);
  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  // Remove from workspace
  const destPath = join(workspacePath(agentId), 'skills', skillName);
  try {
    await access(destPath);
    await rm(destPath, { recursive: true });
  } catch {
    return c.json({ error: 'Skill not installed on this agent' }, 404);
  }

  // Remove DB record
  await db
    .delete(skillInstallations)
    .where(
      and(eq(skillInstallations.agentId, agentId), eq(skillInstallations.skillName, skillName)),
    );

  return c.json({ uninstalled: true, skill: skillName });
});

export { app as skillsRoutes };
