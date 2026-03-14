import pino from "pino";

export const logger = pino({
  name: "openclaw-server",
  level: process.env["LOG_LEVEL"] || "info",
});
