import { User, LogOut, Key, ShieldCheck, LogIn } from "lucide-react";

export default function SettingsPage({ session, onNavigate, onSignOut, activeProject }) {
  const user = session?.user;

  return (
    <div className="px-6 py-8 lg:px-10 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Account & Authentication Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-700">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Account & Profile</h2>
              <p className="text-xs text-gray-500">Manage your login session and credentials.</p>
            </div>
          </div>

          <div className="pt-4">
            {user ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Signed in as</p>
                  <p className="text-sm font-bold text-gray-900 mt-0.5">{user.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">User ID: {user.id}</p>
                </div>
                <button
                  onClick={onSignOut}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-gray-800">You are currently browsing as a guest.</p>
                  <p className="text-xs text-gray-500 mt-0.5">Sign in to save your websites and manage your monitoring projects.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigate && onNavigate("login")}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#2d6a4f] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#245740]"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Sign in
                  </button>
                  <button
                    onClick={() => onNavigate && onNavigate("signup")}
                    className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Create account
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* API & Backend Connection Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-700">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Backend API Access</h2>
              <p className="text-xs text-gray-500">Connection settings to your SiteWatch backend.</p>
            </div>
          </div>

          <div className="pt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                API Base URL
              </label>
              <input
                type="text"
                readOnly
                value={
                  process.env.REACT_APP_API_URL ||
                  (process.env.BACKEND_URL ? `${process.env.BACKEND_URL.replace(/\/$/, "")}/api` : null) ||
                  (typeof window !== "undefined" && window.location.hostname !== "localhost" ? `${window.location.origin}/api` : "http://localhost:5000/api")
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 font-mono text-xs text-gray-700 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                SiteWatch Global API Key
              </label>
              <input
                type="text"
                readOnly
                value={activeProject?.api_key || "No project selected"}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 font-mono text-xs text-gray-700 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Monitoring Info */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 text-gray-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Monitoring Engine</h2>
              <p className="text-xs text-gray-500">Live polling and error capturing status.</p>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between text-xs text-gray-600">
            <span>Background auto-refresh rate</span>
            <span className="font-semibold text-gray-900">Every 15 seconds</span>
          </div>
        </div>
      </div>
    </div>
  );
}
