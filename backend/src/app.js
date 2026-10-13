const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const config = require("./config");
const { globalLimiter } = require("./middleware/rateLimiter");
const {
  handleBodyParseError,
  handleNotFound,
  handleGlobalError,
} = require("./middleware/errorHandler");
const logger = require("./utils/logger");

// Route handlers
const healthRoutes = require("./routes/health");
const sdkRoutes = require("./routes/sdk");
const projectsRoutes = require("./routes/projects");
const errorsRoutes = require("./routes/errors");
const analyticsRoutes = require("./routes/analytics");
const alertsRoutes = require("./routes/alerts");

const app = express();

// Trust proxy if deployed behind reverse proxy (Vercel, Render, Nginx, Cloudflare)
app.set("trust proxy", 1);

// 1. Security headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// 2. CORS configuration (allows external websites to send telemetry)
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-sitewatch-key",
      "Origin",
      "Accept",
    ],
    credentials: false,
  })
);

// 3. Request body parsing with strict payload bounds
app.use(express.json({ limit: config.payload.maxJsonSize }));
app.use(express.urlencoded({ extended: true, limit: config.payload.maxJsonSize }));

// Guard against malformed JSON payloads
app.use(handleBodyParseError);

// 4. Global API rate limiting
app.use(globalLimiter);

// 5. Lightweight request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    // Only log non-health endpoints or slow/error responses to keep stdout clean
    if (!req.path.includes("/health") && (res.statusCode >= 400 || Date.now() - start > 500)) {
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${Date.now() - start}ms`);
    }
  });
  next();
});

// 6. Root & Health endpoints
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SiteWatch Monitoring API is running",
    version: "1.0.0",
    docs: "/health",
  });
});

app.use(healthRoutes);
app.use("/api", healthRoutes);

// 7. SDK distribution endpoint (/sdk/sitewatch.js)
app.use("/sdk", sdkRoutes);

// 8. Core API routes
app.use("/api", projectsRoutes);
app.use("/api", errorsRoutes);
app.use("/api", analyticsRoutes);
app.use("/api", alertsRoutes);

// 9. 404 handler for unmatched routes
app.use(handleNotFound);

// 10. Global error handler (must be last middleware)
app.use(handleGlobalError);

module.exports = app;
