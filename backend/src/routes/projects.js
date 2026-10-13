const express = require("express");
const crypto = require("crypto");
const { body } = require("express-validator");
const { supabase } = require("../services/supabase");
const { requireUser } = require("../middleware/auth");
const { createProjectLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");
const { invalidateProjectKey } = require("../services/projectService");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * GET /api/test-db - Preserved for health & setup verification
 */
router.get("/test-db", async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("projects").select("id").limit(1);
    if (error) {
      return res.status(500).json({
        success: false,
        message: "Database connection failed: " + error.message,
      });
    }
    return res.json({
      success: true,
      message: "SiteWatch is connected to Supabase",
      data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects - List only the signed-in user's projects
 */
router.get("/projects", requireUser, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("id, name, website_url, api_key, created_at")
      .eq("owner_id", req.authUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Fetch projects error:", error);
      return res.status(500).json({
        success: false,
        message: "Could not load your projects.",
      });
    }

    return res.json({
      success: true,
      projects: data || [],
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects - Create a project owned by the signed-in user
 */
router.post(
  "/projects",
  createProjectLimiter,
  requireUser,
  validate([
    body("name")
      .trim()
      .notEmpty()
      .withMessage("Project name is required.")
      .isLength({ max: 100 })
      .withMessage("Project name must be 100 characters or fewer."),

    body("website_url")
      .optional({ checkFalsy: true })
      .isURL({ require_protocol: true })
      .withMessage("Enter a valid website URL including https://")
      .isLength({ max: 2048 })
      .withMessage("Website URL is too long."),
  ]),
  async (req, res, next) => {
    try {
      const name = req.body.name.trim();
      const website_url = req.body.website_url ? req.body.website_url.trim() : null;
      const api_key = `sw_${crypto.randomUUID()}`;

      const { data, error } = await supabase
        .from("projects")
        .insert([
          {
            name,
            website_url,
            api_key,
            owner_id: req.authUser.id,
          },
        ])
        .select("id, name, website_url, api_key, created_at")
        .single();

      if (error) {
        logger.error("Create project error:", error);
        return res.status(500).json({
          success: false,
          message: "Could not create your project: " + error.message,
        });
      }

      // Invalidate origins cache so new project can report errors immediately
      invalidateProjectKey(api_key);

      return res.status(201).json({
        success: true,
        message: "Project created successfully.",
        project: data,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
