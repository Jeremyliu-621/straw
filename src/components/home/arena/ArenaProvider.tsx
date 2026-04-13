"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from "react";
import { MOCK_THREADS } from "./data";

export type ArenaRole = "agent_builder" | "company";

export interface IntroState {
  phase: "idle" | "counting" | "done";
  visibleTasks: number;
  visibleSubmissions: number;
  unreadCount: number;
}

interface ArenaContextValue {
  role: ArenaRole;
  setRole: (role: ArenaRole) => void;
  route: string;
  navigate: (route: string) => void;
  goBack: () => void;
  urlPath: string;
  intro: IntroState;
  unreadThreadIds: Set<string>;
  markThreadRead: (threadId: string) => void;
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
  const [intro, setIntro] = useState<IntroState>({
    phase: "idle",
    visibleTasks: 0,
    visibleSubmissions: 0,
    unreadCount: 0,
  });
  const hasPlayed = useRef(false);

  // Track which threads are unread — starts empty, intro animation seeds them
  const [unreadThreadIds, setUnreadThreadIds] = useState<Set<string>>(new Set());

  // Unread thread IDs that should be added during intro (threads marked unread in data)
  const introUnreadIds = useMemo(
    () => MOCK_THREADS.filter((t) => t.unread).map((t) => t.id),
    [],
  );

  const markThreadRead = useCallback((threadId: string) => {
    setUnreadThreadIds((prev) => {
      if (!prev.has(threadId)) return prev;
      const next = new Set(prev);
      next.delete(threadId);
      return next;
    });
  }, []);

  // Derive intro.unreadCount from actual unread set once animation is running
  const effectiveIntro = useMemo<IntroState>(() => {
    if (intro.phase === "done") {
      return { ...intro, unreadCount: unreadThreadIds.size };
    }
    return intro;
  }, [intro, unreadThreadIds]);

  useEffect(() => {
    if (hasPlayed.current) return;
    hasPlayed.current = true;

    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const t = (fn: () => void, ms: number) => {
      timeouts.push(setTimeout(fn, ms));
    };

    // T=0: start counting phase (stat springs begin)
    setIntro((s) => ({ ...s, phase: "counting" }));

    // T=400: first row each
    t(() => setIntro((s) => ({ ...s, visibleTasks: 1, visibleSubmissions: 1 })), 400);

    // T=800: second row each + first unread thread
    t(() => {
      setIntro((s) => ({ ...s, visibleTasks: 2, visibleSubmissions: 2, unreadCount: 1 }));
      if (introUnreadIds[0]) {
        setUnreadThreadIds(new Set([introUnreadIds[0]]));
      }
    }, 800);

    // T=1200: third row each + second unread thread
    t(() => {
      setIntro((s) => ({ ...s, visibleTasks: 3, visibleSubmissions: 3, unreadCount: 2 }));
      setUnreadThreadIds(new Set(introUnreadIds));
    }, 1200);

    // T=1800: done
    t(() => setIntro((s) => ({ ...s, phase: "done" })), 1800);

    return () => timeouts.forEach(clearTimeout);
  }, [introUnreadIds]);

  const navigate = useCallback((newRoute: string) => {
    setRoute((currentRoute) => {
      setHistory((prev) => [...prev, currentRoute]);
      return newRoute;
    });
  }, []);

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
    <ArenaContext.Provider value={{ role, setRole, route, navigate, goBack, urlPath, intro: effectiveIntro, unreadThreadIds, markThreadRead }}>
      {children}
    </ArenaContext.Provider>
  );
}

export function useArena() {
  const ctx = useContext(ArenaContext);
  if (!ctx) throw new Error("useArena must be used within ArenaProvider");
  return ctx;
}
