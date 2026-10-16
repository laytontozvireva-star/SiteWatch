const rateLimit = require("express-rate-limit");
const config = require("../config");

/**
 * General limiter for overall API
 */
const globalLimiter = rateLimit({
  windowMs: config.rateLimits.globalWindowMs,
  limit: config.rateLimits.globalMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests to SiteWatch API. Please try again shortly.",
  },
});

/**
 * High-capacity limiter for error ingestion
 * Prevents runaway loops on monitored client sites while accommodating normal error bursts
 */
const errorIngestionLimiter = rateLimit({
  windowMs: config.rateLimits.ingestionWindowMs,
  limit: config.rateLimits.ingestionMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    // Rate limit per API key if present, otherwise by IP
    const apiKey = req.get("x-sitewatch-key");
    if (apiKey) return `key_${apiKey}`;
    return req.ip || req.socket.remoteAddress || "unknown_ip";
  },
  message: {
    success: false,
    message: "Rate limit exceeded for error reporting. Ingestion throttled to protect system.",
  },
});

/**
 * Public error endpoint limiter (for websites using origin-based reporting)
 */
const publicReportLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    const origin = req.get("origin") || req.ip || "unknown_origin";
    return `origin_${origin}`;
  },
  message: {
    success: false,
    message: "Too many public error reports from this origin. Ingestion throttled.",
  },
});

/**
 * Limiter for creating projects
 */
const createProjectLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.rateLimits.createProjectMax,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Project creation limit reached. Please wait a few minutes before trying again.",
  },
});

const vercelIntegrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => `vercel_user_${req.authUser?.id || req.ip || "unknown"}`,
  message: { success: false, message: "Too many Vercel integration requests. Please try again shortly." },
});

const vercelWebhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { success: false, message: "Webhook rate limit exceeded." },
});

module.exports = {
  globalLimiter,
  errorIngestionLimiter,
  publicReportLimiter,
  createProjectLimiter,
  vercelIntegrationLimiter,
  vercelWebhookLimiter,
};
