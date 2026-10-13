const logger = require("../utils/logger");
const config = require("../config");

/**
 * Middleware: Handle malformed JSON body errors
 */
function handleBodyParseError(err, req, res, next) {
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Malformed JSON payload provided.",
    });
  }
  next(err);
}

/**
 * Middleware: 404 handler for unmapped endpoints
 */
function handleNotFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Middleware: Global error handler
 */
function handleGlobalError(err, req, res, next) {
  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);

  const status = typeof err.status === "number" ? err.status : 500;
  const message =
    err.message || "An unexpected server error occurred. Please try again later.";

  res.status(status).json({
    success: false,
    message,
    ...(config.isProduction ? {} : { stack: err.stack }),
  });
}

module.exports = {
  handleBodyParseError,
  handleNotFound,
  handleGlobalError,
};
