import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import AppLayout from "./components/Layout";
import OverviewPage from "./pages/OverviewPage";
import ErrorsPage from "./pages/ErrorsPage";
import AlertsPage from "./pages/AlertsPage";
import SitesPage from "./pages/SitesPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import { supabase } from "./supabaseClient";

const API_BASE = (() => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
  if (process.env.BACKEND_URL) return `${process.env.BACKEND_URL.replace(/\/$/, "")}/api`;
  if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
    return "/api";
  }
  return "http://localhost:5000/api";
})();
const EMPTY_ANALYTICS = {
  totalErrors: 0,
  javascriptErrors: 0,
  apiErrors: 0,
  promiseErrors: 0,
};

function App() {
  const [currentPage, setCurrentPage] = useState("overview");

  const [errors, setErrors] = useState([]);
  const errorsRef = useRef(errors);
  errorsRef.current = errors;
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);
  const [trend, setTrend] = useState({});
  const [commonErrors, setCommonErrors] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const [message, setMessage] = useState("");
  const [range, setRange] = useState("30d");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [readingAlerts, setReadingAlerts] = useState([]);
  const [session, setSession] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");
  const [projectReload, setProjectReload] = useState(0);
  const [resolvingErrorId, setResolvingErrorId] = useState(null);
  const [hasMoreErrors, setHasMoreErrors] = useState(false);
  const [loadingMoreErrors, setLoadingMoreErrors] = useState(false);
  const loadRequestId = useRef(0);
  const activeProjectIdRef = useRef(null);
  activeProjectIdRef.current = activeProject?.id || null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch projects belonging to the logged-in user and auto-select active one
  useEffect(() => {
    if (!session?.access_token) {
      setProjects([]);
      setActiveProject(null);
      setLoadingMoreErrors(false);
      setProjectsLoading(false);
      setProjectsError("");
      return;
    }

    let cancelled = false;
    setProjects([]);
    setActiveProject(null);
    setResolvingErrorId(null);
    setLoadingMoreErrors(false);
    setProjectsLoading(true);
    setProjectsError("");
    fetch(`${API_BASE}/projects`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const result = await res.json().catch(() => ({}));
          throw new Error(result.message || "Could not load your sites.");
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (!Array.isArray(data?.projects)) {
          throw new Error("The server returned an invalid site list.");
        }
        const nextProjects = data.projects;
        setProjects(nextProjects);
        const savedId = localStorage.getItem("sitewatch_active_project_id");
        const initial = nextProjects.find((p) => p.id === savedId) || nextProjects[0] || null;
        setActiveProject(initial);
        if (!initial) localStorage.removeItem("sitewatch_active_project_id");
      })
      .catch((err) => {
        if (!cancelled) setProjectsError(err.message || "Could not load your sites.");
      })
      .finally(() => {
        if (!cancelled) setProjectsLoading(false);
      });
    return () => { cancelled = true; };
  }, [session, projectReload]);

  const handleSelectProject = (project) => {
    setActiveProject(project);
    setResolvingErrorId(null);
    setLoadingMoreErrors(false);
    if (project?.id) {
      localStorage.setItem("sitewatch_active_project_id", project.id);
    }
  };

  const handleProjectCreated = (newProject) => {
    setProjects((prev) => [newProject, ...prev]);
    setProjectsError("");
    handleSelectProject(newProject);
  };

  const handleProjectDeleted = async (project) => {
    const response = await fetch(`${API_BASE}/projects/${project.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.message || "Could not remove this site.");
    }

    const remaining = projects.filter((item) => item.id !== project.id);
    setProjects(remaining);
    if (activeProject?.id === project.id) {
      const nextProject = remaining[0] || null;
      setActiveProject(nextProject);
      setLoadingMoreErrors(false);
      if (nextProject?.id) localStorage.setItem("sitewatch_active_project_id", nextProject.id);
      else localStorage.removeItem("sitewatch_active_project_id");
    }
  };

  const handleSignOut = async () => {
    setSession(null);
    setProjects([]);
    setActiveProject(null);
    setResolvingErrorId(null);
    setLoadingMoreErrors(false);
    setHasMoreErrors(false);
    setErrors([]);
    setAnalytics(EMPTY_ANALYTICS);
    setTrend({});
    setCommonErrors([]);
    setAlerts([]);
    setMessage("");
    setProjectsError("");
    localStorage.removeItem("sitewatch_active_project_id");
    await supabase.auth.signOut();
  };

  const loadErrors = useCallback(async (showLoading = false) => {
    const requestId = ++loadRequestId.current;
    if (!activeProject?.api_key) {
      setErrors([]);
      setHasMoreErrors(false);
      setAnalytics(EMPTY_ANALYTICS);
      setTrend({});
      setCommonErrors([]);
      setAlerts([]);
      setMessage("");
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (showLoading) {
      setLoading(true);
      setErrors([]);
      setHasMoreErrors(false);
      setAnalytics(EMPTY_ANALYTICS);
      setTrend({});
      setCommonErrors([]);
      setAlerts([]);
    }

    setRefreshing(true);
    setMessage("");

    const activeKey = activeProject.api_key;
    const headers = {
      "x-sitewatch-key": activeKey,
    };

    try {
      const responses = await Promise.all([
        fetch(`${API_BASE}/errors?limit=100&offset=0`, { headers }),
        fetch(`${API_BASE}/analytics?range=${range}`, { headers }),
        fetch(`${API_BASE}/analytics/trend?range=${range}`, {
          headers,
        }),
        fetch(`${API_BASE}/analytics/common?range=${range}`, {
          headers,
        }),
        fetch(`${API_BASE}/alerts`, { headers }),
      ]);

      if (requestId !== loadRequestId.current) return;

      const labels = [
        "errors",
        "analytics",
        "trend",
        "common errors",
        "alerts",
      ];

      const failedIndex = responses.findIndex(
        (response) => !response.ok
      );

      if (failedIndex !== -1) {
        const failed = responses[failedIndex];
        let detail = "";
        try {
          const errData = await failed.clone().json();
          detail = errData.message ? ` - ${errData.message}` : "";
        } catch {
          detail = failed.statusText ? ` - ${failed.statusText}` : "";
        }
        throw new Error(
          `Could not load ${labels[failedIndex]} (HTTP ${failed.status}${detail}). Check your backend and API access.`
        );
      }

      const [
        errorsData,
        analyticsData,
        trendData,
        commonData,
        alertsData,
      ] = await Promise.all(responses.map((response) => response.json()));

      if (requestId !== loadRequestId.current) return;

      const firstErrorBatch = Array.isArray(errorsData.errors) ? errorsData.errors : [];
      const loadedErrorCount = errorsRef.current.length;
      setErrors((previous) => {
        if (showLoading || previous.length <= firstErrorBatch.length) return firstErrorBatch;
        const firstPageIds = new Set(firstErrorBatch.map((item) => item.id));
        const olderItems = previous.slice(firstErrorBatch.length).filter((item) => !firstPageIds.has(item.id));
        return [...firstErrorBatch, ...olderItems];
      });
      setHasMoreErrors(firstErrorBatch.length === 100 || loadedErrorCount > firstErrorBatch.length);

      setAnalytics({
        ...EMPTY_ANALYTICS,
        ...(analyticsData.analytics || {}),
      });

      setTrend(trendData.trend || {});
      setCommonErrors(
        Array.isArray(commonData.commonErrors)
          ? commonData.commonErrors
          : []
      );
      setAlerts(
        Array.isArray(alertsData.alerts) ? alertsData.alerts : []
      );
    } catch (error) {
      if (requestId !== loadRequestId.current) return;
      setMessage(
        error.message ||
          "Something went wrong while loading SiteWatch."
      );
    } finally {
      if (requestId === loadRequestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [range, activeProject]);

  const loadMoreErrors = async () => {
    if (!activeProject?.api_key || loadingMoreErrors || !hasMoreErrors) return;
    const projectId = activeProject.id;
    const offset = errors.length;
    setLoadingMoreErrors(true);
    try {
      const response = await fetch(`${API_BASE}/errors?limit=100&offset=${offset}`, {
        headers: { "x-sitewatch-key": activeProject.api_key },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Could not load older errors.");
      if (activeProjectIdRef.current !== projectId) return;
      const batch = Array.isArray(result.errors) ? result.errors : [];
      setErrors((previous) => {
        const existingIds = new Set(previous.map((item) => item.id));
        return [...previous, ...batch.filter((item) => !existingIds.has(item.id))];
      });
      setHasMoreErrors(batch.length === 100);
    } catch (error) {
      if (activeProjectIdRef.current === projectId) {
        setMessage(error.message || "Could not load older errors.");
      }
    } finally {
      if (activeProjectIdRef.current === projectId) setLoadingMoreErrors(false);
    }
  };

  useEffect(() => {
    loadErrors(true);
  }, [loadErrors]);

  // Refresh project data at the cadence shown in the sidebar.
  useEffect(() => {
    const timer = setInterval(() => {
      loadErrors(false);
    }, 15000);

    return () => clearInterval(timer);
  }, [loadErrors]);

  const markAlertAsRead = async (id) => {
    if (readingAlerts.includes(id)) return;
    if (!activeProject?.api_key) return;

    setReadingAlerts((previous) => [...previous, id]);
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE}/alerts/${id}/read`,
        {
          method: "PATCH",
          headers: {
            "x-sitewatch-key": activeProject.api_key,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Could not mark this alert as read.");
      }

      setAlerts((previous) =>
        previous.map((alert) =>
          alert.id === id ? { ...alert, is_read: true } : alert
        )
      );
    } catch (error) {
      setMessage(error.message || "Failed to update the alert.");
    } finally {
      setReadingAlerts((previous) =>
        previous.filter((alertId) => alertId !== id)
      );
    }
  };

  const setErrorResolved = async (errorRecord, resolved) => {
    if (!activeProject?.api_key) throw new Error("Select a site before updating an error.");
    const requestProjectId = activeProject.id;
    setResolvingErrorId(errorRecord.id);
    setMessage("");
    try {
      const response = await fetch(`${API_BASE}/errors/${errorRecord.id}/resolution`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-sitewatch-key": activeProject.api_key,
        },
        body: JSON.stringify({ resolved }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Could not update this error.");
      if (activeProjectIdRef.current !== requestProjectId) return result.error;
      setErrors((previous) => previous.map((item) => item.id === errorRecord.id ? result.error : item));
      return result.error;
    } catch (error) {
      if (activeProjectIdRef.current === requestProjectId) {
        setMessage(error.message || "Could not update this error.");
      }
      throw error;
    } finally {
      if (activeProjectIdRef.current === requestProjectId) setResolvingErrorId(null);
    }
  };

  const markAllAlertsAsRead = async () => {
    const unread = alerts.filter((a) => !a.is_read);
    for (const alert of unread) {
      await markAlertAsRead(alert.id);
    }
  };

  const filteredErrors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return errors.filter((error) => {
      const matchesType =
        typeFilter === "all" || error.type === typeFilter;

      const searchableText = [
        error.message,
        error.page,
        error.url,
        error.type,
        error.stack,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesType && searchableText.includes(query);
    });
  }, [errors, searchTerm, typeFilter]);

  const unreadAlerts = alerts.filter(
    (alert) => !alert.is_read
  ).length;

  // Render the active page
  const renderPage = () => {
    switch (currentPage) {
      case "overview":
        return (
          <OverviewPage
            analytics={analytics}
            trend={trend}
            commonErrors={commonErrors}
            alerts={alerts}
            errors={errors}
            range={range}
            setRange={setRange}
            loading={loading}
            refreshing={refreshing}
            onRefresh={loadErrors}
            message={message}
            setMessage={setMessage}
            unreadAlerts={unreadAlerts}
            projects={projects}
            projectsLoading={projectsLoading}
            projectsError={projectsError}
            onRetryProjects={() => setProjectReload((value) => value + 1)}
            onNavigate={setCurrentPage}
            session={session}
            activeProject={activeProject}
          />
        );

      case "sites":
        return (
          <SitesPage
            errors={errors}
            projects={projects}
            activeProject={activeProject}
            setActiveProject={handleSelectProject}
            onProjectCreated={handleProjectCreated}
            onProjectDeleted={handleProjectDeleted}
            projectsLoading={projectsLoading}
            projectsError={projectsError}
            onRetryProjects={() => setProjectReload((value) => value + 1)}
            message={message}
            session={session}
            onNavigate={setCurrentPage}
            onRefresh={loadErrors}
          />
        );

      case "errors":
        return (
          <ErrorsPage
            errors={errors}
            filteredErrors={filteredErrors}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            range={range}
            setRange={setRange}
            loading={loading}
            message={message}
            setMessage={setMessage}
            onSetErrorResolved={setErrorResolved}
            resolvingErrorId={resolvingErrorId}
            onLoadMore={loadMoreErrors}
            hasMoreErrors={hasMoreErrors}
            loadingMoreErrors={loadingMoreErrors}
            localProjectRoot={activeProject?.id ? localStorage.getItem(`sitewatch_vscode_project_root_${activeProject.id}`) || "" : ""}
          />
        );

      case "alerts":
        return (
          <AlertsPage
            alerts={alerts}
            onMarkAsRead={markAlertAsRead}
            onMarkAllAsRead={markAllAlertsAsRead}
            readingAlerts={readingAlerts}
            unreadAlerts={unreadAlerts}
            message={message}
            setMessage={setMessage}
          />
        );

      case "settings":
        return (
          <SettingsPage
            session={session}
            onNavigate={setCurrentPage}
            onSignOut={handleSignOut}
            activeProject={activeProject}
          />
        );

      default:
        return (
          <OverviewPage
            analytics={analytics}
            trend={trend}
            commonErrors={commonErrors}
            alerts={alerts}
            errors={errors}
            range={range}
            setRange={setRange}
            loading={loading}
            refreshing={refreshing}
            onRefresh={loadErrors}
            message={message}
            setMessage={setMessage}
            unreadAlerts={unreadAlerts}
            projects={projects}
            projectsLoading={projectsLoading}
            projectsError={projectsError}
            onRetryProjects={() => setProjectReload((value) => value + 1)}
            onNavigate={setCurrentPage}
            session={session}
            activeProject={activeProject}
          />
        );
    }
  };

  // Full-screen authentication views
  if (currentPage === "login") {
    return (
      <LoginPage
        onNavigate={setCurrentPage}
        onAuthSuccess={(newSession) => {
          setSession(newSession);
          setCurrentPage("overview");
        }}
      />
    );
  }

  if (currentPage === "signup") {
    return (
      <SignupPage
        onNavigate={setCurrentPage}
        onAuthSuccess={(newSession) => {
          setSession(newSession);
          setCurrentPage("overview");
        }}
      />
    );
  }

  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      unreadAlerts={unreadAlerts}
      refreshing={refreshing}
      session={session}
      onSignOut={handleSignOut}
      projects={projects}
      activeProject={activeProject}
      onSelectProject={handleSelectProject}
    >
      {renderPage()}
    </AppLayout>
  );
}

export default App;
