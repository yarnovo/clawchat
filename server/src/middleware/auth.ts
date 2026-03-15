import { Context, MiddlewareHandler } from 'hono';
import { jwt } from 'hono/jwt';

/**
 * JWT payload structure (issued by im-server)
 */
export interface JwtPayload {
  accountId: string;
  type: string;
  name: string;
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
 * Skips authentication for /health endpoint.
 */
export function authMiddleware(): MiddlewareHandler {
  const secret = process.env.JWT_SECRET || 'dev-secret';

  const jwtMiddleware = jwt({ secret, alg: 'HS256' });

  return async (c: Context, next) => {
    // Skip auth for health check
    if (c.req.path === '/health') {
      return next();
    }

    // Run Hono's built-in JWT middleware
    await jwtMiddleware(c, async () => {});

    // Extract payload and set on context
    const payload = c.get('jwtPayload') as JwtPayload;
    if (!payload?.accountId) {
      return c.json({ error: 'Invalid token: missing accountId' }, 401);
    }

    c.set('userId', payload.accountId);
    c.set('userType', payload.type);
    c.set('userName', payload.name);

    await next();
  };
}
