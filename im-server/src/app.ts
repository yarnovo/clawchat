import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import auth from "./routes/auth.js";
import accounts from "./routes/accounts.js";
import friends from "./routes/friends.js";
import conversations from "./routes/conversations.js";
import messages from "./routes/messages.js";
import internal from "./routes/internal.js";
import health from "./routes/health.js";

const app = new Hono().basePath("/v1/im");

app.use("*", cors());
app.use("*", logger());

app.route("/health", health);
app.route("/auth", auth);
app.route("/accounts", accounts);
app.route("/friends", friends);
app.route("/conversations", conversations);
app.route("/messages", messages);
app.route("/internal", internal);

export default app;
