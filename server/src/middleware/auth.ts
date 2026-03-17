import { Context, MiddlewareHandler } from 'hono';
import { getCookie } from 'hono/cookie';
import { jwt } from 'hono/jwt';

/**
 * JWT payload structure
 */
export interface JwtPayload {
  accountId: string;
  type: string;
  name: string;
  /** Present when type === 'agent' */
  agentId?: string;
}

/**
 * Typed context variables set by auth middleware
 */
export interface AuthEnv {
  Variables: {
    userId: string;
    userType: string;
    userName: string;
    jwtPayload: JwtPayload;
  };
}

/**
 * JWT auth middleware.
 * Reads token from httpOnly cookie or Authorization header.
 * Skips /health and /api/auth/* endpoints.
 */
export function authMiddleware(): MiddlewareHandler {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const jwtMiddleware = jwt({ secret, alg: 'HS256' });

  return async (c: Context, next) => {
    // Skip auth for health check and public auth endpoints
    const publicPaths = ['/health', '/api/auth/login', '/api/auth/register', '/api/auth/logout'];
    if (publicPaths.includes(c.req.path)) {
      return next();
    }

    // Read token from cookie and inject as Authorization header
    const cookieToken = getCookie(c, 'token');
    if (cookieToken && !c.req.header('Authorization')) {
      c.req.raw.headers.set('Authorization', `Bearer ${cookieToken}`);
    }

    // Run Hono's built-in JWT middleware
    await jwtMiddleware(c, async () => {});

    // Extract payload and set on context
    const payload = c.get('jwtPayload') as JwtPayload;
    if (!payload?.accountId) {
      return c.json({ error: 'Invalid token: missing accountId' }, 401);
    }

    // Agent tokens use ownerId (stored as accountId) so ownership checks work
    c.set('userId', payload.accountId);
    c.set('userType', payload.type);
    c.set('userName', payload.name || '');

    await next();
  };
}
