import pino from "pino";

export const logger = pino({
  name: "agent-server",
  level: process.env["LOG_LEVEL"] || "info",
});
