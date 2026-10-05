import { useState } from "react";

function App() {
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [project, setProject] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const createProject = async (event) => {
    event.preventDefault();

    setMessage("");
    setProject(null);
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5000/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          website_url: websiteUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not create project");
      }

      setProject(data.project);
      setMessage("Project created successfully!");

      setName("");
      setWebsiteUrl("");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5f7fa",
        padding: "40px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <h1 className="text-4xl font-bold text-blue-600">
  SiteWatch
</h1>

        <p
          style={{
            color: "#555",
            marginBottom: "30px",
          }}
        >
          Website functionality and error monitoring
        </p>

        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "30px",
            borderRadius: "12px",
            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.08)",
          }}
        >
          <h2>Create a Project</h2>

          <form onSubmit={createProject}>
            <div style={{ marginBottom: "20px" }}>
              <label
                htmlFor="name"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                }}
              >
                Project Name
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="My Website"
                required
                style={{
                  width: "100%",
                  padding: "12px",
                  boxSizing: "border-box",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  fontSize: "16px",
                }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label
                htmlFor="websiteUrl"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "bold",
                }}
              >
                Website URL
              </label>

              <input
                id="websiteUrl"
                type="url"
                value={websiteUrl}
                onChange={(event) => setWebsiteUrl(event.target.value)}
                placeholder="https://example.com"
                style={{
                  width: "100%",
                  padding: "12px",
                  boxSizing: "border-box",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  fontSize: "16px",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: "#111827",
                color: "#ffffff",
                border: "none",
                padding: "12px 20px",
                borderRadius: "6px",
                fontSize: "16px",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Creating..." : "Create Project"}
            </button>
          </form>

          {message && (
            <p
              style={{
                marginTop: "20px",
                fontWeight: "bold",
              }}
            >
              {message}
            </p>
          )}
        </div>

        {project && (
          <div
            style={{
              marginTop: "30px",
              backgroundColor: "#ffffff",
              padding: "30px",
              borderRadius: "12px",
              boxShadow: "0 2px 10px rgba(0, 0, 0, 0.08)",
            }}
          >
            <h2>Project Created</h2>

            <p>
              <strong>Name:</strong> {project.name}
            </p>

            <p>
              <strong>Website:</strong> {project.website_url}
            </p>

            <p>
              <strong>Project ID:</strong> {project.id}
            </p>

            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                backgroundColor: "#fff7ed",
                border: "1px solid #fed7aa",
                borderRadius: "6px",
              }}
            >
              <strong>API Key</strong>

              <p
                style={{
                  wordBreak: "break-all",
                  fontFamily: "monospace",
                }}
              >
                {project.api_key}
              </p>

              <small>
                Keep this key private. We will use it later when configuring
                the SiteWatch monitoring SDK.
              </small>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;