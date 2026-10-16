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
  const [copiedInstall, setCopiedInstall] = useState(false);
  const [framework, setFramework] = useState("html");

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

  const getSnippet = () => {
    if (!createdProject?.api_key) return;
    const host = API_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:5000");
    if (framework === "npm") {
      return `import { initSiteWatch } from "@tozvi-labs/sitewatch";\n\ninitSiteWatch({\n  apiKey: "${createdProject.api_key}",\n  endpoint: "${host}/api/errors",\n});`;
    }
    if (framework === "next") {
      return `import Script from "next/script";\n\n<Script\n  src="${host}/sdk/sitewatch.js"\n  data-site-key="${createdProject.api_key}"\n  strategy="afterInteractive"\n/>`;
    }
    return `<script\n  src="${host}/sdk/sitewatch.js"\n  data-site-key="${createdProject.api_key}">\n</script>`;
  };

  const copyInstall = () => {
    navigator.clipboard.writeText("npm install @tozvi-labs/sitewatch");
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 2000);
  };

  const copySnippet = () => {
    const snippet = getSnippet();
    if (!snippet) return;
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Add a Website</h2>
        <p className="mt-1 text-sm text-gray-500">
          Add your website, then follow the short setup guide to start collecting its errors.
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
            <span>{createdProject.name} added and selected!</span>
          </div>

          <p className="text-xs text-gray-600 mb-3">
            Finish the setup below to connect your website to SiteWatch.
          </p>

          <div className="mt-5 rounded-xl border border-green-200 bg-white p-4">
            <h3 className="text-sm font-bold text-gray-900">Finish setup in 3 steps</h3>
            <ol className="mt-3 space-y-3 text-sm text-gray-700">
              <li><span className="mr-2 font-bold text-[#2d6a4f]">1.</span>Choose how your website is built.</li>
              <li>
                <span className="mr-2 font-bold text-[#2d6a4f]">2.</span>Copy the code and add it to your site:
                <select
                  aria-label="Website framework"
                  value={framework}
                  onChange={(event) => { setFramework(event.target.value); setCopiedSnippet(false); }}
                  className="ml-2 rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs"
                >
                  <option value="html">HTML</option>
                  <option value="react">React, Vite, or Create React App</option>
                  <option value="next">Next.js</option>
                  <option value="npm">npm package (React, Vite, or Next.js)</option>
                </select>
                <p className="ml-6 mt-1 text-xs text-gray-500">
                  {framework === "npm"
                    ? "Run the install command in your project, then initialize SiteWatch once in your app entry point (for example, src/main.jsx or app/layout.js)."
                    : framework === "next"
                    ? "In app/layout.js, import next/script and place the code inside the page body."
                    : framework === "react"
                      ? "In index.html (or public/index.html for Create React App), just before </body>."
                      : "In your main HTML file, just before </body>."}
                </p>
              </li>
              <li><span className="mr-2 font-bold text-[#2d6a4f]">3.</span>Deploy your website. New browser errors will then appear here.</li>
            </ol>

            {framework === "npm" && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-600">Install the package</p>
                <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-gray-900 px-3 py-2 font-mono text-xs text-emerald-400">
                  <code>npm install @tozvi-labs/sitewatch</code>
                  <button type="button" onClick={copyInstall} className="inline-flex shrink-0 items-center gap-1 text-xs font-sans font-semibold text-white hover:underline">
                    {copiedInstall ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copiedInstall ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-gray-600">Monitoring code</p>
              <button
                type="button"
                onClick={copySnippet}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2d6a4f] hover:underline"
              >
                {copiedSnippet ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copiedSnippet ? "Copied" : "Copy code"}
              </button>
            </div>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-gray-900 p-3 font-mono text-xs text-emerald-400">{getSnippet()}</pre>
            <p className="mt-2 text-xs text-gray-500">This setup is one-time per website. It only reports errors that happen after the code is installed.</p>

            <details className="mt-4 border-t border-gray-100 pt-3">
              <summary className="cursor-pointer text-xs font-semibold text-gray-600">Need the API key instead?</summary>
              <div className="mt-2 flex items-center gap-2">
                <input type="text" readOnly value={createdProject.api_key || ""} aria-label="Project API key" className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 font-mono text-xs text-gray-800 outline-none" />
                <button type="button" onClick={copyKey} className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                  {copiedKey ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedKey ? "Copied" : "Copy key"}
                </button>
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
