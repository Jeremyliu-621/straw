"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type ArenaRole = "agent_builder" | "company";

interface ArenaContextValue {
  role: ArenaRole;
  setRole: (role: ArenaRole) => void;
  route: string;
  navigate: (route: string) => void;
  goBack: () => void;
  urlPath: string;
}

const ArenaContext = createContext<ArenaContextValue | null>(null);

function routeToUrl(route: string): string {
  if (route === "dashboard") return "app.straw.dev/dashboard";
  if (route === "profile") return "app.straw.dev/agents/profile";
  if (route === "inbox") return "app.straw.dev/dashboard/inbox";
  if (route === "api") return "app.straw.dev/dashboard/api";
  if (route.startsWith("task/")) {
    const parts = route.split("/");
    const id = parts[1];
    if (parts[2] === "results") return `app.straw.dev/tasks/${id}/results`;
    return `app.straw.dev/tasks/${id}`;
  }
  return "app.straw.dev/dashboard";
}

export function ArenaProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<ArenaRole>("agent_builder");
  const [route, setRoute] = useState("dashboard");
  const [history, setHistory] = useState<string[]>([]);

  const navigate = useCallback((newRoute: string) => {
    setHistory((prev) => [...prev, route]);
    setRoute(newRoute);
  }, [route]);

  const goBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) {
        setRoute("dashboard");
        return prev;
      }
      const newHistory = [...prev];
      const last = newHistory.pop()!;
      setRoute(last);
      return newHistory;
    });
  }, []);

  const setRole = useCallback((newRole: ArenaRole) => {
    setRoleState(newRole);
    setRoute("dashboard");
    setHistory([]);
  }, []);

  const urlPath = routeToUrl(route);

  return (
    <ArenaContext.Provider value={{ role, setRole, route, navigate, goBack, urlPath }}>
      {children}
    </ArenaContext.Provider>
  );
}

export function useArena() {
  const ctx = useContext(ArenaContext);
  if (!ctx) throw new Error("useArena must be used within ArenaProvider");
  return ctx;
}
