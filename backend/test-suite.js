/**
 * SiteWatch Backend Verification & Stress Test Suite
 */
const http = require("http");
const app = require("./src/app");
const { supabase } = require("./src/services/supabase");

let server;
const PORT = 5055; // Use dedicated test port

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: PORT,
        ...options,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          let json = null;
          try {
            json = JSON.parse(body);
          } catch (e) {
            json = body;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        });
      }
    );

    req.on("error", reject);

    if (data) {
      req.write(typeof data === "string" ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log("=== SiteWatch Backend Test Suite ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // Start test server
  await new Promise((resolve) => {
    server = app.listen(PORT, "127.0.0.1", () => {
      console.log(`Test server running on port ${PORT}\n`);
      resolve();
    });
  });

  try {
    // Test 1: Health check endpoint
    console.log("[Test 1] Health check endpoint");
    const healthRes = await request({ path: "/health", method: "GET" });
    assert(healthRes.status === 200, `Health check returned status 200 (got ${healthRes.status})`);
    assert(healthRes.body.success === true, "Health body success is true");
    assert(healthRes.body.status === "healthy", "Health body status is healthy");
    assert(typeof healthRes.body.uptimeSeconds === "number", "Uptime is tracked");

    // Test 2: Root endpoint
    console.log("\n[Test 2] Root API status");
    const rootRes = await request({ path: "/", method: "GET" });
    assert(rootRes.status === 200, "Root returned status 200");
    assert(rootRes.body.success === true, "Root response success is true");

    // Test 3: SDK distribution endpoint
    console.log("\n[Test 3] SDK distribution (/sdk/sitewatch.js)");
    const sdkRes = await request({ path: "/sdk/sitewatch.js", method: "GET" });
    assert(sdkRes.status === 200, "SDK endpoint returned 200");
    assert(
      typeof sdkRes.body === "string" && sdkRes.body.includes("SiteWatch"),
      "SDK script content delivered correctly"
    );
    assert(
      sdkRes.headers["content-type"].includes("javascript"),
      "SDK content-type header is javascript"
    );

    // Test 4: 404 handler returns clean JSON
    console.log("\n[Test 4] 404 Handler");
    const notFoundRes = await request({ path: "/api/non-existent-route", method: "GET" });
    assert(notFoundRes.status === 404, "Unknown route returned 404");
    assert(notFoundRes.body.success === false, "404 response is structured JSON");

    // Test 5: Malformed JSON payload guard
    console.log("\n[Test 5] Malformed JSON payload");
    const malformedRes = await request(
      {
        path: "/api/errors",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      "{ this is not valid json }"
    );
    assert(malformedRes.status === 400, `Malformed JSON returns 400 (got ${malformedRes.status})`);
    assert(malformedRes.body.success === false, "Malformed JSON returns clean error JSON");

    // Test 6: Auth protection - Missing user token on /api/projects
    console.log("\n[Test 6] User Auth on /api/projects");
    const unauthProjectRes = await request({ path: "/api/projects", method: "GET" });
    assert(unauthProjectRes.status === 401, "Protected project endpoint rejected unauthenticated request");

    // Test 7: Auth protection - Missing API key on /api/errors
    console.log("\n[Test 7] API Key protection on /api/errors");
    const unauthErrorRes = await request(
      {
        path: "/api/errors",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { type: "javascript", message: "Test" }
    );
    assert(unauthErrorRes.status === 401, "Ingestion rejected request without API key");

    // Test 8: Invalid API key rejection
    console.log("\n[Test 8] Invalid API key rejection");
    const invalidKeyRes = await request(
      {
        path: "/api/errors",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-sitewatch-key": "sw_invalid_key_12345",
        },
      },
      { type: "javascript", message: "Test" }
    );
    assert(invalidKeyRes.status === 401, "Ingestion rejected request with invalid API key");

    // Test 9: Real API key lookup and error ingestion
    console.log("\n[Test 9] Valid API key lookup & Error Ingestion");
    // Fetch a real test project from database to test with
    const { data: testProjects } = await supabase.from("projects").select("id, api_key").limit(1);
    if (testProjects && testProjects.length > 0) {
      const validApiKey = testProjects[0].api_key;
      const validRes = await request(
        {
          path: "/api/errors",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-sitewatch-key": validApiKey,
          },
        },
        {
          type: "javascript",
          message: "Automated test error verification",
          url: "https://test.local",
          page: "/test-page",
          stack: "Error: Automated test\n    at runTests (test-suite.js:1:1)",
        }
      );
      assert(validRes.status === 201, `Valid error ingestion returned 201 (got ${validRes.status})`);
      assert(validRes.body.success === true, "Error response success is true");

      // Test 10: In-memory cache hit for API key (fast response)
      console.log("\n[Test 10] Cached API key lookup performance");
      const tStart = Date.now();
      const cachedRes = await request(
        {
          path: "/api/errors",
          method: "GET",
          headers: { "x-sitewatch-key": validApiKey },
        }
      );
      const durationMs = Date.now() - tStart;
      assert(cachedRes.status === 200, "Errors listing returned 200");
      assert(Array.isArray(cachedRes.body.errors), "Errors list is an array");
      console.log(`    Cached lookup + fetch latency: ${durationMs}ms`);

      // Test 11: Analytics endpoint bounded projection
      console.log("\n[Test 11] Analytics endpoint");
      const analyticsRes = await request(
        {
          path: "/api/analytics?range=30d",
          method: "GET",
          headers: { "x-sitewatch-key": validApiKey },
        }
      );
      assert(analyticsRes.status === 200, "Analytics returned 200");
      assert(
        typeof analyticsRes.body.analytics?.totalErrors === "number",
        "Analytics contains numeric totalErrors"
      );

      // Test 12: Analytics trend
      console.log("\n[Test 12] Trend endpoint");
      const trendRes = await request(
        {
          path: "/api/analytics/trend?range=30d",
          method: "GET",
          headers: { "x-sitewatch-key": validApiKey },
        }
      );
      assert(trendRes.status === 200, "Trend endpoint returned 200");
      assert(typeof trendRes.body.trend === "object", "Trend returns date dictionary");

      // Test 13: Alerts listing
      console.log("\n[Test 13] Alerts endpoint");
      const alertsRes = await request(
        {
          path: "/api/alerts",
          method: "GET",
          headers: { "x-sitewatch-key": validApiKey },
        }
      );
      assert(alertsRes.status === 200, "Alerts endpoint returned 200");
      assert(Array.isArray(alertsRes.body.alerts), "Alerts returns an array");
    } else {
      console.log("  (Skipping live project test - no projects in database)");
    }
  } catch (err) {
    console.error("Test execution encountered an error:", err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
  }

  console.log("\n=================================");
  console.log(`Results: ${passed} passed, ${failed} failed.`);
  console.log("=================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
