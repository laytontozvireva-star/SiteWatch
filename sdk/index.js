(function () {
  function init(options) {
    if (!options || !options.apiKey) {
      console.error("SiteWatch: API key is required.");
      return;
    }

    const apiKey = options.apiKey;
    const endpoint =
      options.endpoint || "http://localhost:5000/api/errors";

    function sendError(errorData) {
      fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sitewatch-key": apiKey,
        },
        body: JSON.stringify(errorData),
      }).catch(() => {
        // Monitoring should never break the user's website.
      });
    }

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

    console.log("SiteWatch monitoring started.");
  }

  window.SiteWatch = {
    init,
  };
})();