const { supabase } = require("./supabase");
const { alertDebounceCache } = require("./cache");
const config = require("../config");
const logger = require("../utils/logger");

/**
 * Sanitize and truncate error inputs to safe limits
 */
function sanitizeErrorPayload(payload) {
  const { maxMessageLen, maxUrlLen, maxPageLen, maxStackLen, maxBrowserLen } =
    config.payload;

  return {
    type: String(payload.type || "javascript").trim(),
    message: String(payload.message || "").trim().slice(0, maxMessageLen),
    url: payload.url ? String(payload.url).trim().slice(0, maxUrlLen) : null,
    page: payload.page ? String(payload.page).trim().slice(0, maxPageLen) : null,
    stack: payload.stack ? String(payload.stack).slice(0, maxStackLen) : null,
    browser: payload.browser
      ? String(payload.browser).trim().slice(0, maxBrowserLen)
      : null,
    user_agent: payload.user_agent
      ? String(payload.user_agent).trim().slice(0, maxBrowserLen)
      : null,
  };
}

/**
 * Ingest an error from a monitored website
 */
async function recordError({ projectId, payload, ipAddress, userAgent }) {
  const sanitized = sanitizeErrorPayload(payload);

  if (!sanitized.user_agent && userAgent) {
    sanitized.user_agent = String(userAgent).slice(0, config.payload.maxBrowserLen);
  }
  if (!sanitized.browser && sanitized.user_agent) {
    sanitized.browser = sanitized.user_agent;
  }

  // 1. Insert into 'errors' table
  const { data: savedError, error: saveError } = await supabase
    .from("errors")
    .insert([
      {
        project_id: projectId,
        type: sanitized.type,
        message: sanitized.message,
        url: sanitized.url,
        page: sanitized.page,
        stack: sanitized.stack,
        browser: sanitized.browser,
        user_agent: sanitized.user_agent,
      },
    ])
    .select()
    .single();

  if (saveError) {
    logger.error("Failed to insert error into Supabase:", saveError);
    throw new Error("Could not record error: " + saveError.message);
  }

  // 2. Asynchronously record occurrence into 'error_events' (non-blocking)
  recordErrorEventAsync({
    errorId: savedError.id,
    userAgent: sanitized.user_agent,
    ipAddress,
  });

  // 3. Debounced alert creation (prevents flooding alerts table during error storms)
  createAlertDebounced({
    projectId,
    errorId: savedError.id,
    message: sanitized.message,
    page: sanitized.page,
  }).catch((err) => {
    logger.warn("Non-fatal alert creation notice:", err.message);
  });

  return savedError;
}

/**
 * Record individual occurrence into error_events without slowing down error response
 */
async function recordErrorEventAsync({ errorId, userAgent, ipAddress }) {
  try {
    await supabase.from("error_events").insert([
      {
        error_id: errorId,
        user_agent: userAgent || null,
        ip_address: ipAddress || null,
      },
    ]);
  } catch (err) {
    // Non-fatal, log silently
    logger.debug("Optional error_event write skipped or failed:", err.message);
  }
}

/**
 * Create alert only if an identical unread alert hasn't been created recently
 */
async function createAlertDebounced({ projectId, errorId, message, page }) {
  const debounceKey = `${projectId}:${message.slice(0, 100)}:${page || ""}`;

  // If already triggered recently, skip duplicate alert
  if (alertDebounceCache.get(debounceKey)) {
    return;
  }

  alertDebounceCache.set(debounceKey, true);

  const { error: alertError } = await supabase.from("alerts").insert([
    {
      project_id: projectId,
      error_id: errorId,
      type: "error",
      message: message.slice(0, 2000),
      page: page || null,
      is_read: false,
    },
  ]);

  if (alertError) {
    logger.warn("Could not create alert in database:", alertError.message);
  }
}

module.exports = {
  sanitizeErrorPayload,
  recordError,
};
