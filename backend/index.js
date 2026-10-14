const app = require("./src/app");
const config = require("./src/config");
const logger = require("./src/utils/logger");

const PORT = config.port;

let server = null;

// In serverless environments (like Vercel), the platform routes directly to the app handler.
// In standalone environments (local, Docker, Render), we start the HTTP listener.
if (process.env.VERCEL !== "1") {
  server = app.listen(PORT, () => {
    logger.info(`SiteWatch API is running on port ${PORT} [env: ${config.env}]`);
    logger.info(`Health check available at http://localhost:${PORT}/health`);
  });

  let isShuttingDown = false;
  const gracefulShutdown = (signal) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`Received ${signal}. Shutting down SiteWatch server gracefully...`);

    if (server) {
      server.close((err) => {
        if (err) {
          logger.error("Error closing HTTP server:", err);
          process.exit(1);
        }
        logger.info("HTTP server closed. Exiting process.");
        process.exit(0);
      });
    }

    setTimeout(() => {
      logger.warn("Graceful shutdown timed out. Forcing process exit.");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

// Guard against unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Promise Rejection at:", promise);
  logger.error("Reason:", reason);
});

// Guard against uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception thrown in process:", error);
});

// Export app function directly as required by Vercel Express framework
module.exports = app;
module.exports.app = app;
module.exports.server = server;