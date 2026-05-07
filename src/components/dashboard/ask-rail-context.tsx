"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface AskRailContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const AskRailContext = createContext<AskRailContextValue | null>(null);

/**
 * Provides the dashboard's "Ask rail" open/closed state to the
 * TopBar (which has the toggle button) and the DashboardShell
 * (which applies the inset CSS vars + renders the rail itself).
 *
 * Not persisted: the rail starts closed on every mount. Persistence
 * would feel intrusive — most users don't want the dashboard to load
 * already shrunk into a card.
 */
export function AskRailProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);
  const setOpen = useCallback((next: boolean) => setOpenState(next), []);
  const toggle = useCallback(() => setOpenState((v) => !v), []);
  const value = useMemo(() => ({ open, setOpen, toggle }), [open, setOpen, toggle]);
  return <AskRailContext.Provider value={value}>{children}</AskRailContext.Provider>;
}

export function useAskRail(): AskRailContextValue {
  const ctx = useContext(AskRailContext);
  if (!ctx) {
    throw new Error("useAskRail must be used inside <AskRailProvider>");
  }
  return ctx;
}

/** Width of the rail when open. The dashboard's right inset is this + gutter on each side. */
export const ASK_RAIL_WIDTH = 440;
/** Gutter between the inset dashboard and the viewport edges (and between dashboard and rail). */
export const ASK_GUTTER = 12;
