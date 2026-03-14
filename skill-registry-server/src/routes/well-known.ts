import { Hono } from "hono";

const wellKnown = new Hono();

// ClawHub discovery protocol
// CLI calls GET /.well-known/clawhub.json to find the API base
wellKnown.get("/clawhub.json", (c) => {
  const host = c.req.header("host") || "localhost:3007";
  const proto = c.req.header("x-forwarded-proto") || "http";
  const apiBase = `${proto}://${host}`;

  return c.json({
    apiBase,
    minCliVersion: "0.1.0",
  });
});

// Legacy alias
wellKnown.get("/clawdhub.json", (c) => {
  const host = c.req.header("host") || "localhost:3007";
  const proto = c.req.header("x-forwarded-proto") || "http";
  const apiBase = `${proto}://${host}`;

  return c.json({
    apiBase,
    minCliVersion: "0.1.0",
  });
});

export default wellKnown;
