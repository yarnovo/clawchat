import { Hono } from "hono";
import { prisma } from "../db.js";
import { enqueueAgentReply } from "../agent-reply-worker.js";

// Internal endpoints — no auth required
// Called by OpenClaw containers within Docker network
const internal = new Hono();

// Receive agent reply from OpenClaw container callback
// Enqueue to Redis for reliable processing
internal.post("/agent-reply", async (c) => {
  const { conversationId, senderId, content, type: msgType } = await c.req.json();

  if (!conversationId || !senderId || !content) {
    return c.json({ error: "conversationId, senderId, and content are required" }, 400);
  }

  await enqueueAgentReply({
    conversationId,
    senderId,
    content,
    type: msgType || "text",
  });

  return c.json({ ok: true }, 202);
});

// Cleanup E2E smoke test data — delete accounts with "e2e-smoke-" prefix and all related data
internal.post("/cleanup-test-data", async (c) => {
  const PREFIX = "e2e-smoke-";

  const testAccounts = await prisma.account.findMany({
    where: { name: { startsWith: PREFIX } },
    select: { id: true },
  });

  if (testAccounts.length === 0) {
    return c.json({ deleted: 0 });
  }

  const accountIds = testAccounts.map((a) => a.id);

  await prisma.$transaction(async (tx) => {
    // Find conversations involving test accounts (targetId contains accountId)
    const conversations = await tx.conversation.findMany({
      where: { OR: accountIds.map((id) => ({ targetId: { contains: id } })) },
      select: { id: true },
    });
    const convIds = conversations.map((c) => c.id);

    // Delete messages in those conversations
    if (convIds.length > 0) {
      await tx.message.deleteMany({ where: { conversationId: { in: convIds } } });
    }
    // Delete any remaining messages sent by test accounts
    await tx.message.deleteMany({ where: { senderId: { in: accountIds } } });

    // Delete conversations
    if (convIds.length > 0) {
      await tx.conversation.deleteMany({ where: { id: { in: convIds } } });
    }

    // Delete friendships
    await tx.friendship.deleteMany({
      where: { OR: [{ accountAId: { in: accountIds } }, { accountBId: { in: accountIds } }] },
    });

    // Delete group memberships and owned groups
    await tx.groupMember.deleteMany({ where: { accountId: { in: accountIds } } });
    await tx.group.deleteMany({ where: { ownerId: { in: accountIds } } });

    // Delete accounts
    await tx.account.deleteMany({ where: { id: { in: accountIds } } });
  });

  return c.json({ deleted: accountIds.length });
});

// Update account searchable flag
internal.patch("/accounts/:id", async (c) => {
  const id = c.req.param("id");
  const { searchable } = await c.req.json();

  if (typeof searchable !== "boolean") {
    return c.json({ error: "searchable (boolean) is required" }, 400);
  }

  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) {
    return c.json({ error: "Account not found" }, 404);
  }

  const updated = await prisma.account.update({
    where: { id },
    data: { searchable },
    select: { id: true, searchable: true },
  });

  return c.json(updated);
});

// Get pending friend requests for an account
internal.get("/friend-requests/:accountId", async (c) => {
  const accountId = c.req.param("accountId");

  const requests = await prisma.friendship.findMany({
    where: { accountBId: accountId, status: "pending" },
    include: {
      accountA: { select: { id: true, name: true, avatar: true, type: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return c.json(requests);
});

// Handle friend request on behalf of account (proxy review)
internal.patch("/friend-requests/:id", async (c) => {
  const id = c.req.param("id");
  const { status } = await c.req.json();

  if (!status || !["accepted", "rejected"].includes(status)) {
    return c.json({ error: "status must be accepted or rejected" }, 400);
  }

  const friendship = await prisma.friendship.findUnique({ where: { id } });
  if (!friendship) {
    return c.json({ error: "Request not found" }, 404);
  }

  if (friendship.status !== "pending") {
    return c.json({ error: "Request already handled" }, 409);
  }

  const updated = await prisma.friendship.update({
    where: { id },
    data: { status },
    include: {
      accountA: { select: { id: true, name: true, avatar: true, type: true } },
      accountB: { select: { id: true, name: true, avatar: true, type: true } },
    },
  });

  return c.json(updated);
});

export default internal;
