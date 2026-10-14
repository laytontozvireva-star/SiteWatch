import { useCallback, useEffect, useMemo, useState } from "react";

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
const API_KEY = "sw_3fe83516-e68b-43c8-b1c4-e050280e79ff";

const EMPTY_ANALYTICS = {
  totalErrors: 0,
  javascriptErrors: 0,
  apiErrors: 0,
  promiseErrors: 0,
};

function App() {
  const [currentPage, setCurrentPage] = useState("overview");

  const [errors, setErrors] = useState([]);
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
    if (!session?.access_token) return;

    fetch(`${API_BASE}/projects`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.projects?.length > 0) {
          setProjects(data.projects);
          const savedId = localStorage.getItem("sitewatch_active_project_id");
          const found = data.projects.find((p) => p.id === savedId);
          const initial = found || data.projects[0];
          setActiveProject(initial);
        }
      })
      .catch((err) => console.error("Could not fetch user projects", err));
  }, [session]);

  const handleSelectProject = (project) => {
    setActiveProject(project);
    if (project?.id) {
      localStorage.setItem("sitewatch_active_project_id", project.id);
    }
  };

  const handleProjectCreated = (newProject) => {
    setProjects((prev) => [newProject, ...prev]);
    handleSelectProject(newProject);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProjects([]);
    setActiveProject(null);
    localStorage.removeItem("sitewatch_active_project_id");
  };

  const loadErrors = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }

    setRefreshing(true);
    setMessage("");

    const activeKey = activeProject?.api_key || API_KEY;
    const headers = {
      "x-sitewatch-key": activeKey,
    };

    try {
      const responses = await Promise.all([
        fetch(`${API_BASE}/errors`, { headers }),
        fetch(`${API_BASE}/analytics?range=${range}`, { headers }),
        fetch(`${API_BASE}/analytics/trend?range=${range}`, {
          headers,
        }),
        fetch(`${API_BASE}/analytics/common?range=${range}`, {
          headers,
        }),
        fetch(`${API_BASE}/alerts`, { headers }),
      ]);

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

      setErrors(
        Array.isArray(errorsData.errors) ? errorsData.errors : []
      );

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
      setMessage(
        error.message ||
          "Something went wrong while loading SiteWatch."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range, activeProject]);

  useEffect(() => {
    loadErrors(true);
  }, [loadErrors]);

  // Periodic automatic polling in the background every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      loadErrors(false);
    }, 15000);

    return () => clearInterval(timer);
  }, [loadErrors]);

  const markAlertAsRead = async (id) => {
    if (readingAlerts.includes(id)) return;

    setReadingAlerts((previous) => [...previous, id]);
    setMessage("");

    try {
      const response = await fetch(
        `${API_BASE}/alerts/${id}/read`,
        {
          method: "PATCH",
          headers: {
            "x-sitewatch-key": API_KEY,
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
          />
        );

      case "sites":
        return (
          <SitesPage
            errors={errors}
            session={session}
            projects={projects}
            activeProject={activeProject}
            setActiveProject={handleSelectProject}
            onProjectCreated={handleProjectCreated}
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
          />
        );

      case "settings":
        return (
          <SettingsPage
            session={session}
            onNavigate={setCurrentPage}
            onSignOut={handleSignOut}
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
