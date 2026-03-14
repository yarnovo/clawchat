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
  requestId?: string;
}): Promise<ImAccount> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.requestId) headers["x-request-id"] = opts.requestId;

  const res = await fetch(`${IM_SERVER_URL}/v1/im/auth/register-agent`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: opts.name, avatar: opts.avatar }),
  });

  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || `im-server returned ${res.status}`);
  }

  const body = await res.json();
  return body.account;
}

// Add direct friendship between owner and agent
export async function addDirectFriend(
  accountAId: string,
  accountBId: string,
  requestId?: string,
): Promise<void> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (requestId) headers["x-request-id"] = requestId;

  const res = await fetch(`${IM_SERVER_URL}/v1/im/friends/add-direct`, {
    method: "POST",
    headers,
    body: JSON.stringify({ accountAId, accountBId }),
  });

  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || `im-server returned ${res.status}`);
  }
}

// Set account searchable flag
export async function setAccountSearchable(
  accountId: string,
  searchable: boolean,
): Promise<void> {
  const res = await fetch(`${IM_SERVER_URL}/v1/im/internal/accounts/${accountId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ searchable }),
  });

  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || `im-server returned ${res.status}`);
  }
}

// Get pending friend requests for an agent account
export async function getAgentFriendRequests(
  accountId: string,
): Promise<unknown[]> {
  const res = await fetch(`${IM_SERVER_URL}/v1/im/internal/friend-requests/${accountId}`);

  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || `im-server returned ${res.status}`);
  }

  return res.json();
}

// Handle a friend request on behalf of an agent
export async function handleAgentFriendRequest(
  requestId: string,
  status: "accepted" | "rejected",
): Promise<unknown> {
  const res = await fetch(`${IM_SERVER_URL}/v1/im/internal/friend-requests/${requestId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.error || `im-server returned ${res.status}`);
  }

  return res.json();
}

// Delete an Agent account from im-server
export async function deleteAgentAccount(
  accountId: string,
  requestId?: string,
): Promise<void> {
  const headers: Record<string, string> = {};
  if (requestId) headers["x-request-id"] = requestId;

  const res = await fetch(
    `${IM_SERVER_URL}/v1/im/accounts/${accountId}`,
    { method: "DELETE", headers },
  );

  if (!res.ok && res.status !== 404) {
    const body = await res.json();
    throw new Error(body.error || `im-server returned ${res.status}`);
  }
}
