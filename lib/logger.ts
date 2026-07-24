import pino from "pino";

// Denylist approach: these keys are redacted wherever they appear in a
// logged object, at any nesting depth pino's redact path supports.
export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  redact: {
    paths: [
      "password",
      "passwordHash",
      "*.password",
      "*.passwordHash",
      "token",
      "tokenHash",
      "*.token",
      "*.tokenHash",
      "cookie",
      "*.cookie",
      "req.headers.cookie",
      "req.headers.authorization",
    ],
    censor: "[REDACTED]",
  },
});
