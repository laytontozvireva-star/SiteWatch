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

app.listen(PORT, () => {
  console.log(`SiteWatch API running on http://localhost:${PORT}`);
});