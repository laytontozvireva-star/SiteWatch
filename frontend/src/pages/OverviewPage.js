import {
  RefreshCw,
  AlertTriangle,
  Activity,
  X,
} from "lucide-react";
function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
}

export default function OverviewPage({
  analytics,
  trend,
  commonErrors,
  alerts,
  errors,
  range,
  setRange,
  loading,
  refreshing,
  onRefresh,
  message,
  setMessage,
  unreadAlerts,
}) {
  const trendEntries = Object.entries(trend || {});
  const maxErrors = Math.max(
    1,
    ...trendEntries.map(([, data]) => Number(data.total) || 0)
  );

  const stats = [
    { label: "SITES MONITORED", value: errors.length > 0 ? new Set(errors.map(e => e.url).filter(Boolean)).size : 0, color: "text-gray-900" },
    { label: "SITES UP", value: "-", color: "text-green-600" },
    { label: "ERRORS (7D)", value: analytics.totalErrors, color: "text-gray-900" },
    { label: "OPEN ALERTS", value: unreadAlerts, color: "text-orange-600" },
  ];

  // Derive recent incidents from alerts
  const recentIncidents = alerts
    .filter((a) => !a.is_read)
    .slice(0, 3);

  return (
    <div className="px-6 py-8 lg:px-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Overview</h1>

        <div className="flex items-center gap-3">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          <button
            onClick={() => onRefresh(false)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-900 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error banner */}
      {message && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-900 p-4 text-white">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Something needs attention</p>
            <p className="mt-1 text-sm text-red-100">{message}</p>
          </div>
          <button onClick={() => setMessage("")} className="text-red-200 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <p className="text-xs font-bold tracking-wider text-gray-500 uppercase">
              {stat.label}
            </p>
            <p className={`mt-2 text-3xl font-bold ${stat.color}`}>
              {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Sites + Trend */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sites list */}
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Sites</h3>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading...
              </div>
            ) : errors.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No site data available yet.</p>
            ) : (
              <div className="space-y-3">
                {/* Derive unique sites from errors */}
                {[...new Set(errors.map((e) => e.url).filter(Boolean))]
                  .slice(0, 5)
                  .map((site) => {
                    const siteErrors = errors.filter((e) => e.url === site);
                    return (
                      <div
                        key={site}
                        className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                          <span className="text-sm font-medium text-gray-500">Up</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {(() => {
                              try { return new URL(site).hostname; }
                              catch { return site; }
                            })()}
                          </span>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <span>99.9%</span>
                          <span>{siteErrors.length} errors</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>

          {/* Error trend */}
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Error trend</h3>

            {trendEntries.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 py-12 text-center">
                <Activity className="mx-auto mb-3 h-8 w-8 text-gray-300" />
                <p className="font-medium text-gray-700">No trend data available</p>
                <p className="mt-1 text-sm text-gray-500">Try another reporting period.</p>
              </div>
            ) : (
              <>
                <div className="flex h-48 items-end gap-2 overflow-x-auto border-b border-gray-100 pb-2">
                  {trendEntries.map(([date, data]) => {
                    const js = Number(data.javascript) || 0;
                    const api = Number(data.api) || 0;
                    const promise = Number(data.unhandled_promise) || 0;
                    const total = Number(data.total) || js + api + promise;
                    const barHeight = (total / maxErrors) * 150;

                    return (
                      <div
                        key={date}
                        className="group flex min-w-10 flex-1 flex-col items-center justify-end"
                        title={`${date}: ${total} errors`}
                      >
                        <span className="mb-1 text-xs font-semibold text-gray-600">
                          {total}
                        </span>
                        <div
                          className="flex w-7 flex-col-reverse overflow-hidden rounded-t-sm bg-gray-50 sm:w-9"
                          style={{ height: `${Math.max(barHeight, 2)}px` }}
                        >
                          {js > 0 && (
                            <div
                              className="w-full bg-red-500"
                              style={{
                                height: `${(js / Math.max(total, 1)) * 100}%`,
                                minHeight: "2px",
                              }}
                            />
                          )}
                          {api > 0 && (
                            <div
                              className="w-full bg-orange-500"
                              style={{
                                height: `${(api / Math.max(total, 1)) * 100}%`,
                                minHeight: "2px",
                              }}
                            />
                          )}
                          {promise > 0 && (
                            <div
                              className="w-full bg-purple-500"
                              style={{
                                height: `${(promise / Math.max(total, 1)) * 100}%`,
                                minHeight: "2px",
                              }}
                            />
                          )}
                        </div>
                        <span className="mt-2 max-w-full truncate text-[10px] text-gray-400">
                          {date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs text-gray-600">
                  {[
                    ["bg-red-500", "JavaScript"],
                    ["bg-orange-500", "API"],
                    ["bg-purple-500", "Promise"],
                  ].map(([color, label]) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-sm ${color}`} />
                      {label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Recent incidents */}
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Recent incidents
            </h3>

            {recentIncidents.length === 0 ? (
              <p className="text-sm text-gray-500">No recent incidents.</p>
            ) : (
              <div className="space-y-4">
                {recentIncidents.map((alert) => (
                  <div key={alert.id} className="border-b border-gray-100 pb-3 last:border-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {alert.message}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(alert.created_at)} · {alert.page || "Unknown"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Most common errors */}
          <section className="rounded-xl border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Most common errors
            </h3>

            {commonErrors.length === 0 ? (
              <p className="text-sm text-gray-500">No common errors.</p>
            ) : (
              <ol className="space-y-3">
                {commonErrors.map((error, index) => (
                  <li
                    key={`${error.message}-${index}`}
                    className="flex items-start justify-between gap-3"
                  >
                    <span className="text-sm text-gray-700">
                      {index + 1}. {error.message || "Unknown error"}
                    </span>
                    <span className="shrink-0 text-sm font-bold text-gray-900">
                      {Number(error.count) || 0}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
