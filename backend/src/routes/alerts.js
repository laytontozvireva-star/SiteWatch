const express = require("express");
const { supabase } = require("../services/supabase");
const { requireApiKey } = require("../middleware/auth");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * GET /api/alerts - List recent alerts for this project
 */
router.get("/alerts", requireApiKey, async (req, res, next) => {
  try {
    const project = req.project;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const { data, error } = await supabase
      .from("alerts")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      logger.error("Could not fetch alerts:", error);
      return res.status(500).json({
        success: false,
        message: "Could not load alerts: " + error.message,
      });
    }

    return res.json({
      success: true,
      alerts: data || [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/alerts/:id/read - Mark single alert as read
 */
router.patch("/alerts/:id/read", requireApiKey, async (req, res, next) => {
  try {
    const project = req.project;
    const { id } = req.params;

    const { data, error } = await supabase
      .from("alerts")
      .update({ is_read: true })
      .eq("id", id)
      .eq("project_id", project.id)
      .select()
      .maybeSingle();

    if (error) {
      logger.error("Failed to mark alert as read:", error);
      return res.status(500).json({
        success: false,
        message: "Could not mark alert as read: " + error.message,
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Alert not found.",
      });
    }

    return res.json({
      success: true,
      message: "Alert marked as read",
      alert: data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/alerts/read-all - Mark all alerts for project as read
 */
router.patch("/alerts/read-all", requireApiKey, async (req, res, next) => {
  try {
    const project = req.project;

    const { data, error } = await supabase
      .from("alerts")
      .update({ is_read: true })
      .eq("project_id", project.id)
      .eq("is_read", false)
      .select();

    if (error) {
      logger.error("Failed to mark all alerts as read:", error);
      return res.status(500).json({
        success: false,
        message: "Could not mark all alerts as read: " + error.message,
      });
    }

    return res.json({
      success: true,
      message: "All alerts marked as read",
      count: data ? data.length : 0,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
