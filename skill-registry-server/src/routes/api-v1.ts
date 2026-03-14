import { Hono } from "hono";
import { searchSkills, getSkill, listSkills, getIndexSize } from "../store.js";
import { packSkillZip } from "../zip.js";
import type { AppEnv } from "../env.js";

const api = new Hono<AppEnv>();

// GET /api/v1/search?q=<query>&limit=<n>
api.get("/search", (c) => {
  const query = c.req.query("q") || "";
  const limit = Math.min(Math.max(1, Number(c.req.query("limit") || "25")), 200);

  if (!query) {
    return c.json({ results: [] });
  }

  const results = searchSkills(query, limit).map((s) => ({
    slug: s.slug,
    displayName: s.displayName,
    summary: s.summary,
    version: s.version,
    score: 1, // keyword search, no relevance score
    updatedAt: s.publishedAt,
  }));

  return c.json({ results });
});

// GET /api/v1/resolve?slug=<slug>&hash=<hash>
api.get("/resolve", (c) => {
  const slug = c.req.query("slug") || "";
  const skill = getSkill(slug);

  if (!skill) {
    return c.json({ match: null, latestVersion: null });
  }

  return c.json({
    match: { version: skill.version },
    latestVersion: { version: skill.version },
  });
});

// GET /api/v1/download?slug=<slug>&version=<version>
api.get("/download", async (c) => {
  const slug = c.req.query("slug") || "";
  const skill = getSkill(slug);

  if (!skill) {
    return c.text("Skill not found", 404);
  }

  const zip = await packSkillZip(skill.skillDir);

  return new Response(zip.buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${slug}.zip"`,
      "Content-Length": String(zip.byteLength),
    },
  });
});

// GET /api/v1/skills — list skills (paginated)
api.get("/skills", (c) => {
  const limit = Math.min(Math.max(1, Number(c.req.query("limit") || "25")), 200);
  const cursor = c.req.query("cursor") || undefined;
  const sort = c.req.query("sort") || "updated";

  const { items, nextCursor } = listSkills(limit, cursor, sort);

  return c.json({
    items: items.map((s) => ({
      slug: s.slug,
      displayName: s.displayName,
      summary: s.summary,
      tags: s.tags,
      stats: {},
      createdAt: s.publishedAt,
      updatedAt: s.publishedAt,
      latestVersion: {
        version: s.version,
        createdAt: s.publishedAt,
        changelog: "",
      },
    })),
    nextCursor,
  });
});

// GET /api/v1/skills/:slug — skill detail
api.get("/skills/:slug", (c) => {
  const slug = c.req.param("slug");
  const skill = getSkill(slug);

  if (!skill) {
    return c.json(
      { skill: null, latestVersion: null, owner: null, moderation: null },
      404,
    );
  }

  return c.json({
    skill: {
      slug: skill.slug,
      displayName: skill.displayName,
      summary: skill.summary,
      tags: skill.tags,
      stats: {},
      createdAt: skill.publishedAt,
      updatedAt: skill.publishedAt,
    },
    latestVersion: {
      version: skill.version,
      createdAt: skill.publishedAt,
      changelog: "",
    },
    owner: {
      handle: skill.owner,
      displayName: skill.owner,
      image: null,
    },
    moderation: {
      isSuspicious: false,
      isMalwareBlocked: false,
    },
  });
});

// GET /api/v1/skills/:slug/versions — version list
api.get("/skills/:slug/versions", (c) => {
  const slug = c.req.param("slug");
  const skill = getSkill(slug);

  if (!skill) {
    return c.json({ items: [], nextCursor: null }, 404);
  }

  return c.json({
    items: [
      {
        version: skill.version,
        createdAt: skill.publishedAt,
        changelog: "",
        changelogSource: null,
      },
    ],
    nextCursor: null,
  });
});

// GET /api/v1/skills/:slug/versions/:version
api.get("/skills/:slug/versions/:version", (c) => {
  const slug = c.req.param("slug");
  const skill = getSkill(slug);

  if (!skill) {
    return c.json({ version: null, skill: null }, 404);
  }

  return c.json({
    version: {
      version: skill.version,
      createdAt: skill.publishedAt,
      changelog: "",
      changelogSource: null,
    },
    skill: {
      slug: skill.slug,
      displayName: skill.displayName,
    },
  });
});

// GET /api/v1/whoami
api.get("/whoami", (c) => {
  // MVP: no auth, return anonymous
  return c.json({
    user: {
      handle: null,
      displayName: null,
      image: null,
    },
  });
});

// Health info for the API layer
api.get("/health", (c) => {
  return c.json({
    status: "ok",
    skillCount: getIndexSize(),
  });
});

export default api;
