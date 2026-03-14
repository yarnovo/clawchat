import crypto from "node:crypto";

/**
 * Generate HMAC-SHA256 signature for IronClaw webhook authentication.
 * Format: sha256=<hex_digest> (matches IronClaw's verify_hmac_signature)
 */
export function signBody(secret: string, body: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  return `sha256=${hmac.digest("hex")}`;
}

/**
 * Generate a deterministic webhook secret for an Agent.
 * Derived from a master secret + agentId so it survives service restarts.
 */
export function deriveWebhookSecret(agentId: string): string {
  const master = process.env["WEBHOOK_MASTER_SECRET"] || "clawchat-ironclaw-default";
  const hmac = crypto.createHmac("sha256", master);
  hmac.update(agentId);
  return hmac.digest("hex");
}
