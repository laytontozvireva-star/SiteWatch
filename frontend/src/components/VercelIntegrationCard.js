import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Link2, Loader2, RefreshCw, Unplug } from "lucide-react";

function readableStatus(status) {
  return (status || "Unknown").replaceAll("_", " ").toLowerCase();
}

export default function VercelIntegrationCard({ apiBase, session, activeProject, onProjectLinked }) {
  const [status, setStatus] = useState(null);
  const [links, setLinks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [projects, setProjects] = useState([]);
  const [teamId, setTeamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const request = useCallback(async (path, options = {}) => {
    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${session.access_token}`, ...(options.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Vercel request failed.");
    return data;
  }, [apiBase, session]);

  const refresh = useCallback(async () => {
    if (!session?.access_token) return;
    setLoading(true);
    try {
      const connection = await request("/integrations/vercel/status");
      setStatus(connection);
      if (connection.connected) {
        const linkData = await request("/integrations/vercel/links");
        setLinks(linkData.links || []);
        const teamData = await request("/integrations/vercel/teams");
        setTeams(teamData.teams || []);
      } else {
        setLinks([]);
        setTeams([]);
        setProjects([]);
      }
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  }, [request, session]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const apiOrigin = new URL(apiBase, window.location.origin).origin;
    const completed = (event) => {
      if (event.origin === apiOrigin && event.data?.type === "sitewatch:vercel-connected") {
        setMessage("Vercel connected successfully.");
        refresh();
      }
    };
    window.addEventListener("message", completed);
    return () => window.removeEventListener("message", completed);
  }, [apiBase, refresh]);

  const connect = async () => {
    const popup = window.open("", "sitewatch-vercel-oauth", "popup,width=560,height=720");
    if (!popup) { setMessage("Allow pop-ups to connect your Vercel account."); return; }
    popup.document.title = "Connecting Vercel…";
    setLoading(true); setMessage("");
    try {
      const data = await request("/integrations/vercel/connect");
      popup.location.assign(data.authorizationUrl);
    } catch (error) { popup.close(); setMessage(error.message); }
    finally { setLoading(false); }
  };

  const loadProjects = async (nextTeamId) => {
    setTeamId(nextTeamId); setProjects([]); setMessage("");
    setLoading(true);
    try {
      const query = nextTeamId ? `?teamId=${encodeURIComponent(nextTeamId)}` : "";
      const data = await request(`/integrations/vercel/projects${query}`);
      setProjects(data.projects || []);
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  };

  const linkProject = async (vercelProject) => {
    if (!activeProject) return;
    setLoading(true); setMessage("");
    try {
      const data = await request(`/integrations/vercel/projects/${encodeURIComponent(vercelProject.id)}/link`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: teamId || null, sitewatchProjectId: activeProject.id }),
      });
      setLinks((previous) => [data.link, ...previous.filter((link) => link.sitewatch_project_id !== activeProject.id)]);
      setMessage(`${vercelProject.name} is linked to ${activeProject.name}.`);
      onProjectLinked?.(data);
    } catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  };

  const disconnect = async () => {
    if (!window.confirm("Disconnect Vercel? Existing project links will remain, but deployment updates will stop.")) return;
    setLoading(true); setMessage("");
    try { await request("/integrations/vercel/disconnect", { method: "DELETE" }); await refresh(); }
    catch (error) { setMessage(error.message); }
    finally { setLoading(false); }
  };

  if (!session) return null;
  const activeLink = links.find((link) => link.sitewatch_project_id === activeProject?.id);

  return (
    <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="text-base font-bold text-gray-900">Vercel deployments</h2><p className="mt-1 text-sm text-gray-500">Link a Vercel project to keep deployment status visible in SiteWatch.</p></div>
        {status?.connected ? <button onClick={disconnect} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"><Unplug className="h-3.5 w-3.5" /> Disconnect</button> : <button onClick={connect} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl bg-black px-3.5 py-2 text-xs font-semibold text-white hover:bg-gray-800"><Link2 className="h-3.5 w-3.5" /> Connect Vercel</button>}
      </div>
      {message && <p role="status" className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">{message}</p>}
      {loading && <p className="mt-3 inline-flex items-center gap-2 text-xs text-gray-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Updating Vercel connection…</p>}
      {status?.connected && activeProject && <div className="mt-5 border-t border-gray-100 pt-5">
        {activeLink ? <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900"><div className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-4 w-4" /> Linked to {activeLink.project_name}</div><p className="mt-1">Latest deployment: <span className="font-semibold capitalize">{readableStatus(activeLink.latest_deployment_status)}</span>{activeLink.latest_deployment_at ? ` · ${new Date(activeLink.latest_deployment_at).toLocaleString()}` : ""}</p>{activeLink.production_url && <a className="mt-2 inline-flex items-center gap-1 font-semibold underline" href={activeLink.production_url} target="_blank" rel="noreferrer">Open deployment <ExternalLink className="h-3.5 w-3.5" /></a>}</div> : <><label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Vercel team</label><select value={teamId} onChange={(event) => loadProjects(event.target.value)} className="w-full max-w-md rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm"><option value="">Personal account</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name || team.slug || team.id}</option>)}</select><div className="mt-3 flex items-center gap-2"><button onClick={() => loadProjects(teamId)} disabled={loading} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700"><RefreshCw className="h-3.5 w-3.5" /> Load projects</button><span className="text-xs text-gray-500">Choose the Vercel project for {activeProject.name}.</span></div>{projects.length > 0 && <div className="mt-3 divide-y rounded-xl border border-gray-200">{projects.map((project) => <div key={project.id} className="flex items-center justify-between gap-3 p-3"><span className="min-w-0 truncate text-sm font-medium text-gray-900">{project.name}</span><button onClick={() => linkProject(project)} disabled={loading} className="rounded-lg bg-[#2d6a4f] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#245740]">Link project</button></div>)}</div>}</>}
      </div>}
    </section>
  );
}
