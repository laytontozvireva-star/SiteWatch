(function () {
  let isInitialized = false;

  function init(options) {
    if (isInitialized) return;

    if (!options || !options.apiKey) {
      console.error("SiteWatch: API key is required.");
      return;
    }

    const apiKey = options.apiKey;
    const endpoint =
      options.endpoint || "http://localhost:5000/api/errors";

    const originalFetch = window.fetch;

    function sendError(errorData) {
      try {
        // Use originalFetch directly so sendError is never intercepted by our own hook
        originalFetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-sitewatch-key": apiKey,
          },
          body: JSON.stringify(errorData),
        }).catch(() => {
          // Monitoring should never break the user's website.
        });
      } catch (e) {
        // Fail silently
      }
    }

    // --------------------------------
    // JavaScript error monitoring
    // --------------------------------

    window.addEventListener("error", function (event) {
      sendError({
        type: "javascript",
        message: event.message || "Unknown JavaScript error",
        url: window.location.href,
        page: window.location.pathname,
        stack: event.error ? event.error.stack : null,
        browser: navigator.userAgent,
        user_agent: navigator.userAgent,
      });
    });

    // --------------------------------
    // Unhandled Promise monitoring
    // --------------------------------

    window.addEventListener("unhandledrejection", function (event) {
      const reason = event.reason;

      sendError({
        type: "unhandled_promise",
        message:
          reason && reason.message
            ? reason.message
            : String(reason || "Unhandled promise rejection"),
        url: window.location.href,
        page: window.location.pathname,
        stack: reason && reason.stack ? reason.stack : null,
        browser: navigator.userAgent,
        user_agent: navigator.userAgent,
      });
    });

    // --------------------------------
    // API / Fetch monitoring
    // --------------------------------

    window.fetch = async function (...args) {
      const requestUrl =
        typeof args[0] === "string"
          ? args[0]
          : args[0] && args[0].url
          ? args[0].url
          : "Unknown URL";

      // CRITICAL: Never intercept telemetry calls to SiteWatch itself to avoid recursive loops
      if (typeof requestUrl === "string" && (requestUrl.includes("/api/errors") || requestUrl.includes("/api/public-errors"))) {
        return originalFetch.apply(this, args);
      }

      try {
        const response = await originalFetch.apply(this, args);

        if (!response.ok) {
          sendError({
            type: "api",
            message: `API request failed with status ${response.status}`,
            url: requestUrl,
            page: window.location.pathname,
            stack: null,
            browser: navigator.userAgent,
            user_agent: navigator.userAgent,
          });
        }

        return response;
      } catch (error) {
        sendError({
          type: "api",
          message: error.message || "API request failed",
          url: requestUrl,
          page: window.location.pathname,
          stack: error.stack || null,
          browser: navigator.userAgent,
          user_agent: navigator.userAgent,
        });

        throw error;
      }
    };

    isInitialized = true;
    console.log("SiteWatch monitoring started.");
  }

  window.SiteWatch = {
    init,
  };

  // Auto-initialize if data-site-key attribute is supplied on script tag
  if (typeof document !== "undefined" && document.currentScript) {
    const siteKey = document.currentScript.getAttribute("data-site-key");
    if (siteKey) {
      let endpoint = "http://localhost:5000/api/errors";
      try {
        const scriptSrc = document.currentScript.src;
        if (scriptSrc) {
          const origin = new URL(scriptSrc).origin;
          endpoint = origin + "/api/errors";
        }
      } catch (e) {}
      init({ apiKey: siteKey, endpoint: endpoint });
    }
  }
})();