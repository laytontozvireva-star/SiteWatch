const DEFAULT_ENDPOINT = "https://sitewatch-sigma.vercel.app/api/errors";
const ACTIVE_KEY = Symbol.for("sitewatch.sdk.cleanup");

/**
 * Start browser error monitoring for a SiteWatch project.
 * Returns a cleanup function, which is useful when initializing from a UI effect.
 */
export function initSiteWatch({ apiKey, endpoint = DEFAULT_ENDPOINT } = {}) {
  if (typeof window === "undefined") return () => {};
  if (!apiKey || typeof apiKey !== "string") {
    throw new Error("SiteWatch: apiKey is required.");
  }
  if (typeof window.fetch !== "function") {
    throw new Error("SiteWatch: this browser does not support fetch.");
  }

  if (window[ACTIVE_KEY]) return window[ACTIVE_KEY];

  const originalFetch = window.fetch;
  const report = (payload) => {
    try {
      originalFetch.call(window, endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sitewatch-key": apiKey,
        },
        body: JSON.stringify({
          ...payload,
          url: payload.url || window.location.href,
          page: window.location.pathname,
          browser: navigator.userAgent,
          user_agent: navigator.userAgent,
        }),
      }).catch(() => {});
    } catch {
      // Monitoring must never interrupt the monitored website.
    }
  };

  const handleError = (event) => {
    report({
      type: "javascript",
      message: event.message || "Unknown JavaScript error",
      stack: event.error?.stack || null,
    });
  };

  const handleRejection = (event) => {
    const reason = event.reason;
    report({
      type: "unhandled_promise",
      message: reason?.message || String(reason || "Unhandled promise rejection"),
      stack: reason?.stack || null,
    });
  };

  const monitoredFetch = async function (...args) {
    const requestUrl = typeof args[0] === "string" ? args[0] : args[0]?.url || "Unknown URL";
    if (typeof requestUrl === "string" && requestUrl.includes("/api/errors")) {
      return originalFetch.apply(this, args);
    }

    try {
      const response = await originalFetch.apply(this, args);
      if (!response.ok) {
        report({
          type: "api",
          message: `API request failed with status ${response.status}`,
          url: requestUrl,
          stack: null,
        });
      }
      return response;
    } catch (error) {
      report({
        type: "api",
        message: error?.message || "API request failed",
        url: requestUrl,
        stack: error?.stack || null,
      });
      throw error;
    }
  };

  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleRejection);
  window.fetch = monitoredFetch;

  const cleanup = () => {
    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleRejection);
    if (window.fetch === monitoredFetch) window.fetch = originalFetch;
    if (window[ACTIVE_KEY] === cleanup) delete window[ACTIVE_KEY];
  };

  window[ACTIVE_KEY] = cleanup;
  return cleanup;
}

export default initSiteWatch;
