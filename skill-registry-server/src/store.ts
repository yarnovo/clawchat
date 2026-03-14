import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import matter from "gray-matter";
import { logger } from "./logger.js";

const SKILLS_ROOT = resolve(
  process.env["SKILLS_DIR"] || join(import.meta.dirname, "../../skills/skills"),
);

export type SkillMeta = {
  slug: string;
  owner: string;
  displayName: string;
  summary: string | null;
  version: string;
  publishedAt: number;
  tags: string[];
  skillDir: string;
};

// In-memory index, built on startup
let skillIndex: SkillMeta[] = [];
let slugMap: Map<string, SkillMeta> = new Map();

export async function buildIndex(): Promise<void> {
  const start = Date.now();
  const entries: SkillMeta[] = [];

  let owners: string[];
  try {
    owners = await readdir(SKILLS_ROOT);
  } catch {
    logger.warn({ dir: SKILLS_ROOT }, "skills directory not found, index empty");
    skillIndex = [];
    slugMap = new Map();
    return;
  }

  for (const owner of owners) {
    const ownerDir = join(SKILLS_ROOT, owner);
    const ownerStat = await stat(ownerDir).catch(() => null);
    if (!ownerStat?.isDirectory()) continue;

    let skillNames: string[];
    try {
      skillNames = await readdir(ownerDir);
    } catch {
      continue;
    }

    for (const skillName of skillNames) {
      const skillDir = join(ownerDir, skillName);
      const meta = await loadSkillMeta(skillDir, owner);
      if (meta) entries.push(meta);
    }
  }

  skillIndex = entries;
  slugMap = new Map(entries.map((e) => [e.slug, e]));
  logger.info({ count: entries.length, ms: Date.now() - start }, "skill index built");
}

async function loadSkillMeta(
  skillDir: string,
  owner: string,
): Promise<SkillMeta | null> {
  try {
    // Read _meta.json
    const metaPath = join(skillDir, "_meta.json");
    const metaRaw = await readFile(metaPath, "utf8");
    const meta = JSON.parse(metaRaw) as {
      owner: string;
      slug: string;
      displayName: string;
      latest: { version: string; publishedAt: number };
    };

    // Read SKILL.md frontmatter for summary
    const skillMdPath = join(skillDir, "SKILL.md");
    let summary: string | null = null;
    let tags: string[] = [];
    try {
      const skillMdRaw = await readFile(skillMdPath, "utf8");
      const parsed = matter(skillMdRaw);
      const fm = parsed.data as Record<string, unknown>;
      summary = typeof fm["description"] === "string" ? fm["description"] : null;
      if (Array.isArray(fm["tags"])) {
        tags = fm["tags"].filter((t): t is string => typeof t === "string");
      }
    } catch {
      // SKILL.md may not exist or be unparseable
    }

    return {
      slug: meta.slug,
      owner: meta.owner || owner,
      displayName: meta.displayName,
      summary,
      version: meta.latest.version,
      publishedAt: meta.latest.publishedAt,
      tags,
      skillDir,
    };
  } catch {
    return null;
  }
}

export function searchSkills(query: string, limit: number): SkillMeta[] {
  const q = query.toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);

  const scored = skillIndex
    .map((skill) => {
      let score = 0;
      const slug = skill.slug.toLowerCase();
      const name = skill.displayName.toLowerCase();
      const desc = (skill.summary || "").toLowerCase();

      for (const token of tokens) {
        if (slug === token) score += 10;
        else if (slug.includes(token)) score += 5;
        if (name.includes(token)) score += 3;
        if (desc.includes(token)) score += 1;
      }
      return { skill, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((r) => r.skill);
}

export function getSkill(slug: string): SkillMeta | undefined {
  return slugMap.get(slug);
}

export function listSkills(
  limit: number,
  cursor?: string,
  sort: string = "updated",
): { items: SkillMeta[]; nextCursor: string | null } {
  let sorted: SkillMeta[];

  switch (sort) {
    case "updated":
    default:
      sorted = [...skillIndex].sort((a, b) => b.publishedAt - a.publishedAt);
      break;
  }

  let startIdx = 0;
  if (cursor) {
    const idx = sorted.findIndex((s) => s.slug === cursor);
    if (idx >= 0) startIdx = idx + 1;
  }

  const items = sorted.slice(startIdx, startIdx + limit);
  const nextCursor =
    startIdx + limit < sorted.length ? items[items.length - 1]?.slug ?? null : null;

  return { items, nextCursor };
}

export function getSkillsRoot(): string {
  return SKILLS_ROOT;
}

export function getIndexSize(): number {
  return skillIndex.length;
}
