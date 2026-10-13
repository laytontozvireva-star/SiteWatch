const express = require("express");
const { query } = require("express-validator");
const { supabase } = require("../services/supabase");
const { requireApiKey } = require("../middleware/auth");
const validate = require("../middleware/validate");
const logger = require("../utils/logger");

const router = express.Router();

function calculateStartDate(range) {
  const startDate = new Date();
  if (range === "24h") {
    startDate.setHours(startDate.getHours() - 24);
  } else if (range === "7d") {
    startDate.setDate(startDate.getDate() - 7);
  } else {
    // Default 30d
    startDate.setDate(startDate.getDate() - 30);
  }
  return startDate;
}

/**
 * GET /api/analytics - Overall error counts by type
 */
router.get(
  "/analytics",
  requireApiKey,
  validate([
    query("range")
      .optional()
      .isIn(["24h", "7d", "30d"])
      .withMessage("Invalid range. Use 24h, 7d, or 30d"),
  ]),
  async (req, res, next) => {
    try {
      const range = req.query.range || "30d";
      const project = req.project;
      const startDate = calculateStartDate(range);

      // Performance optimization: select ONLY 'type' column, bounded to 10,000 max
      const { data: errors, error } = await supabase
        .from("errors")
        .select("type")
        .eq("project_id", project.id)
        .gte("created_at", startDate.toISOString())
        .limit(10000);

      if (error) {
        logger.error("Analytics fetch error:", error);
        return res.status(500).json({
          success: false,
          message: "Could not retrieve analytics data: " + error.message,
        });
      }

      const list = errors || [];
      const totalErrors = list.length;
      let javascriptErrors = 0;
      let apiErrors = 0;
      let promiseErrors = 0;

      for (let i = 0; i < totalErrors; i++) {
        const t = list[i].type;
        if (t === "javascript") javascriptErrors++;
        else if (t === "api") apiErrors++;
        else if (t === "unhandled_promise") promiseErrors++;
      }

      return res.status(200).json({
        success: true,
        range,
        analytics: {
          totalErrors,
          javascriptErrors,
          apiErrors,
          promiseErrors,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/trend - Error volume grouped by date
 */
router.get(
  "/analytics/trend",
  requireApiKey,
  validate([
    query("range")
      .optional()
      .isIn(["24h", "7d", "30d"])
      .withMessage("Invalid range"),
  ]),
  async (req, res, next) => {
    try {
      const range = req.query.range || "30d";
      const project = req.project;
      const startDate = calculateStartDate(range);

      // Select ONLY 'type, created_at' to keep memory and network footprint minimal
      const { data, error } = await supabase
        .from("errors")
        .select("type, created_at")
        .eq("project_id", project.id)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true })
        .limit(5000);

      if (error) {
        logger.error("Trend fetch error:", error);
        return res.status(500).json({
          success: false,
          message: "Could not retrieve trend data: " + error.message,
        });
      }

      const trend = {};
      const rows = data || [];

      for (let i = 0; i < rows.length; i++) {
        const item = rows[i];
        const date = item.created_at
          ? new Date(item.created_at).toISOString().split("T")[0]
          : "unknown";

        if (!trend[date]) {
          trend[date] = { total: 0, javascript: 0, api: 0, unhandled_promise: 0 };
        }

        trend[date].total += 1;
        if (item.type === "javascript") trend[date].javascript += 1;
        else if (item.type === "api") trend[date].api += 1;
        else if (item.type === "unhandled_promise") trend[date].unhandled_promise += 1;
      }

      return res.status(200).json({
        success: true,
        range,
        trend,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/analytics/common - Top recurring error messages
 */
router.get("/analytics/common", requireApiKey, async (req, res, next) => {
  try {
    const range = req.query.range || "30d";
    const project = req.project;
    const startDate = calculateStartDate(range);

    // Select ONLY 'message' bounded to 2000
    const { data: errors, error } = await supabase
      .from("errors")
      .select("message")
      .eq("project_id", project.id)
      .gte("created_at", startDate.toISOString())
      .limit(2000);

    if (error) {
      logger.error("Common errors fetch error:", error);
      return res.status(500).json({
        success: false,
        message: "Could not retrieve common errors: " + error.message,
      });
    }

    const counts = {};
    const rows = errors || [];

    for (let i = 0; i < rows.length; i++) {
      const msg = rows[i].message || "Unknown error";
      counts[msg] = (counts[msg] || 0) + 1;
    }

    const commonErrors = Object.entries(counts)
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return res.json({ commonErrors });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analytics/pages - Top affected pages
 */
router.get("/analytics/pages", requireApiKey, async (req, res, next) => {
  try {
    const range = req.query.range || "30d";
    const project = req.project;
    const startDate = calculateStartDate(range);

    // Select ONLY 'page' bounded to 2000
    const { data: errors, error } = await supabase
      .from("errors")
      .select("page")
      .eq("project_id", project.id)
      .gte("created_at", startDate.toISOString())
      .limit(2000);

    if (error) {
      logger.error("Pages analytics fetch error:", error);
      return res.status(500).json({
        success: false,
        message: "Could not retrieve pages: " + error.message,
      });
    }

    const counts = {};
    const rows = errors || [];

    for (let i = 0; i < rows.length; i++) {
      const p = rows[i].page || "Unknown page";
      counts[p] = (counts[p] || 0) + 1;
    }

    const topPages = Object.entries(counts)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return res.json({ topPages });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
