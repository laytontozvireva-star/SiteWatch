const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const requiredEnvVars = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  console.warn(
    `[SiteWatch Warning] Missing environment variable(s): ${missingVars.join(", ")}. Supabase queries will fail until provided.`
  );
}

const config = {
  env: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  port: parseInt(process.env.PORT, 10) || 5000,
  supabase: {
    url:
      process.env.SUPABASE_URL || "https://ojmncwucrwlcztbemhoo.supabase.co",
    serviceRoleKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbW5jd3VjcndsY3p0YmVtaG9vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTE5MjUzNiwiZXhwIjoyMTA2NzY4NTM2fQ.rVrqo4p5M-ulRxiO82w2u6-IIOXV7ZP38NO3JZdFQV0",
  },
  rateLimits: {
    globalWindowMs: 60 * 1000,
    globalMax: 600, // 600 requests per minute
    ingestionWindowMs: 60 * 1000,
    ingestionMax: 180, // 180 error reports per minute per key/IP
    createProjectMax: 20, // 20 new projects per 15 mins per user
  },
  cache: {
    projectTtlMs: 60 * 1000, // Cache validated project API keys for 60 seconds
    alertDebounceMs: 15 * 60 * 1000, // Debounce duplicate unread alerts for 15 minutes
  },
  payload: {
    maxJsonSize: "50kb",
    maxMessageLen: 2000,
    maxUrlLen: 2048,
    maxPageLen: 500,
    maxStackLen: 10000,
    maxBrowserLen: 500,
  },
  vercel: {
    clientId: process.env.VERCEL_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.VERCEL_OAUTH_CLIENT_SECRET || "",
    redirectUri: process.env.VERCEL_OAUTH_REDIRECT_URI || "",
    webhookSecret: process.env.VERCEL_WEBHOOK_SECRET || "",
    // A base64 encoded, cryptographically-random 32 byte key. It is deliberately
    // separate from the OAuth client secret so either can be rotated independently.
    tokenEncryptionKey: process.env.VERCEL_TOKEN_ENCRYPTION_KEY || "",
  },
};

module.exports = config;
