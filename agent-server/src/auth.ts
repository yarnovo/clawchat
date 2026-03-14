import jwt from "jsonwebtoken";
import type { Context, Next } from "hono";
import type { AppEnv } from "./env.js";

const JWT_SECRET = process.env["JWT_SECRET"] || "clawchat-dev-secret";

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { sub: string; type: string };
}

// JWT auth middleware — verifies token, sets accountId/accountType on context
export async function authMiddleware(c: Context<AppEnv>, next: Next) {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const payload = verifyToken(header.slice(7));
    c.set("accountId", payload.sub);
    c.set("accountType", payload.type);
    await next();
  } catch {
    return c.json({ error: "Invalid token" }, 401);
  }
}
