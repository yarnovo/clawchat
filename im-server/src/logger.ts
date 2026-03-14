import pino from "pino";

export const logger = pino({
  name: "im-server",
  level: process.env["LOG_LEVEL"] || "info",
});
