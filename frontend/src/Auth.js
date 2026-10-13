
import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setMessage("Login successful!");
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          setMessage("Account created successfully!");
        } else {
          setMessage(
            "Account created. Check your email to confirm your account."
          );
        }
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500 text-2xl font-bold text-white">
            S
          </div>

          <h1 className="text-3xl font-bold text-white">SiteWatch</h1>

          <p className="mt-2 text-sm text-slate-400">
            Monitor errors. Protect your website.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-800 p-1">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError("");
              setMessage("");
            }}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              isLogin
                ? "bg-orange-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Sign in
          </button>

          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError("");
              setMessage("");
            }}
            className={`rounded-md px-4 py-2 text-sm font-medium ${
              !isLogin
                ? "bg-orange-500 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Email address
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete={isLogin ? "current-password" : "new-password"}
              minLength={8}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-orange-500"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-950 p-3 text-sm text-red-300">
              {error}
            </p>
          )}

          {message && (
            <p className="rounded-lg bg-emerald-950 p-3 text-sm text-emerald-300">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-orange-500 px-4 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : isLogin
              ? "Sign in to SiteWatch"
              : "Create your account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Secure website error monitoring
        </p>
      </div>
    </div>
  );
}
