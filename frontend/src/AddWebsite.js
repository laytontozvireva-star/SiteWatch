import { useState } from "react";
import { Copy, Check, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "./supabaseClient";

const API_URL = (() => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL.replace(/\/api\/?$/, "");
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL.replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return "";
  }
  return "http://localhost:5000";
})();

export default function AddWebsite({ onProjectCreated }) {
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdProject, setCreatedProject] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setCreatedProject(null);
    setLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session?.access_token) {
        throw new Error("Please sign in before registering a website.");
      }

      const response = await fetch(`${API_URL}/api/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          website_url: websiteUrl.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            result.errors?.[0]?.msg ||
            "Could not register this website."
        );
      }

      setCreatedProject(result.project);
      setName("");
      setWebsiteUrl("");

      if (onProjectCreated) {
        onProjectCreated(result.project);
      }
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to SiteWatch. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  const copyKey = () => {
    if (!createdProject?.api_key) return;
    navigator.clipboard.writeText(createdProject.api_key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const copySnippet = () => {
    if (!createdProject?.api_key) return;
    const host = API_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:5000");
    const snippet = `<script\n  src="${host}/sdk/sitewatch.js"\n  data-site-key="${createdProject.api_key}">\n</script>`;
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Add a Website</h2>
        <p className="mt-1 text-sm text-gray-500">
          Register a website to generate its monitoring key and start tracking errors automatically.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="website-name"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-700"
          >
            Website / Project Name
          </label>
          <input
            id="website-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="My Web App"
            required
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20"
          />
        </div>

        <div>
          <label
            htmlFor="website-url"
            className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-700"
          >
            Website URL
          </label>
          <input
            id="website-url"
            type="url"
            value={websiteUrl}
            onChange={(event) => setWebsiteUrl(event.target.value)}
            placeholder="https://example.com"
            required
            className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none transition focus:border-[#2d6a4f] focus:ring-2 focus:ring-[#2d6a4f]/20"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-[#2d6a4f] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#245740] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Registering..." : "Register Website"}
        </button>
      </form>

      {createdProject && (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50/60 p-5">
          <div className="flex items-center gap-2 text-green-800 font-bold text-sm mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span>{createdProject.name} registered & activated!</span>
          </div>

          <p className="text-xs text-gray-600 mb-3">
            This project has been automatically selected as your active monitoring project.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Generated API Key
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdProject.api_key || ""}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-1.5 font-mono text-xs text-gray-800 outline-none"
                />
                <button
                  type="button"
                  onClick={copyKey}
                  className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey ? "Copied" : "Copy Key"}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700">
                  Ready-to-Paste HTML Snippet
                </label>
                <button
                  type="button"
                  onClick={copySnippet}
                  className="text-xs font-semibold text-[#2d6a4f] hover:underline inline-flex items-center gap-1"
                >
                  {copiedSnippet ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedSnippet ? "Copied snippet!" : "Copy Snippet"}
                </button>
              </div>
              <pre className="rounded-xl bg-gray-900 p-3 font-mono text-xs text-emerald-400 overflow-x-auto">
                {`<script\n  src="${API_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:5000")}/sdk/sitewatch.js"\n  data-site-key="${createdProject.api_key}">\n</script>`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
