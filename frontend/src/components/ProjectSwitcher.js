import { useState, useRef, useEffect } from "react";
import { ChevronsUpDown, Check, Plus, Search } from "lucide-react";

export default function ProjectSwitcher({
  projects = [],
  activeProject = null,
  onSelectProject,
  onNavigate,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProjects = projects.filter((p) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (p.name || "").toLowerCase().includes(query) ||
      (p.website_url || "").toLowerCase().includes(query)
    );
  });

  const getDomain = (url) => {
    if (!url) return "";
    try {
      return new URL(url).hostname || url;
    } catch {
      return url;
    }
  };

  const currentProjectName = activeProject?.name || "Select Project";
  const currentInitial = (activeProject?.name || "S").charAt(0).toUpperCase();

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 px-1">
        <span>Active Site</span>
        <span className="text-emerald-400 font-mono text-[9px]">● LIVE</span>
      </div>

      {/* Trigger Button (Supabase / GitHub Style) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 text-left transition shadow-sm group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-[#2d6a4f] text-white text-xs font-bold shrink-0">
            {currentInitial}
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-white truncate leading-tight">
              {currentProjectName}
            </p>
            {activeProject?.website_url && (
              <p className="text-[10px] text-gray-400 truncate leading-tight">
                {getDomain(activeProject.website_url)}
              </p>
            )}
          </div>
        </div>
        <ChevronsUpDown
          className={`w-4 h-4 text-gray-400 group-hover:text-gray-200 shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-white" : ""
          }`}
        />
      </button>

      {/* In-flow Collapsible Project List (Does not overlay links) */}
      {isOpen && (
        <div className="w-full mt-1.5 rounded-xl bg-[#1e293b] border border-slate-700 shadow-lg overflow-hidden py-1 transition-all duration-200">
          {/* Search bar if multiple projects exist */}
          {projects.length > 3 && (
            <div className="px-2.5 py-1.5 border-b border-slate-700/80">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find a site..."
                  className="w-full pl-8 pr-2.5 py-1 rounded-lg bg-slate-900/60 border border-slate-700/60 text-xs text-white placeholder-gray-500 outline-none focus:border-[#2d6a4f]"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Project List */}
          <div className="max-h-56 overflow-y-auto py-1 divide-y divide-slate-800/40">
            {filteredProjects.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-gray-400">
                No matching projects found
              </div>
            ) : (
              filteredProjects.map((project) => {
                const isSelected = activeProject?.id === project.id;
                const initial = (project.name || "S").charAt(0).toUpperCase();
                const domain = getDomain(project.website_url);

                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => {
                      if (onSelectProject) onSelectProject(project);
                      setIsOpen(false);
                      setSearchQuery("");
                    }}
                    className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 text-left transition ${
                      isSelected
                        ? "bg-slate-700/60 text-white"
                        : "text-gray-300 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold shrink-0 ${
                          isSelected
                            ? "bg-[#2d6a4f] text-white"
                            : "bg-slate-700 text-gray-300"
                        }`}
                      >
                        {initial}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold leading-tight truncate">
                          {project.name || "Untitled"}
                        </p>
                        {domain && (
                          <p className="text-[10px] text-gray-400 leading-tight truncate">
                            {domain}
                          </p>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Action: + Add New Site */}
          <div className="border-t border-slate-700/80 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                if (onNavigate) onNavigate("sites");
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/80 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register new site</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
