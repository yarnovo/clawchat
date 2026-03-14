import { Hono } from "hono";
import { prisma } from "../db.js";
import { redis } from "../redis.js";

const health = new Hono();

health.get("/", async (c) => {
  const checks: Record<string, "ok" | "error"> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = "ok";
  } catch {
    checks.db = "error";
  }

  try {
    await redis.ping();
    checks.redis = "ok";
  } catch {
    checks.redis = "error";
  }

  const status = Object.values(checks).every((v) => v === "ok")
    ? "ok"
    : "degraded";

  return c.json({ status, checks }, status === "ok" ? 200 : 503);
});

export default health;
