import { useState, useMemo } from "react";
import {
  Search,
  X,
  Copy,
  Check,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Code2,
  CheckCircle2,
  Download,
} from "lucide-react";

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

function formatFullTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
}

function getHostname(url) {
  if (!url) return "—";
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "file:") {
      return "Local / SDK";
    }
    if (parsed.hostname) {
      return parsed.hostname;
    }
  } catch {
    try {
      const parsed = new URL("http://" + url);
      if (parsed.hostname) return parsed.hostname;
    } catch {
      // ignore
    }
  }
  if (url.includes(":") || url.includes("/") || url.includes("\\")) {
    return "Local / SDK";
  }
  return url || "—";
}

export default function ErrorsPage({
  errors = [],
  filteredErrors = [],
  searchTerm,
  setSearchTerm,
  typeFilter,
  setTypeFilter,
  range,
  setRange,
  loading,
}) {
  const [siteFilter, setSiteFilter] = useState("all");
  const [selectedErrorId, setSelectedErrorId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [sortField, setSortField] = useState("created_at"); // "count", "created_at", "type"
  const [sortDirection, setSortDirection] = useState("desc");

  // Summary counts
  const summaryStats = useMemo(() => {
    const js = errors.filter((e) => e.type === "javascript").length;
    const api = errors.filter((e) => e.type === "api").length;
    const promise = errors.filter((e) => e.type === "unhandled_promise").length;
    return { total: errors.length, js, api, promise };
  }, [errors]);

  // Extract unique site domains for the filter
  const availableSites = useMemo(() => {
    const sites = new Set();
    errors.forEach((err) => {
      const host = getHostname(err.url);
      if (host && host !== "—") {
        sites.add(host);
      }
    });
    return Array.from(sites);
  }, [errors]);

  // Filter & sort
  const displayedErrors = useMemo(() => {
    let result = filteredErrors.filter((err) => {
      if (siteFilter === "all") return true;
      return getHostname(err.url) === siteFilter;
    });

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === "created_at") {
        aVal = new Date(a.created_at || 0).getTime();
        bVal = new Date(b.created_at || 0).getTime();
      } else if (sortField === "count") {
        aVal = Number(a.count) || 1;
        bVal = Number(b.count) || 1;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [filteredErrors, siteFilter, sortField, sortDirection]);

  // Active selected error
  const activeErrorId = selectedErrorId ?? displayedErrors[0]?.id;
  const selectedError =
    displayedErrors.find((e) => e.id === activeErrorId) || displayedErrors[0];

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleCopyStack = () => {
    if (!selectedError) return;
    const textToCopy =
      selectedError.stack ||
      `${selectedError.message || "Error"}\n  at ${selectedError.page || selectedError.url || "unknown"}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    if (displayedErrors.length === 0) return;
    const headers = ["Type", "Message", "Site", "Page", "Count", "Last Seen", "Stack"];
    const rows = displayedErrors.map((e) => [
      `"${e.type || ""}"`,
      `"${(e.message || "").replace(/"/g, '""')}"`,
      `"${getHostname(e.url)}"`,
      `"${e.page || ""}"`,
      e.count || 1,
      `"${e.created_at || ""}"`,
      `"${(e.stack || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sitewatch_errors_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasActiveFilters =
    Boolean(searchTerm) || typeFilter !== "all" || siteFilter !== "all";

  const resetFilters = () => {
    setSearchTerm("");
    setTypeFilter("all");
    setSiteFilter("all");
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600" />
    );
  };

  return (
    <div className="px-6 py-8 lg:px-10 max-w-7xl">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              Errors
            </h1>
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
              {displayedErrors.length} {displayedErrors.length === 1 ? "issue" : "issues"}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Real-time error monitoring, stack traces, and frequency analysis across all connected sites.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          {displayedErrors.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
              title="Export current view to CSV"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Metric summary pill bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Total Errors Logged</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{summaryStats.total}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">JavaScript</p>
            <span className="w-2 h-2 rounded-full bg-red-500" />
          </div>
          <p className="text-xl font-bold text-red-700 mt-1">{summaryStats.js}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">API Requests</p>
            <span className="w-2 h-2 rounded-full bg-orange-500" />
          </div>
          <p className="text-xl font-bold text-orange-700 mt-1">{summaryStats.api}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">Unhandled Promises</p>
            <span className="w-2 h-2 rounded-full bg-purple-500" />
          </div>
          <p className="text-xl font-bold text-purple-700 mt-1">{summaryStats.promise}</p>
        </div>
      </div>

      {/* Search and Filters row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center mb-6">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search messages, pages, or stack trace keywords..."
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-9 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              title="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Type dropdown */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm outline-none transition hover:border-gray-400 focus:border-blue-500"
          >
            <option value="all">All types</option>
            <option value="javascript">JavaScript</option>
            <option value="api">API</option>
            <option value="unhandled_promise">Promise</option>
          </select>

          {/* Site dropdown */}
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm outline-none transition hover:border-gray-400 focus:border-blue-500"
          >
            <option value="all">All sites</option>
            {availableSites.map((site) => (
              <option key={site} value={site}>
                {site}
              </option>
            ))}
          </select>

          {/* Range dropdown */}
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-medium text-gray-700 shadow-sm outline-none transition hover:border-gray-400 focus:border-blue-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>

          {/* Reset filter pill */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 rounded-xl bg-gray-100 px-3 py-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-200 hover:text-gray-900"
              title="Reset all filters"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mb-3" />
            <p className="text-sm font-medium text-gray-600">Loading error reports...</p>
          </div>
        ) : displayedErrors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-50 mb-3">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-base font-semibold text-gray-800">No matching errors</p>
            <p className="mt-1 text-sm text-gray-500 max-w-sm">
              {hasActiveFilters
                ? "No errors found matching your filter criteria. Try adjusting the search term or filters."
                : "Great news! No errors have been recorded for this period."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-gray-800"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/70 text-xs font-bold uppercase tracking-wider text-gray-500 select-none">
                    <th
                      onClick={() => handleSort("type")}
                      className="group cursor-pointer px-6 py-3.5 w-32 min-w-[130px] transition hover:text-gray-900"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>TYPE</span>
                        {renderSortIcon("type")}
                      </div>
                    </th>
                    <th className="px-6 py-3.5 min-w-[280px]">
                      <span>MESSAGE</span>
                    </th>
                    <th className="px-6 py-3.5 w-36 min-w-[130px]">
                      <span>SITE</span>
                    </th>
                    <th className="px-6 py-3.5 w-44 min-w-[140px]">
                      <span>PAGE</span>
                    </th>
                    <th
                      onClick={() => handleSort("count")}
                      className="group cursor-pointer px-4 py-3.5 w-24 min-w-[80px] text-center transition hover:text-gray-900"
                    >
                      <div className="flex items-center justify-center gap-1.5">
                        <span>COUNT</span>
                        {renderSortIcon("count")}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("created_at")}
                      className="group cursor-pointer px-6 py-3.5 w-32 min-w-[120px] transition hover:text-gray-900"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>LAST SEEN</span>
                        {renderSortIcon("created_at")}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {displayedErrors.map((error) => {
                    const typeMeta = TYPE_BADGES[error.type] || {
                      label: error.type || "Error",
                      classes: "bg-gray-100 text-gray-700 border border-gray-200",
                    };

                    const isSelected = error.id === activeErrorId;
                    const hostname = getHostname(error.url);

                    return (
                      <tr
                        key={error.id}
                        onClick={() => setSelectedErrorId(error.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-blue-50/60 font-medium"
                            : "hover:bg-gray-50/80"
                        }`}
                      >
                        {/* Type badge */}
                        <td className="px-6 py-4 whitespace-nowrap w-32 min-w-[130px]">
                          <span
                            className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${typeMeta.classes}`}
                          >
                            {typeMeta.label}
                          </span>
                        </td>

                        {/* Error Message */}
                        <td className="px-6 py-4 font-semibold text-gray-900 min-w-[280px]">
                          <span className="leading-snug break-words">
                            {error.message || "Unknown error"}
                          </span>
                        </td>

                        {/* Site Domain */}
                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap font-normal w-36 min-w-[130px]">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            {hostname}
                          </span>
                        </td>

                        {/* Page / Route */}
                        <td className="px-6 py-4 whitespace-nowrap font-normal w-44 min-w-[140px]">
                          <span
                            className="inline-block max-w-[160px] truncate rounded bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600 align-middle"
                            title={decodeURI(error.page || "")}
                          >
                            {(() => {
                              try {
                                const decoded = decodeURIComponent(error.page || "—");
                                if (decoded.includes("/")) {
                                  const parts = decoded.split("/").filter(Boolean);
                                  return "/" + (parts[parts.length - 1] || "");
                                }
                                return decoded;
                              } catch {
                                return error.page || "—";
                              }
                            })()}
                          </span>
                        </td>

                        {/* Count */}
                        <td className="px-4 py-4 whitespace-nowrap text-center w-24 min-w-[80px]">
                          <span className="inline-flex items-center justify-center min-w-[28px] rounded-md bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-900">
                            {error.count || 1}
                          </span>
                        </td>

                        {/* Last seen relative time */}
                        <td
                          className="px-6 py-4 text-gray-500 whitespace-nowrap font-normal text-xs w-32 min-w-[120px]"
                          title={formatFullTime(error.created_at)}
                        >
                          {formatRelativeTime(error.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Selected Row Stack Trace & Inspection Panel */}
            <div className="border-t border-gray-200 bg-gray-50/40 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-gray-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                    STACK TRACE (SELECTED ROW)
                  </h3>
                  {selectedError && (
                    <span className="text-xs text-gray-400">
                      • {getHostname(selectedError.url)}{selectedError.page ? ` (${selectedError.page})` : ""}
                    </span>
                  )}
                </div>

                {selectedError && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      Last logged: {formatFullTime(selectedError.created_at)}
                    </span>
                    <button
                      onClick={handleCopyStack}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
                      title="Copy stack trace to clipboard"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-green-600 font-semibold">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-500" />
                          <span>Copy Stack</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Stack trace display */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-inner">
                {selectedError?.stack ? (
                  <pre className="whitespace-pre-wrap break-words font-mono text-xs sm:text-sm leading-relaxed text-gray-800">
                    {selectedError.stack}
                  </pre>
                ) : (
                  <div className="font-mono text-xs sm:text-sm leading-relaxed text-gray-600">
                    {selectedError ? (
                      <div>
                        <p className="font-bold text-red-700">
                          {selectedError.message || "Error"}
                        </p>
                        <p className="text-gray-500 mt-1">
                          {"    at " + (selectedError.page || selectedError.url || "unknown")}
                        </p>
                        <p className="text-gray-400 mt-2 text-xs italic">
                          (No full stack trace was provided by the client agent for this entry)
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-400">Select an error row above to inspect its details.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
