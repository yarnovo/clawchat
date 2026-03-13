// HTTP client for im-server — register Agent accounts

const IM_SERVER_URL = process.env["IM_SERVER_URL"] || "http://localhost:3000";

export interface ImAccount {
  id: string;
  name: string;
  type: string;
  avatar?: string;
}

// Register an Agent account in im-server (no password, no email)
export async function registerAgentAccount(opts: {
  name: string;
  avatar?: string;
}): Promise<ImAccount> {
  const res = await fetch(`${IM_SERVER_URL}/v1/im/auth/register-agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: opts.name, avatar: opts.avatar }),
  });

  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || `im-server returned ${res.status}`);
  }

  const body = await res.json();
  return body.account;
}

// Delete an Agent account from im-server
export async function deleteAgentAccount(accountId: string): Promise<void> {
  const res = await fetch(
    `${IM_SERVER_URL}/v1/im/accounts/${accountId}`,
    { method: "DELETE" },
  );

  if (!res.ok && res.status !== 404) {
    const body = await res.json();
    throw new Error(body.error || `im-server returned ${res.status}`);
  }
}
