import { useEffect, useState } from "react";

function App() {
  const [errors, setErrors] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // Use the same API key that successfully worked in PowerShell.
  const apiKey = "YOUR_NEW_API_KEY";

  const loadErrors = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await fetch("http://localhost:5000/api/errors", {
        headers: {
          "x-sitewatch-key": apiKey,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load errors");
      }

      setErrors(data.errors || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadErrors();
  }, []);

  const javascriptErrors = errors.filter(
    (error) => error.type === "javascript"
  ).length;

  const apiErrors = errors.filter(
    (error) => error.type === "api"
  ).length;

  const promiseErrors = errors.filter(
    (error) => error.type === "unhandled_promise"
  ).length;

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
              {errors.length}
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
              {javascriptErrors}
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
              {apiErrors}
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
              {promiseErrors}
            </h2>
          </div>
        </div>

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