
import { useEffect, useState } from "react";

function App() {
  const [errors, setErrors] = useState([]);

  const [analytics, setAnalytics] = useState({
    totalErrors: 0,
    javascriptErrors: 0,
    apiErrors: 0,
    promiseErrors: 0,
  });

  const [trend, setTrend] = useState({});
  const [commonErrors, setCommonErrors] = useState([]);
  const [topPages, setTopPages] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [message, setMessage] = useState("");
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);

  // SiteWatch API key
  const apiKey = "sw_3fe83516-e68b-43c8-b1c4-e050280e79ff";

  const loadErrors = async () => {
    try {
      setLoading(true);
      setMessage("");

      const headers = {
        "x-sitewatch-key": apiKey,
      };

      // Load recent errors
      const errorsResponse = await fetch(
        "http://localhost:5000/api/errors",
        {
          headers,
        }
      );

      const errorsData = await errorsResponse.json();

      if (!errorsResponse.ok) {
        throw new Error(
          errorsData.message || "Could not load errors"
        );
      }

      setErrors(errorsData.errors || []);

      // Load analytics
      const analyticsResponse = await fetch(
        `http://localhost:5000/api/analytics?range=${range}`,
        {
          headers,
        }
      );

      const analyticsData = await analyticsResponse.json();

      if (!analyticsResponse.ok) {
        throw new Error(
          analyticsData.message || "Could not load analytics"
        );
      }

      setAnalytics(
        analyticsData.analytics || {
          totalErrors: 0,
          javascriptErrors: 0,
          apiErrors: 0,
          promiseErrors: 0,
        }
      );

      // Load trend
      const trendResponse = await fetch(
        `http://localhost:5000/api/analytics/trend?range=${range}`,
        {
          headers,
        }
      );

      const trendData = await trendResponse.json();

      if (!trendResponse.ok) {
        throw new Error(
          trendData.message || "Could not load trend data"
        );
      }

      setTrend(trendData.trend || {});

      // Load most common errors
const commonResponse = await fetch(
  `http://localhost:5000/api/analytics/common?range=${range}`,
  {
    headers,
  }
);

const commonData = await commonResponse.json();

if (!commonResponse.ok) {
  throw new Error(
    commonData.message || "Could not load common errors"
  );
}

console.log("Common errors:", commonData.commonErrors);
setCommonErrors(commonData.commonErrors || []);

  // Load top failing pages
const pagesResponse = await fetch(
  `http://localhost:5000/api/analytics/pages?range=${range}`,
  {
    headers,
  }
);

const pagesData = await pagesResponse.json();

if (!pagesResponse.ok) {
  throw new Error(
    pagesData.message || "Could not load top failing pages"
  );
}

setTopPages(pagesData.topPages || []);

// Load alerts
const alertsResponse = await fetch(
  "http://localhost:5000/api/alerts",
  {
    headers,
  }
);

const alertsData = await alertsResponse.json();

if (!alertsResponse.ok) {
  throw new Error(
    alertsData.message || "Could not load alerts"
  );
}

setAlerts(alertsData.alerts || []);

    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadErrors();
  }, [range]);

  

  const getTypeStyle = (type) => {
    if (type === "javascript") {
      return {
        backgroundColor: "#fee2e2",
        color: "#b91c1c",
      };
    }

    if (type === "api") {
      return {
        backgroundColor: "#fef3c7",
        color: "#92400e",
      };
    }

    if (type === "unhandled_promise") {
      return {
        backgroundColor: "#ede9fe",
        color: "#6d28d9",
      };
    }

    return {
      backgroundColor: "#e5e7eb",
      color: "#374151",
    };
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Header */}
      <header
        style={{
          backgroundColor: "#111827",
          color: "#ffffff",
          padding: "20px 30px",
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "28px",
              }}
            >
              SiteWatch
            </h1>

            <p
              style={{
                margin: "5px 0 0",
                color: "#9ca3af",
              }}
            >
              Website functionality and error monitoring
            </p>
          </div>

          <button
            onClick={loadErrors}
            style={{
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              padding: "10px 18px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Refresh
          </button>
        </div>
      </header>

      {/* Main */}
      <main
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "35px 20px",
        }}
      >
        {/* Error message */}
        {message && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              color: "#b91c1c",
              padding: "15px",
              borderRadius: "8px",
              marginBottom: "25px",
              fontWeight: "bold",
            }}
          >
            {message}
          </div>
        )}

        {/* Statistics */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
            marginBottom: "35px",
          }}
        >
          {/* Total */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "25px",
              borderRadius: "12px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#6b7280",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              TOTAL ERRORS
            </p>

            <h2
              style={{
                margin: "10px 0 0",
                fontSize: "40px",
              }}
            >
              {analytics.totalErrors}
            </h2>
          </div>

          {/* JavaScript */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "25px",
              borderRadius: "12px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#6b7280",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              JAVASCRIPT ERRORS
            </p>

            <h2
              style={{
                margin: "10px 0 0",
                fontSize: "40px",
                color: "#dc2626",
              }}
            >
              {analytics.javascriptErrors}
            </h2>
          </div>

          {/* API */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "25px",
              borderRadius: "12px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#6b7280",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              API ERRORS
            </p>

            <h2
              style={{
                margin: "10px 0 0",
                fontSize: "40px",
                color: "#d97706",
              }}
            >
              {analytics.apiErrors}
            </h2>
          </div>

          {/* Promise */}
          <div
            style={{
              backgroundColor: "#ffffff",
              padding: "25px",
              borderRadius: "12px",
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#6b7280",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              PROMISE ERRORS
            </p>

            <h2
              style={{
                margin: "10px 0 0",
                fontSize: "40px",
                color: "#7c3aed",
              }}
            >
              {analytics.promiseErrors}
            </h2>
          </div>
        </div>

        

{/* Error Trend */}
<section
  style={{
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    padding: "25px",
    marginBottom: "25px",
  }}
>
  {/* Trend Header */}
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "15px",
      flexWrap: "wrap",
    }}
  >
    <div>
      <h2
        style={{
          margin: 0,
          fontSize: "22px",
        }}
      >
        Error Trend
      </h2>

      <p
        style={{
          margin: "6px 0 0",
          color: "#6b7280",
        }}
      >
        Errors recorded during the selected period
      </p>
    </div>

    {/* Time Range Selector */}
    <select
      value={range}
      onChange={(e) => setRange(e.target.value)}
      style={{
        padding: "10px 14px",
        borderRadius: "8px",
        border: "1px solid #d1d5db",
        backgroundColor: "#ffffff",
        fontSize: "14px",
        fontWeight: "bold",
        cursor: "pointer",
      }}
    >
      <option value="24h">Last 24 Hours</option>
      <option value="7d">Last 7 Days</option>
      <option value="30d">Last 30 Days</option>
    </select>
  </div>

  {/* Trend Chart */}
  {/* Trend Chart */}
{Object.keys(trend).length === 0 ? (
  <p
    style={{
      color: "#6b7280",
      marginTop: "30px",
    }}
  >
    No trend data available for this period.
  </p>
) : (
  <div
    style={{
      display: "flex",
      alignItems: "flex-end",
      gap: "20px",
      minHeight: "280px",
      padding: "30px 10px 10px",
      marginTop: "20px",
      borderBottom: "1px solid #e5e7eb",
      overflowX: "auto",
    }}
  >
    {Object.entries(trend).map(([date, data]) => {
      const maxErrors = Math.max(
        ...Object.values(trend).map((item) => item.total),
        1
      );

      const chartHeight = 200;

      const javascriptHeight =
        (data.javascript / maxErrors) * chartHeight;

      const apiHeight =
        (data.api / maxErrors) * chartHeight;

      const promiseHeight =
        (data.unhandled_promise / maxErrors) * chartHeight;

      return (
        <div
          key={date}
          style={{
            flex: "1 0 80px",
            minWidth: "80px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          {/* Total number */}
          <strong
            style={{
              fontSize: "14px",
              marginBottom: "8px",
            }}
          >
            {data.total}
          </strong>

          {/* Stacked Bar */}
          <div
            style={{
              width: "45px",
              height: "200px",
              display: "flex",
              flexDirection: "column-reverse",
              justifyContent: "flex-start",
              borderRadius: "6px 6px 0 0",
              overflow: "hidden",
            }}
            title={`Total errors: ${data.total}`}
          >
            {/* JavaScript */}
            {data.javascript > 0 && (
              <div
                style={{
                  width: "100%",
                  height: `${javascriptHeight}px`,
                  backgroundColor: "#dc2626",
                  transition: "height 0.3s ease",
                }}
                title={`JavaScript: ${data.javascript}`}
              />
            )}

            {/* API */}
            {data.api > 0 && (
              <div
                style={{
                  width: "100%",
                  height: `${apiHeight}px`,
                  backgroundColor: "#f97316",
                  transition: "height 0.3s ease",
                }}
                title={`API: ${data.api}`}
              />
            )}

            {/* Promise */}
            {data.unhandled_promise > 0 && (
              <div
                style={{
                  width: "100%",
                  height: `${promiseHeight}px`,
                  backgroundColor: "#7c3aed",
                  transition: "height 0.3s ease",
                }}
                title={`Promise: ${data.unhandled_promise}`}
              />
            )}
          </div>

          {/* Date */}
          <span
            style={{
              fontSize: "12px",
              color: "#6b7280",
              textAlign: "center",
              marginTop: "8px",
            }}
          >
            {date}
          </span>
        </div>
      );
    })}
  </div>
)}

{/* Chart Legend */}
{Object.keys(trend).length > 0 && (
  <div
    style={{
      display: "flex",
      gap: "20px",
      marginTop: "20px",
      flexWrap: "wrap",
      fontSize: "13px",
      color: "#6b7280",
    }}
  >
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      <span
        style={{
          width: "12px",
          height: "12px",
          backgroundColor: "#dc2626",
          borderRadius: "3px",
        }}
      />
      JavaScript
    </span>

    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      <span
        style={{
          width: "12px",
          height: "12px",
          backgroundColor: "#f97316",
          borderRadius: "3px",
        }}
      />
      API
    </span>

    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      <span
        style={{
          width: "12px",
          height: "12px",
          backgroundColor: "#7c3aed",
          borderRadius: "3px",
        }}
      />
      Promise
    </span>
  </div>
)}
  {/* Trend Summary */}
  {Object.keys(trend).length > 0 && (
    <div
      style={{
        display: "flex",
        gap: "20px",
        marginTop: "20px",
        flexWrap: "wrap",
        fontSize: "13px",
        color: "#6b7280",
      }}
    >
      <span>
        <strong>Total:</strong>{" "}
        {Object.values(trend).reduce(
          (sum, item) => sum + item.total,
          0
        )}
      </span>

      <span>
        <strong>JavaScript:</strong>{" "}
        {Object.values(trend).reduce(
          (sum, item) => sum + item.javascript,
          0
        )}
      </span>

      <span>
        <strong>API:</strong>{" "}
        {Object.values(trend).reduce(
          (sum, item) => sum + item.api,
          0
        )}
      </span>

      <span>
        <strong>Promise:</strong>{" "}
        {Object.values(trend).reduce(
          (sum, item) => sum + item.unhandled_promise,
          0
        )}
      </span>
    </div>
  )}
</section>

{/* Alerts */}
<section
  style={{
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    padding: "25px",
    marginBottom: "25px",
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "15px",
      marginBottom: "20px",
    }}
  >
    <div>
      <h2
        style={{
          margin: 0,
          fontSize: "22px",
        }}
      >
        Alerts 🔔
      </h2>

      <p
        style={{
          margin: "6px 0 0",
          color: "#6b7280",
        }}
      >
        Recent alerts generated by SiteWatch
      </p>
    </div>

    <span
      style={{
        backgroundColor: "#fee2e2",
        color: "#b91c1c",
        padding: "6px 12px",
        borderRadius: "20px",
        fontSize: "13px",
        fontWeight: "bold",
      }}
    >
      {alerts.filter((alert) => !alert.is_read).length} unread
    </span>
  </div>

  {alerts.length === 0 ? (
    <p
      style={{
        color: "#6b7280",
      }}
    >
      No alerts yet.
    </p>
  ) : (
    <div>
      {alerts.map((alert, index) => (
        <div
          key={alert.id}
          style={{
            padding: "16px 0",
            borderBottom:
              index === alerts.length - 1
                ? "none"
                : "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "20px",
            }}
          >
            <div>
              <strong
                style={{
                  color: alert.is_read
                    ? "#374151"
                    : "#111827",
                }}
              >
                {alert.message}
              </strong>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#6b7280",
                  fontSize: "13px",
                }}
              >
                {alert.page || "Unknown page"}
              </p>
            </div>

            {!alert.is_read && (
              <span
                style={{
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  padding: "5px 9px",
                  borderRadius: "15px",
                  fontSize: "11px",
                  fontWeight: "bold",
                  whiteSpace: "nowrap",
                }}
              >
                NEW
              </span>
            )}
          </div>

          <p
            style={{
              margin: "8px 0 0",
              color: "#9ca3af",
              fontSize: "12px",
            }}
          >
            {new Date(alert.created_at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  )}
</section>

{/* Top Failing Pages */}
<section
  style={{
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    padding: "25px",
    marginBottom: "25px",
  }}
>
  <h2
    style={{
      margin: 0,
      fontSize: "22px",
    }}
  >
    Top Failing Pages
  </h2>

  <p
    style={{
      margin: "6px 0 25px",
      color: "#6b7280",
    }}
  >
    Pages reporting the most errors during the selected period
  </p>

  {topPages.length === 0 ? (
    <p
      style={{
        color: "#6b7280",
      }}
    >
      No page data available for this period.
    </p>
  ) : (
    <div>
      {topPages.map((page, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "15px 0",
            borderBottom:
              index === topPages.length - 1
                ? "none"
                : "1px solid #e5e7eb",
            gap: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "15px",
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                flexShrink: 0,
              }}
            >
              {index + 1}
            </div>

            <span
              style={{
                fontSize: "14px",
                color: "#374151",
                wordBreak: "break-all",
              }}
            >
              {page.page}
            </span>
          </div>

          <span
            style={{
              backgroundColor: "#fee2e2",
              color: "#b91c1c",
              padding: "6px 12px",
              borderRadius: "20px",
              fontSize: "13px",
              fontWeight: "bold",
              whiteSpace: "nowrap",
            }}
          >
            {page.count}{" "}
            {page.count === 1 ? "error" : "errors"}
          </span>
        </div>
      ))}
    </div>
  )}
</section>

{/* Most Common Errors */}
<section
  style={{
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    padding: "25px",
    marginBottom: "25px",
  }}
>
  <h2
    style={{
      margin: 0,
      fontSize: "22px",
    }}
  >
    Most Common Errors
  </h2>

  <p
    style={{
      margin: "6px 0 25px",
      color: "#6b7280",
    }}
  >
    The most frequently reported errors during the selected period
  </p>

  {commonErrors.length === 0 ? (
  <p
    style={{
      color: "#6b7280",
    }}
  >
    No common errors available for this period.
  </p>
) : (
  <div>
    {commonErrors.map((error, index) => (
      <div
        key={index}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "15px 0",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        <div>
          <strong>
            {index + 1}. {error.message}
          </strong>
        </div>

        <span
          style={{
            backgroundColor: "#f3f4f6",
            padding: "6px 12px",
            borderRadius: "20px",
            fontWeight: "bold",
          }}
        >
          {error.count}
        </span>
      </div>
    ))}
  </div>
)}


</section>

        {/* Recent Errors */}
        {/* Error Type Breakdown */}
<section
  style={{
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    padding: "25px",
    marginBottom: "25px",
  }}
>
  <h2
    style={{
      margin: 0,
      fontSize: "22px",
    }}
  >
    Error Type Breakdown
  </h2>

  <p
    style={{
      margin: "6px 0 25px",
      color: "#6b7280",
    }}
  >
    Percentage of errors by type during the selected period
  </p>

  {analytics.totalErrors === 0 ? (
    <p
      style={{
        color: "#6b7280",
      }}
    >
      No error data available for this period.
    </p>
  ) : (
    <div>
      {/* JavaScript */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "7px",
            fontSize: "14px",
          }}
        >
          <strong>JavaScript</strong>

          <span>
            {Math.round(
              (analytics.javascriptErrors /
                analytics.totalErrors) *
                100
            )}
            %
          </span>
        </div>

        <div
          style={{
            width: "100%",
            height: "12px",
            backgroundColor: "#fee2e2",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${
                (analytics.javascriptErrors /
                  analytics.totalErrors) *
                100
              }%`,
              height: "100%",
              backgroundColor: "#dc2626",
              borderRadius: "10px",
            }}
          />
        </div>
      </div>

      {/* API */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "7px",
            fontSize: "14px",
          }}
        >
          <strong>API</strong>

          <span>
            {Math.round(
              (analytics.apiErrors /
                analytics.totalErrors) *
                100
            )}
            %
          </span>
        </div>

        <div
          style={{
            width: "100%",
            height: "12px",
            backgroundColor: "#ffedd5",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${
                (analytics.apiErrors /
                  analytics.totalErrors) *
                100
              }%`,
              height: "100%",
              backgroundColor: "#f97316",
              borderRadius: "10px",
            }}
          />
        </div>
      </div>

      {/* Promise */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "7px",
            fontSize: "14px",
          }}
        >
          <strong>Unhandled Promise</strong>

          <span>
            {Math.round(
              (analytics.promiseErrors /
                analytics.totalErrors) *
                100
            )}
            %
          </span>
        </div>

        <div
          style={{
            width: "100%",
            height: "12px",
            backgroundColor: "#ede9fe",
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${
                (analytics.promiseErrors /
                  analytics.totalErrors) *
                100
              }%`,
              height: "100%",
              backgroundColor: "#7c3aed",
              borderRadius: "10px",
            }}
          />
        </div>
      </div>
    </div>
  )}
</section>
{/* Recent Errors */}
<section
  style={{
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    overflow: "hidden",
  }}
>
  <div
    style={{
      padding: "25px",
      borderBottom: "1px solid #e5e7eb",
    }}
  >
    <h2
      style={{
        margin: 0,
        fontSize: "22px",
      }}
    >
      Recent Errors
    </h2>

    <p
      style={{
        margin: "6px 0 0",
        color: "#6b7280",
      }}
    >
      Latest errors detected by SiteWatch
    </p>
  </div>

  {loading ? (
    <div style={{ padding: "30px" }}>
      Loading errors...
    </div>
  ) : errors.length === 0 ? (
    <div
      style={{
        padding: "40px",
        textAlign: "center",
        color: "#6b7280",
      }}
    >
      No errors recorded yet.
    </div>
  ) : (
    <div>
      {errors.map((error) => (
        <div
          key={error.id}
          style={{
            padding: "22px 25px",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "20px",
              marginBottom: "12px",
            }}
          >
            <div>
              <h3
                style={{
                  margin: "0 0 8px",
                  fontSize: "17px",
                }}
              >
                {error.message}
              </h3>

              <p
                style={{
                  margin: 0,
                  color: "#6b7280",
                  fontSize: "14px",
                }}
              >
                {error.page || "Unknown page"}
              </p>
            </div>

            <span
              style={{
                ...getTypeStyle(error.type),
                padding: "6px 10px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "bold",
                whiteSpace: "nowrap",
              }}
            >
              {error.type}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "10px",
              color: "#6b7280",
              fontSize: "13px",
            }}
          >
            <div>
              <strong>URL:</strong> {error.url || "N/A"}
            </div>

            <div>
              <strong>Time:</strong>{" "}
              {new Date(error.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</section>
      </main>
    </div>
  );
}

export default App;