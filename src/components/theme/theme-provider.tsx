"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

export type Theme = "light" | "warm-dim" | "dark";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "straw:theme";
const VALID: readonly Theme[] = ["light", "warm-dim", "dark"];

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const pathname = usePathname();

  // Hydrate from localStorage on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw && (VALID as readonly string[]).includes(raw)) {
        setThemeState(raw as Theme);
      }
    } catch {
      // localStorage may be blocked
    }
  }, []);

  // Apply theme as data-theme on <html>, BUT only on dashboard pages.
  // The landing page (and every other public surface) intentionally
  // doesn't theme — its colors are hardcoded. So we strip the
  // attribute on any non-dashboard route, even if the user has a
  // non-light theme stored in localStorage.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const isDashboard = pathname?.startsWith("/dashboard") ?? false;
    if (!isDashboard || theme === "light") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme, pathname]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
