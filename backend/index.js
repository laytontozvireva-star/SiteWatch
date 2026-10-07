const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const supabase = require("./supabaseClient");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SiteWatch API is running",
  });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("projects")
      .select("id")
      .limit(1);

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Database connection failed",
        error: error.message,
      });
    }

    res.json({
      success: true,
      message: "SiteWatch is connected to Supabase",
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

app.post("/api/projects", async (req, res) => {
  try {
    const { name, website_url } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Project name is required",
      });
    }

    const apiKey = `sw_${crypto.randomUUID()}`;

    const { data, error } = await supabase
      .from("projects")
      .insert([
        {
          name,
          website_url,
          api_key: apiKey,
        },
      ])
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Could not create project",
        error: error.message,
      });
    }

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      project: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

app.post("/api/errors", async (req, res) => {
  try {
    const apiKey = req.headers["x-sitewatch-key"];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "SiteWatch API key is required",
      });
    }

    const {
      type,
      message,
      url,
      page,
      stack,
      browser,
      user_agent,
    } = req.body;

    if (!type || !message) {
      return res.status(400).json({
        success: false,
        message: "Error type and message are required",
      });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("api_key", apiKey)
      .single();

    if (projectError || !project) {
      return res.status(401).json({
        success: false,
        message: "Invalid SiteWatch API key",
      });
    }

    const { data: savedError, error: saveError } = await supabase
      .from("errors")
      .insert([
        {
          project_id: project.id,
          type,
          message,
          url,
          page,
          stack,
          browser,
          user_agent,
        },
      ])
      .select()
      .single();

    if (saveError) {
      return res.status(500).json({
        success: false,
        message: "Could not save error",
        error: saveError.message,
      });
    }

    // Create an alert for the new error
const { error: alertError } = await supabase
  .from("alerts")
  .insert([
    {
      project_id: project.id,
      error_id: savedError.id,
      type: "error",
      message,
      page,
    },
  ]);

if (alertError) {
  console.error("Could not create alert:", alertError.message);
}

    res.status(201).json({
      success: true,
      message: "Error recorded successfully",
      error: savedError,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});


app.get("/api/analytics", async (req, res) => {
  try {
    const apiKey = req.headers["x-sitewatch-key"];
    const range = req.query.range || "30d";

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "SiteWatch API key is required",
      });
    }

    if (!["24h", "7d", "30d"].includes(range)) {
      return res.status(400).json({
        success: false,
        message: "Invalid range. Use 24h, 7d, or 30d",
      });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("api_key", apiKey)
      .single();

    if (projectError || !project) {
      return res.status(401).json({
        success: false,
        message: "Invalid SiteWatch API key",
      });
    }

    const now = new Date();
    const startDate = new Date(now);

    if (range === "24h") {
      startDate.setHours(startDate.getHours() - 24);
    }

    if (range === "7d") {
      startDate.setDate(startDate.getDate() - 7);
    }

    if (range === "30d") {
      startDate.setDate(startDate.getDate() - 30);
    }

    const { data: errors, error: errorsError } = await supabase
      .from("errors")
      .select("id, type, message, created_at")
      .eq("project_id", project.id)
      .gte("created_at", startDate.toISOString());

    if (errorsError) {
      return res.status(500).json({
        success: false,
        message: "Could not retrieve analytics data",
        error: errorsError.message,
      });
    }

    const totalErrors = errors.length;

    const javascriptErrors = errors.filter(
      (error) => error.type === "javascript"
    ).length;

    const apiErrors = errors.filter(
      (error) => error.type === "api"
    ).length;

    const promiseErrors = errors.filter(
      (error) => error.type === "unhandled_promise"
    ).length;

    res.status(200).json({
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
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});


app.get("/api/errors", async (req, res) => {
  try {
    const apiKey = req.headers["x-sitewatch-key"];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "SiteWatch API key is required",
      });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("api_key", apiKey)
      .single();

    if (projectError || !project) {
      return res.status(401).json({
        success: false,
        message: "Invalid SiteWatch API key",
      });
    }

    const { data, error } = await supabase
      .from("errors")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Could not retrieve errors",
        error: error.message,
      });
    }

    res.status(200).json({
      success: true,
      errors: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});


