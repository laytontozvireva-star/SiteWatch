import { useState } from "react";

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
  if (diffDay < 7) return `${diffDay} d ago`;
  return date.toLocaleDateString();
}

function getSeverity(alert) {
  if (alert.is_read) return "Resolved";
  const msg = (alert.message || "").toLowerCase();
  if (msg.includes("not responding") || msg.includes("down") || msg.includes("critical"))
    return "Critical";
  return "Warning";
}

function getSeverityDot(severity) {
  if (severity === "Critical") return "bg-red-500";
  if (severity === "Warning") return "bg-orange-400";
  return "bg-gray-400";
}

const TABS = [
  { id: "unread", label: "Unread" },
  { id: "all", label: "All" },
  { id: "resolved", label: "Resolved" },
];

export default function AlertsPage({
  alerts,
  onMarkAsRead,
  onMarkAllAsRead,
  readingAlerts,
  unreadAlerts,
  message = "",
  setMessage,
}) {
  const [activeTab, setActiveTab] = useState("unread");

  const filteredAlerts = alerts.filter((alert) => {
    if (activeTab === "unread") return !alert.is_read;
    if (activeTab === "resolved") return alert.is_read;
    return true;
  });

  return (
    <div className="px-6 py-8 lg:px-10">
      {message && (
        <div className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div><p className="font-semibold">Something needs attention</p><p className="mt-1">{message}</p></div>
          <button onClick={() => setMessage?.("")} aria-label="Dismiss message" className="font-semibold">×</button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Alerts</h1>

        {unreadAlerts > 0 && onMarkAllAsRead && (
          <button
            onClick={onMarkAllAsRead}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = tab.id === "unread" ? unreadAlerts : null;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
              {count != null && count > 0 && (
                <span className="ml-1.5">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Alert list */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        {filteredAlerts.length === 0 ? (
          <div className="py-16 text-center text-gray-500">
            <p className="font-semibold">No alerts in this category</p>
            <p className="mt-1 text-sm">
              {activeTab === "unread"
                ? "All caught up! No unread alerts."
                : "No alerts to show."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredAlerts.map((alert) => {
              const severity = getSeverity(alert);
              const dotColor = getSeverityDot(severity);
              const isReading = readingAlerts.includes(alert.id);

              let hostname = "";
              try {
                hostname = alert.page
                  ? new URL(alert.page).hostname
                  : alert.page || "";
              } catch {
                hostname = alert.page || "";
              }

              return (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between px-6 py-5 ${
                    alert.is_read ? "bg-gray-50/50" : ""
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Dot */}
                    <span className={`w-3 h-3 rounded-full shrink-0 ${dotColor}`} />

                    {/* Severity */}
                    <span className="text-sm font-medium text-gray-500 w-20 shrink-0">
                      {severity}
                    </span>

                    {/* Message */}
                    <span className="text-sm font-semibold text-gray-900 truncate flex-1">
                      {alert.message || "SiteWatch alert"}
                    </span>

                    {/* Site */}
                    <span className="text-sm text-gray-500 hidden sm:block shrink-0">
                      {hostname}
                    </span>

                    {/* Time */}
                    <span className="text-sm text-gray-400 shrink-0 ml-4">
                      {formatRelativeTime(alert.created_at)}
                    </span>
                  </div>

                  {/* Mark read */}
                  {!alert.is_read && (
                    <button
                      onClick={() => onMarkAsRead(alert.id)}
                      disabled={isReading}
                      className="ml-4 shrink-0 rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition"
                    >
                      {isReading ? "..." : "Mark read"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
