export interface Skill {
  slug: string;
  displayName: string;
  summary: string | null;
  tags: string[];
  stats: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
  latestVersion?: {
    version: string;
    createdAt: number;
    changelog: string;
  } | null;
}

export interface SkillDetail extends Skill {
  owner: { handle: string | null; displayName: string | null; image: string | null } | null;
  moderation: { isSuspicious: boolean; isMalwareBlocked: boolean } | null;
}

const API_BASE = "/api/v1";

export async function searchSkills(query: string, limit = 25): Promise<Skill[]> {
  const url = new URL(`${API_BASE}/search`, window.location.origin);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(limit));
  const res = await fetch(url);
  const data = await res.json();
  return data.results;
}

export async function listSkills(
  limit = 25,
  cursor?: string,
  sort = "updated",
): Promise<{ items: Skill[]; nextCursor: string | null }> {
  const url = new URL(`${API_BASE}/skills`, window.location.origin);
  url.searchParams.set("limit", String(limit));
  if (cursor) url.searchParams.set("cursor", cursor);
  if (sort !== "updated") url.searchParams.set("sort", sort);
  const res = await fetch(url);
  return res.json();
}

export async function getSkill(slug: string): Promise<SkillDetail | null> {
  const res = await fetch(`${API_BASE}/skills/${encodeURIComponent(slug)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return { ...data.skill, ...data, tags: data.skill?.tags ?? [] };
}
