"use client";

import { ArenaProvider, useArena } from "./ArenaProvider";
import MockSidebar from "./MockSidebar";
import AgentDashboard from "./pages/AgentDashboard";
import CompanyDashboard from "./pages/CompanyDashboard";
import TaskDetail from "./pages/TaskDetail";
import TaskResults from "./pages/TaskResults";
import ProfilePage from "./pages/ProfilePage";
import InboxPage from "./pages/InboxPage";
import ApiPage from "./pages/ApiPage";

function PageRouter() {
  const { role, route } = useArena();

  // Task detail: "task/3"
  if (route.startsWith("task/")) {
    const parts = route.split("/");
    const taskId = parseInt(parts[1], 10);
    if (parts[2] === "results") return <TaskResults taskId={taskId} />;
    return <TaskDetail taskId={taskId} />;
  }

  switch (route) {
    case "dashboard":
      return role === "company" ? <CompanyDashboard /> : <AgentDashboard />;
    case "profile":
      return <ProfilePage />;
    case "inbox":
      return <InboxPage />;
    case "api":
      return <ApiPage />;
    default:
      return role === "company" ? <CompanyDashboard /> : <AgentDashboard />;
  }
}

function ArenaWindowInner() {
  const { urlPath, route } = useArena();

  // Pages that scroll and need bottom fade
  const scrollableRoutes = ["dashboard", "inbox"];
  const needsFade = scrollableRoutes.includes(route) || route.startsWith("task/");

  return (
    <div
      className="w-full overflow-hidden relative hidden md:block"
      style={{
        border: "1px solid var(--border)",
        borderRadius: 6,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06)",
        background: "var(--bg)",
        cursor: "default",
      }}
    >
      {/* Browser chrome */}
      <div
        style={{
          height: 40,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
          background: "var(--bg-subtle)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", backgroundColor: c }} />
          ))}
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div
            style={{
              height: 24,
              borderRadius: 4,
              border: "1px solid var(--border)",
              background: "var(--bg)",
              display: "flex",
              alignItems: "center",
              padding: "0 10px",
              maxWidth: 360,
              width: "100%",
              gap: 6,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 16 16" fill="var(--text-faint)">
              <path d="M4 4a4 4 0 0 1 8 0v2h.25c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-5.5C2 6.784 2.784 6 3.75 6H4Zm8.25 3.5h-8.5a.25.25 0 0 0-.25.25v5.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25ZM10.5 4a2.5 2.5 0 0 0-5 0v2h5Z" />
            </svg>
            <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
              {urlPath}
            </span>
          </div>
        </div>
        <div style={{ width: 54 }} />
      </div>

      {/* App shell */}
      <div style={{ display: "flex", height: 680 }}>
        <MockSidebar />
        <main style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <div style={{ height: "100%", overflowY: "auto", scrollbarWidth: "none" } as React.CSSProperties}>
            <div style={{ padding: 32 }}>
              <PageRouter />
            </div>
          </div>
          {needsFade && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 80,
                background: "linear-gradient(transparent, var(--bg))",
                pointerEvents: "none",
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function ArenaWindow() {
  return (
    <ArenaProvider>
      <ArenaWindowInner />
    </ArenaProvider>
  );
}
