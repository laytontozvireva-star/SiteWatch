import { Layout, Globe, AlertTriangle, Bell, Settings, LogIn, LogOut } from "lucide-react";
import ProjectSwitcher from "./ProjectSwitcher";

export const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: Layout },
  { id: "sites", label: "Sites", icon: Globe },
  { id: "errors", label: "Errors", icon: AlertTriangle },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Sidebar({
  currentPage,
  onNavigate,
  unreadAlerts = 0,
  refreshing = false,
  session = null,
  onSignOut,
  projects = [],
  activeProject = null,
  onSelectProject,
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 md:flex md:flex-col bg-[#1a2332]">
      <div className="flex flex-col flex-1 pt-6 pb-4 overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 mb-5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#2d6a4f]">
            <Layout className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">
            SiteWatch
          </span>
        </div>

        {/* Project Switcher (Supabase / GitHub Style) */}
        <div className="px-3 mb-5">
          <ProjectSwitcher
            projects={projects}
            activeProject={activeProject}
            onSelectProject={onSelectProject}
            onNavigate={onNavigate}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#2d6a4f] text-white"
                    : "text-gray-400 hover:bg-slate-700/60 hover:text-white"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-[18px] h-[18px]" />
                  <span>{item.label}</span>
                </div>

                {item.id === "alerts" && unreadAlerts > 0 && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-[11px] font-bold text-white">
                    {unreadAlerts}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Account / Sign In */}
        <div className="px-3 pt-3 border-t border-slate-700/50">
          {session?.user ? (
            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-800/60 text-xs">
              <div className="truncate max-w-[130px]">
                <p className="font-semibold text-white truncate text-[11px]">
                  {session.user.email}
                </p>
              </div>
              <button
                onClick={onSignOut}
                title="Sign out"
                className="text-gray-400 hover:text-red-400 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => onNavigate("login")}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-800 text-xs font-medium text-gray-300 hover:text-white hover:bg-slate-700 transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign in</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pt-3">
          <p className="text-[11px] text-gray-500">Live monitoring</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-2 h-2 rounded-full ${
                refreshing ? "bg-amber-400 animate-pulse" : "bg-green-400"
              }`}
            />
            <p className="text-[11px] text-green-400 font-medium">
              {refreshing ? "Syncing..." : "Auto-refresh 15s"}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
