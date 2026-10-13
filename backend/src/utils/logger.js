/**
 * Structured logger for SiteWatch backend
 */
const config = require("../config");

function formatTime() {
  return new Date().toISOString();
}

const logger = {
  info: (message, meta) => {
    if (meta) {
      console.log(`[${formatTime()}] [INFO] ${message}`, meta);
    } else {
      console.log(`[${formatTime()}] [INFO] ${message}`);
    }
  },

  warn: (message, meta) => {
    if (meta) {
      console.warn(`[${formatTime()}] [WARN] ${message}`, meta);
    } else {
      console.warn(`[${formatTime()}] [WARN] ${message}`);
    }
  },

  error: (message, err) => {
    const errorDetails = err?.stack || err?.message || err;
    console.error(`[${formatTime()}] [ERROR] ${message}`, errorDetails);
  },

  debug: (message, meta) => {
    if (!config.isProduction) {
      if (meta) {
        console.log(`[${formatTime()}] [DEBUG] ${message}`, meta);
      } else {
        console.log(`[${formatTime()}] [DEBUG] ${message}`);
      }
    }
  },
};

module.exports = logger;
