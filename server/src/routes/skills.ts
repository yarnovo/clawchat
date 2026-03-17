import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { mkdir, rm, access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import AdmZip from 'adm-zip';
import { db } from '../db/index.js';
import { agents, skills } from '../db/schema.js';
import { workspacePath } from '../orchestrator/index.js';
import type { AuthEnv } from '../middleware/auth.js';

const app = new Hono<AuthEnv>();

const MAX_ZIP_SIZE = 10 * 1024 * 1024; // 10MB

// ── Helpers ──

function parseSkillMdFrontmatter(content: string): {
  displayName?: string;
  description?: string;
  requires?: { credentials?: { name: string; description?: string; required?: boolean }[] };
} {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const yaml = match[1];
  const result: Record<string, unknown> = {};
  for (const line of yaml.split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) {
      result[key.trim()] = rest.join(':').trim();
    }
  }
  return result as ReturnType<typeof parseSkillMdFrontmatter>;
}

function extractSkillMd(zipBuffer: Buffer): string | null {
  const zip = new AdmZip(zipBuffer);
  // SKILL.md can be at root or inside a single top-level folder
  for (const entry of zip.getEntries()) {
    const parts = entry.entryName.split('/').filter(Boolean);
    if (
      !entry.isDirectory &&
      parts[parts.length - 1] === 'SKILL.md' &&
      parts.length <= 2
    ) {
      return entry.getData().toString('utf-8');
    }
  }
  return null;
}

async function verifyAgentOwnership(agentId: string, userId: string) {
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, userId)));
  return agent ?? null;
}

// ── Upload skill zip ──

app.post('/', async (c) => {
  const userId = c.get('userId');
  const contentType = c.req.header('content-type') || '';

  let zipBuffer: Buffer;
  let skillName: string;

  if (contentType.includes('multipart/form-data')) {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const name = formData.get('name') as string | null;
    if (!file) return c.json({ error: 'file required' }, 400);
    if (!name) return c.json({ error: 'name required' }, 400);
    const arrayBuffer = await file.arrayBuffer();
    zipBuffer = Buffer.from(arrayBuffer);
    skillName = name;
  } else {
    return c.json({ error: 'multipart/form-data required' }, 400);
  }

  if (zipBuffer.length > MAX_ZIP_SIZE) {
    return c.json({ error: `Zip too large (max ${MAX_ZIP_SIZE / 1024 / 1024}MB)` }, 400);
  }

  // Validate: must contain SKILL.md
  const skillMd = extractSkillMd(zipBuffer);
  if (!skillMd || !skillMd.trim()) {
    return c.json({ error: 'Zip must contain a non-empty SKILL.md' }, 400);
  }

  const meta = parseSkillMdFrontmatter(skillMd);

  // Upsert — same name overwrites
  const existing = await db.select({ id: skills.id }).from(skills).where(eq(skills.name, skillName)).limit(1);

  if (existing.length > 0) {
    await db
      .update(skills)
      .set({
        displayName: meta.displayName || skillName,
        description: String(meta.description || ''),
        zipData: zipBuffer,
        authorId: userId,
        updatedAt: new Date(),
      })
      .where(eq(skills.name, skillName));

    return c.json({ updated: true, skill: skillName });
  }

  await db.insert(skills).values({
    name: skillName,
    displayName: meta.displayName || skillName,
    description: String(meta.description || ''),
    authorId: userId,
    zipData: zipBuffer,
  });

  return c.json({ created: true, skill: skillName }, 201);
});

// ── List skills ──

app.get('/', async (c) => {
  const rows = await db
    .select({
      id: skills.id,
      name: skills.name,
      displayName: skills.displayName,
      description: skills.description,
      version: skills.version,
      createdAt: skills.createdAt,
    })
    .from(skills);

  return c.json({ skills: rows });
});

// ── Skill detail (returns SKILL.md content + file list) ──

app.get('/:name', async (c) => {
  const name = c.req.param('name');
  const [skill] = await db.select().from(skills).where(eq(skills.name, name)).limit(1);
  if (!skill) return c.json({ error: 'Skill not found' }, 404);

  const zip = new AdmZip(skill.zipData);
  const files = zip.getEntries()
    .filter((e) => !e.isDirectory)
    .map((e) => e.entryName);

  const skillMd = extractSkillMd(skill.zipData) || '';

  return c.json({
    skill: {
      id: skill.id,
      name: skill.name,
      displayName: skill.displayName,
      description: skill.description,
      version: skill.version,
      content: skillMd,
      files,
    },
  });
});

// ── Delete skill ──

app.delete('/:name', async (c) => {
  const name = c.req.param('name');
  const [deleted] = await db.delete(skills).where(eq(skills.name, name)).returning();
  if (!deleted) return c.json({ error: 'Skill not found' }, 404);
  return c.json({ deleted: true });
});

// ── Install skill to agent workspace ──

const installSchema = z.object({
  agentId: z.string().uuid(),
});

app.post('/:name/install', async (c) => {
  const userId = c.get('userId');
  const skillName = c.req.param('name');
  const body = await c.req.json();
  const parsed = installSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Validation failed' }, 400);

  const agent = await verifyAgentOwnership(parsed.data.agentId, userId);
  if (!agent) return c.json({ error: 'Agent not found' }, 404);

  const [skill] = await db.select().from(skills).where(eq(skills.name, skillName)).limit(1);
  if (!skill) return c.json({ error: 'Skill not found' }, 404);

  // Extract zip to workspace/skills/{name}/
  const destPath = join(workspacePath(parsed.data.agentId), 'skills', skillName);
  await mkdir(destPath, { recursive: true });

  const zip = new AdmZip(skill.zipData);
  const entries = zip.getEntries();

  // Detect if zip has a single top-level folder wrapper
  const topDirs = new Set(entries.map((e) => e.entryName.split('/')[0]));
  const hasWrapper = topDirs.size === 1 && entries.some((e) => e.isDirectory && e.entryName === `${[...topDirs][0]}/`);

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    let relativePath = entry.entryName;
    if (hasWrapper) {
      // Strip the wrapper folder
      relativePath = relativePath.split('/').slice(1).join('/');
    }
    if (!relativePath) continue;

    const filePath = join(destPath, relativePath);
    await mkdir(join(filePath, '..'), { recursive: true });
    await writeFile(filePath, entry.getData());
  }

  return c.json({ installed: true, skill: skillName }, 201);
});

// ── Uninstall skill from agent workspace ──

app.delete('/:name/uninstall', async (c) => {
  const userId = c.get('userId');
  const skillName = c.req.param('name');
  const body = await c.req.json();
  const parsed = installSchema.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Validation failed' }, 400);

  const agent = await verifyAgentOwnership(parsed.data.agentId, userId);
  if (!agent) return c.json({ error: 'Agent not found' }, 404);

  const destPath = join(workspacePath(parsed.data.agentId), 'skills', skillName);
  try {
    await access(destPath);
    await rm(destPath, { recursive: true });
  } catch {
    return c.json({ error: 'Skill not installed' }, 404);
  }

  return c.json({ uninstalled: true, skill: skillName });
});

export { app as skillsRoutes };
