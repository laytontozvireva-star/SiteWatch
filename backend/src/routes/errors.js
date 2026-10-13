const express = require("express");
const { body, query } = require("express-validator");
const { supabase } = require("../services/supabase");
const { requireApiKey } = require("../middleware/auth");
const {
  errorIngestionLimiter,
  publicReportLimiter,
} = require("../middleware/rateLimiter");
const validate = require("../middleware/validate");
const { recordError } = require("../services/errorService");
const { getProjectByOrigin } = require("../services/projectService");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * POST /api/errors - Main error ingestion endpoint from SDK
 */
router.post(
  "/errors",
  errorIngestionLimiter,
  requireApiKey,
  validate([
    body("type")
      .notEmpty()
      .withMessage("Error type is required")
      .isString()
      .withMessage("Error type must be a string"),
    body("message")
      .notEmpty()
      .withMessage("Error message is required")
      .isString()
      .withMessage("Error message must be a string"),
    body("url").optional({ nullable: true }).isString(),
    body("page").optional({ nullable: true }).isString(),
    body("stack").optional({ nullable: true }).isString(),
  ]),
  async (req, res, next) => {
    try {
      const project = req.project;
      const clientIp = req.ip || req.socket.remoteAddress;
      const userAgent = req.get("user-agent");

      const savedError = await recordError({
        projectId: project.id,
        payload: req.body,
        ipAddress: clientIp,
        userAgent,
      });

      return res.status(201).json({
        success: true,
        message: "Error recorded successfully",
        error: savedError,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/errors - List errors with safety bounds and pagination
 */
router.get(
  "/errors",
  requireApiKey,
  validate([
    query("limit").optional().isInt({ min: 1, max: 500 }).toInt(),
    query("offset").optional().isInt({ min: 0 }).toInt(),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("type").optional().isString(),
  ]),
  async (req, res, next) => {
    try {
      const project = req.project;
      const limit = req.query.limit || 100; // Safe default prevents fetching 50,000 items into memory
      const offset = req.query.offset || (req.query.page ? (req.query.page - 1) * limit : 0);
      const typeFilter = req.query.type;

      let dbQuery = supabase
        .from("errors")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (typeFilter && typeFilter !== "all") {
        dbQuery = dbQuery.eq("type", typeFilter);
      }

      const { data, error } = await dbQuery;

      if (error) {
        logger.error("Failed to fetch errors from Supabase:", error);
        return res.status(500).json({
          success: false,
          message: "Could not retrieve errors: " + error.message,
        });
      }

      return res.status(200).json({
        success: true,
        errors: data || [],
        limit,
        offset,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/errors/:id - Get specific error details
 */
router.get("/errors/:id", requireApiKey, async (req, res, next) => {
  try {
    const project = req.project;
    const { id } = req.params;

    const { data, error } = await supabase
      .from("errors")
      .select("*")
      .eq("id", id)
      .eq("project_id", project.id)
      .maybeSingle();

    if (error) {
      logger.error("Failed to fetch error detail:", error);
      return res.status(500).json({
        success: false,
        message: "Could not retrieve error details: " + error.message,
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Error record not found.",
      });
    }

    return res.status(200).json({
      success: true,
      error: data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/public-errors - Ingest errors without API key based on registered website Origin
 */
router.post(
  "/public-errors",
  publicReportLimiter,
  async (req, res, next) => {
    try {
      const origin = req.get("origin");

      if (!origin) {
        return res.status(403).json({
          success: false,
          message: "Website origin is required",
        });
      }

      let requestOrigin;
      try {
        requestOrigin = new URL(origin).origin;
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid website origin",
        });
      }

      const project = await getProjectByOrigin(requestOrigin);

      if (!project) {
        return res.status(403).json({
          success: false,
          message: "This website is not registered",
        });
      }

      const { type, message, url, page, stack } = req.body;
      const allowedTypes = ["javascript", "api", "unhandled_promise"];

      if (
        !allowedTypes.includes(type) ||
        typeof message !== "string" ||
        !message.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid error report",
        });
      }

      const clientIp = req.ip || req.socket.remoteAddress;
      const userAgent = req.get("user-agent");

      await recordError({
        projectId: project.id,
        payload: { type, message, url, page, stack },
        ipAddress: clientIp,
        userAgent,
      });

      return res.status(201).json({
        success: true,
        message: "Error report received",
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
