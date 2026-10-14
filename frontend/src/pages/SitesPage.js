import { useState, useMemo } from "react";
import { Plus, Play, Copy, Check, CheckCircle2, X, AlertTriangle } from "lucide-react";
import AddWebsite from "../AddWebsite";

const API_BASE = (() => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  if (process.env.BACKEND_URL) return `${process.env.BACKEND_URL.replace(/\/$/, "")}/api`;
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return "/api";
  }
  return "http://localhost:5000/api";
})();

const TYPE_BADGES = {
  javascript: {
    label: "JavaScript",
    classes: "bg-[#fee2e2] text-[#991b1b] border border-red-200/60",
  },
  api: {
    label: "API",
    classes: "bg-[#ffedd5] text-[#9a3412] border border-orange-200/60",
  },
  unhandled_promise: {
    label: "Promise",
    classes: "bg-[#ede9fe] text-[#6d28d9] border border-purple-200/60",
  },
};

function formatRelativeTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";

  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} h ago`;
  return `${diffDay} d ago`;
}

export default function SitesPage({
  errors = [],
  projects: propProjects = [],
  activeProject,
  setActiveProject,
  onProjectCreated,
  onProjectDeleted,
  projectsLoading = false,
  projectsError = "",
  onRetryProjects,
  message = "",
  session,
  onNavigate,
}) {
  const projects = propProjects;
  const [showAddForm, setShowAddForm] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("");
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [removingSite, setRemovingSite] = useState(false);
  const [removeError, setRemoveError] = useState("");

  const current = useMemo(() => {
    return activeProject || null;
  }, [activeProject]);

  const domain = useMemo(() => {
    if (!current?.website_url) return current?.name || "example.com";
    try {
      return new URL(current.website_url).hostname || current.website_url;
    } catch {
      return current.website_url;
    }
  }, [current]);

  // Errors for this specific project
  // The API key request is already scoped to this project by the backend.
  const siteErrors = errors;

  const handleRemoveSite = async () => {
    if (!current || !onProjectDeleted) return;
    const confirmed = window.confirm(
      `Remove “${current.name || domain}”? This removes the site from your account and may also remove its monitoring data.`
    );
    if (!confirmed) return;

    setRemovingSite(true);
    setRemoveError("");
    try {
      await onProjectDeleted(current);
    } catch (error) {
      setRemoveError(error.message || "Could not remove this site.");
    } finally {
      setRemovingSite(false);
    }
  };

  if (!current) {
    return (
      <div className="px-6 py-8 lg:px-10 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Sites</h1>
          <p className="mt-1 text-sm text-gray-500">
            {projectsLoading ? "Loading your sites…" : "Register a site to start monitoring it."}
          </p>
        </div>
        {projectsError && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-semibold">We couldn’t load your sites.</p>
            <p className="mt-1">{projectsError}</p>
            <button onClick={onRetryProjects} className="mt-3 font-semibold underline">Try again</button>
          </div>
        )}
        {projectsLoading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Loading sites…</div>
        ) : !session ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <p className="text-sm text-gray-600">Sign in to register and manage monitoring sites.</p>
            <button onClick={() => onNavigate?.("login")} className="mt-4 rounded-xl bg-[#2d6a4f] px-4 py-2.5 text-sm font-semibold text-white">Sign in</button>
          </div>
        ) : projectsError ? null : showAddForm ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <button onClick={() => setShowAddForm(false)} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-900">
              <X className="h-4 w-4" /> Cancel
            </button>
            <AddWebsite
              onProjectCreated={(newProject) => {
                onProjectCreated?.(newProject);
                setActiveProject(newProject);
                setShowAddForm(false);
              }}
            />
          </div>
        ) : (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2d6a4f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#245740]"
          >
            <Plus className="w-4 h-4" /> Register a site
          </button>
        )}
      </div>
    );
  }

  // Check the project key and backend without adding a fake error to history.
  const handleTestConnection = async () => {
    if (!current?.api_key) return;
    setSendingTest(true);
    setConnectionStatus("");

    try {
      const res = await fetch(`${API_BASE}/errors?limit=1`, {
        headers: { "x-sitewatch-key": current.api_key },
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.message || "Could not connect to the SiteWatch API.");
      setConnectionStatus("Connection works. Add the monitoring code below and redeploy your site to start receiving its errors.");
    } catch (err) {
      setConnectionStatus(`Connection failed: ${err.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  const backendBase = (() => {
    if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL.replace(/\/api\/?$/, "");
    if (process.env.BACKEND_URL) return process.env.BACKEND_URL.replace(/\/$/, "");
    if (typeof window !== "undefined" && window.location.origin && window.location.hostname !== "localhost") {
      return window.location.origin;
    }
    return "http://localhost:5000";
  })();
  const sdkSnippet = `<script
  src="${backendBase}/sdk/sitewatch.js"
  data-site-key="${current.api_key || "sw_your_key_here"}">
</script>`;

  const copyText = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === "key") {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    }
  };

  return (
    <div className="px-6 py-8 lg:px-10 max-w-7xl">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-1">
            <span>Sites</span>
            <span>/</span>
            <span className="text-gray-900">{domain}</span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              {current.name || domain}
            </h1>
            <span className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-bold ${siteErrors.length > 0 ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
              {siteErrors.length > 0 ? "Errors detected" : "No recent errors"}
            </span>
          </div>
        </div>

        {/* Actions & Site switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {projects.length > 1 && (
            <select
              value={current.id || ""}
              onChange={(e) => {
                const found = projects.find((p) => p.id === e.target.value);
                if (found) setActiveProject(found);
              }}
              className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm outline-none"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.website_url}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? "Close" : "Add site"}
          </button>
          <button
            onClick={handleRemoveSite}
            disabled={removingSite}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-50 disabled:opacity-50"
          >
            {removingSite ? "Removing…" : "Remove site"}
          </button>
        </div>
      </div>

      {(projectsError || removeError || message) && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">{removeError ? "Could not remove this site." : projectsError ? "We couldn’t refresh your sites." : "Something needs attention."}</p>
          <p className="mt-1">{removeError || projectsError || message}</p>
          {projectsError && <button onClick={onRetryProjects} className="mt-3 font-semibold underline">Try again</button>}
        </div>
      )}

      {/* Add Website Form Drawer */}
      {showAddForm && (
        <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <AddWebsite
            onProjectCreated={(newProject) => {
              if (onProjectCreated) onProjectCreated(newProject);
              setActiveProject(newProject);
              setShowAddForm(false);
            }}
          />
        </div>
      )}

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
        SiteWatch is collecting reported errors for this site. Uptime and response-time monitoring are not available yet.
      </div>

      {/* Recent Errors Section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Recent errors
        </h2>

        {siteErrors.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <CheckCircle2 className="mx-auto w-10 h-10 text-green-500 mb-2" />
            <p className="font-semibold text-gray-800">No errors recorded yet</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              Your site hasn't reported any runtime crashes or failed API requests.
            </p>
            <button
              onClick={handleTestConnection}
              disabled={sendingTest}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-800 disabled:opacity-50"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              {sendingTest ? "Checking..." : "Test connection"}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {siteErrors.slice(0, 5).map((error) => {
              const typeMeta = TYPE_BADGES[error.type] || {
                label: error.type || "Error",
                classes: "bg-gray-100 text-gray-700",
              };

              return (
                <div key={error.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span
                      className={`inline-block rounded-md px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${typeMeta.classes}`}
                    >
                      {typeMeta.label}
                    </span>
                    <span className="font-semibold text-sm text-gray-900 truncate">
                      {error.message || "Error"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500 shrink-0">
                    <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                      {error.page || "/"}
                    </span>
                    <span>{formatRelativeTime(error.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SDK Setup & Verification Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              Connect your website
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Add the code below to your website once, then redeploy it. SiteWatch will collect new browser errors.
            </p>
          </div>

          <button
            onClick={handleTestConnection}
            disabled={sendingTest}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            <Play className="w-3 h-3 text-[#2d6a4f]" />
            {sendingTest ? "Checking..." : "Test connection"}
          </button>
        </div>

        {connectionStatus && (
          <p role="status" className={`mt-3 rounded-lg px-3 py-2 text-xs ${connectionStatus.startsWith("Connection works") ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
            {connectionStatus}
          </p>
        )}

        <div className="pt-4 space-y-4">
          {/* API Key */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Project API Key
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={current.api_key || "sw_..."}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 font-mono text-xs text-gray-800 outline-none"
              />
              <button
                onClick={() => copyText(current.api_key || "", "key")}
                className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* HTML Script Snippet */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                HTML Embed Snippet
              </label>
              <button
                onClick={() => copyText(sdkSnippet, "script")}
                className="text-xs font-medium text-[#2d6a4f] hover:underline inline-flex items-center gap-1"
              >
                {copiedScript ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedScript ? "Copied snippet!" : "Copy snippet"}
              </button>
            </div>
            <pre className="rounded-xl border border-gray-200 bg-gray-900 p-3.5 font-mono text-xs text-emerald-400 overflow-x-auto">
              {sdkSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
