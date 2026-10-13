const app = require("./src/app");
const config = require("./src/config");
const logger = require("./src/utils/logger");

const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(`SiteWatch API is running on port ${PORT} [env: ${config.env}]`);
  logger.info(`Health check available at http://localhost:${PORT}/health`);
});

// -------------------------------------------------------------
// Process Resilience & Crash Prevention
// -------------------------------------------------------------

// Guard against unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Promise Rejection at:", promise);
  logger.error("Reason:", reason);
  // Do NOT abruptly crash the entire monitoring server
});

// Guard against uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception thrown in process:", error);
  // Log critical error; keep server running for non-fatal errors or trigger graceful exit if fatal
});

// -------------------------------------------------------------
// Graceful Shutdown Handlers (SIGTERM, SIGINT)
// -------------------------------------------------------------

let isShuttingDown = false;

function gracefulShutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Shutting down SiteWatch server gracefully...`);

  // Stop accepting new incoming requests
  server.close((err) => {
    if (err) {
      logger.error("Error closing HTTP server:", err);
      process.exit(1);
    }
    logger.info("HTTP server closed. Exiting process.");
    process.exit(0);
  });

  // Force close after 10 seconds if hanging connections persist
  setTimeout(() => {
    logger.warn("Graceful shutdown timed out. Forcing process exit.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

module.exports = { app, server };