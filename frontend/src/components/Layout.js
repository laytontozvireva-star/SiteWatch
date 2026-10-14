import { useState } from "react";
import { Menu, X, Layout } from "lucide-react";
import Sidebar, { NAV_ITEMS } from "./Sidebar";
import ProjectSwitcher from "./ProjectSwitcher";

export default function AppLayout({
  currentPage,
  onNavigate,
  unreadAlerts,
  refreshing = false,
  session = null,
  onSignOut,
  projects = [],
  activeProject = null,
  onSelectProject,
  children,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Desktop sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        unreadAlerts={unreadAlerts}
        refreshing={refreshing}
        session={session}
        onSignOut={onSignOut}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={onSelectProject}
      />

      {/* Mobile sidebar overlay & drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative flex flex-col w-64 max-w-xs bg-[#1a2332] z-50 pt-6 pb-4">
            <div className="flex items-center justify-between px-5 mb-8">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#2d6a4f]">
                  <Layout className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold text-white tracking-tight">
                  SiteWatch
                </span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-3 mb-4">
              <ProjectSwitcher
                projects={projects}
                activeProject={activeProject}
                onSelectProject={(project) => {
                  if (onSelectProject) onSelectProject(project);
                  setMobileOpen(false);
                }}
                onNavigate={(page) => {
                  if (onNavigate) onNavigate(page);
                  setMobileOpen(false);
                }}
              />
            </div>

            <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMobileOpen(false);
                    }}
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
          </div>
        </div>
      )}

      {/* Main content wrapper with padding-left on desktop to avoid flexbox margin-overflow */}
      <div className="md:pl-56 min-h-screen flex flex-col w-full min-w-0">
        {/* Mobile header */}
        <div className="sticky top-0 z-20 md:hidden flex items-center gap-3 bg-[#1a2332] px-4 py-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-lg font-bold text-white">SiteWatch</span>
        </div>

        <main className="flex-1 min-w-0 w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
