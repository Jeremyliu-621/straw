"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

const STORAGE_KEY = "straw:sidebar-collapsed";

/**
 * Provides the dashboard sidebar's collapse state to both the Sidebar
 * component and the TopBar (which has the toggle button). Persisted to
 * localStorage so the choice survives page navigations + reloads.
 *
 * Hydration note: we intentionally render the first paint as expanded
 * (collapsed=false) and read localStorage in an effect, swapping in
 * the stored value once hydration completes. Reading localStorage
 * synchronously inside useState would cause a server/client mismatch.
 */
export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);

  // Load persisted state on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "1") setCollapsedState(true);
    } catch {
      // localStorage may be blocked (private mode); fall back to expanded.
    }
  }, []);

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsedState((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ collapsed, toggle, setCollapsed }),
    [collapsed, toggle, setCollapsed]
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used inside <SidebarProvider>");
  }
  return ctx;
}

/** Width tokens — single source of truth for layout math. */
export const SIDEBAR_WIDTH_EXPANDED = 240;
export const SIDEBAR_WIDTH_COLLAPSED = 64;
export const TOPBAR_HEIGHT = 52;
