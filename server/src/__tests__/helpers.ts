import { sign } from 'hono/jwt';

export const TEST_SECRET = 'test-secret';

export async function createTestToken(
  accountId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  opts: { type?: string; name?: string } = {},
) {
  return sign(
    {
      accountId,
      type: opts.type ?? 'human',
      name: opts.name ?? 'TestUser',
    },
    TEST_SECRET,
  );
}

/** Convenience: returns { Authorization: 'Bearer <token>' } */
export async function authHeader(accountId?: string) {
  const token = await createTestToken(accountId);
  return { Authorization: `Bearer ${token}` };
}