app.get("/api/analytics/trend", async (req, res) => {
  try {
    const apiKey = req.headers["x-sitewatch-key"];
    const range = req.query.range || "30d";

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "SiteWatch API key is required",
      });
    }

    if (!["24h", "7d", "30d"].includes(range)) {
      return res.status(400).json({
        success: false,
        message: "Invalid range. Use 24h, 7d, or 30d",
      });
    }

    // Find the project using the API key
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("api_key", apiKey)
      .single();

    if (projectError || !project) {
      return res.status(401).json({
        success: false,
        message: "Invalid SiteWatch API key",
      });
    }

    // Calculate the starting date
    const now = new Date();
    const startDate = new Date(now);

    if (range === "24h") {
      startDate.setHours(startDate.getHours() - 24);
    }

    if (range === "7d") {
      startDate.setDate(startDate.getDate() - 7);
    }

    if (range === "30d") {
      startDate.setDate(startDate.getDate() - 30);
    }

    // Get errors within the selected range
    const { data, error } = await supabase
      .from("errors")
      .select("type, created_at")
      .eq("project_id", project.id)
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true });

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Could not retrieve trend data",
        error: error.message,
      });
    }

    const trend = {};

    data.forEach((error) => {
      const date = new Date(error.created_at)
        .toISOString()
        .split("T")[0];

      if (!trend[date]) {
        trend[date] = {
          total: 0,
          javascript: 0,
          api: 0,
          unhandled_promise: 0,
        };
      }

      trend[date].total += 1;

      if (error.type === "javascript") {
        trend[date].javascript += 1;
      }

      if (error.type === "api") {
        trend[date].api += 1;
      }

      if (error.type === "unhandled_promise") {
        trend[date].unhandled_promise += 1;
      }
    });

    res.status(200).json({
      success: true,
      range,
      trend,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});


// Get most common errors
app.get("/api/analytics/common", async (req, res) => {
  try {
    const apiKey = req.headers["x-sitewatch-key"];

    if (!apiKey) {
      return res.status(401).json({
        message: "API key is required",
      });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("api_key", apiKey)
      .single();

    if (projectError || !project) {
      return res.status(401).json({
        message: "Invalid API key",
      });
    }

    const range = req.query.range || "30d";

    let startDate = new Date();

    if (range === "24h") {
      startDate.setHours(startDate.getHours() - 24);
    } else if (range === "7d") {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setDate(startDate.getDate() - 30);
    }

    const { data: errors, error: errorsError } = await supabase
      .from("errors")
      .select("message")
      .eq("project_id", project.id)
      .gte("created_at", startDate.toISOString());

    if (errorsError) {
      return res.status(500).json({
        message: errorsError.message,
      });
    }

    const counts = {};

    errors.forEach((error) => {
      const message = error.message || "Unknown error";

      if (!counts[message]) {
        counts[message] = 0;
      }

      counts[message]++;
    });

    const commonErrors = Object.entries(counts)
      .map(([message, count]) => ({
        message,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      commonErrors,
    });
  } catch (error) {
    console.error("Common errors error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// Get top failing pages
app.get("/api/analytics/pages", async (req, res) => {
  try {
    const apiKey = req.headers["x-sitewatch-key"];

    if (!apiKey) {
      return res.status(401).json({
        message: "API key is required",
      });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("api_key", apiKey)
      .single();

    if (projectError || !project) {
      return res.status(401).json({
        message: "Invalid API key",
      });
    }

    const range = req.query.range || "30d";

    let startDate = new Date();

    if (range === "24h") {
      startDate.setHours(startDate.getHours() - 24);
    } else if (range === "7d") {
      startDate.setDate(startDate.getDate() - 7);
    } else {
      startDate.setDate(startDate.getDate() - 30);
    }

    const { data: errors, error: errorsError } = await supabase
      .from("errors")
      .select("page")
      .eq("project_id", project.id)
      .gte("created_at", startDate.toISOString());

    if (errorsError) {
      return res.status(500).json({
        message: errorsError.message,
      });
    }

    const counts = {};

    errors.forEach((error) => {
      const page = error.page || "Unknown page";

      if (!counts[page]) {
        counts[page] = 0;
      }

      counts[page]++;
    });

    const topPages = Object.entries(counts)
      .map(([page, count]) => ({
        page,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      topPages,
    });
  } catch (error) {
    console.error("Top pages error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});


// Get alerts
app.get("/api/alerts", async (req, res) => {
  try {
    const apiKey = req.headers["x-sitewatch-key"];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "SiteWatch API key is required",
      });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("api_key", apiKey)
      .single();

    if (projectError || !project) {
      return res.status(401).json({
        success: false,
        message: "Invalid SiteWatch API key",
      });
    }

    const { data: alerts, error: alertsError } = await supabase
      .from("alerts")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (alertsError) {
      return res.status(500).json({
        success: false,
        message: "Could not load alerts",
        error: alertsError.message,
      });
    }

    res.json({
      success: true,
      alerts: alerts || [],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});


// Mark an alert as read
app.patch("/api/alerts/:id/read", async (req, res) => {
  try {
    const apiKey = req.headers["x-sitewatch-key"];

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: "SiteWatch API key is required",
      });
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id")
      .eq("api_key", apiKey)
      .single();

    if (projectError || !project) {
      return res.status(401).json({
        success: false,
        message: "Invalid SiteWatch API key",
      });
    }

    const { data: alert, error: alertError } = await supabase
      .from("alerts")
      .update({
        is_read: true,
      })
      .eq("id", req.params.id)
      .eq("project_id", project.id)
      .select()
      .single();

    if (alertError) {
      return res.status(500).json({
        success: false,
        message: "Could not mark alert as read",
        error: alertError.message,
      });
    }

    res.json({
      success: true,
      message: "Alert marked as read",
      alert,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});


app.listen(PORT, () => {
  console.log(`SiteWatch API running on http://localhost:${PORT}`);
});