const express = require("express");
const { checkDatabaseConnection } = require("../services/supabase");

const router = express.Router();

const startTime = Date.now();

router.get("/health", async (req, res) => {
  const dbStatus = await checkDatabaseConnection();
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  const memoryUsage = process.memoryUsage();

  const isHealthy = dbStatus.ok;

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    status: isHealthy ? "healthy" : "degraded",
    uptimeSeconds,
    database: dbStatus.ok ? "connected" : `disconnected: ${dbStatus.error}`,
    memory: {
      rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
      heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
