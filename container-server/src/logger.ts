import pino from "pino";

export const logger = pino({
  name: "container-server",
  level: process.env["LOG_LEVEL"] || "info",
});
