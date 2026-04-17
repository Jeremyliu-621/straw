"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ArenaMode =
  | "color"
  | "bw"
  | "bw-shadows"
  | "bw-tint"
  | "bw-shadows-tint";

const MODE_KEY = "arena3d.mode";
const SHADOW_KEY = "arena3d.shadowLightness";
const VALID: ArenaMode[] = ["color", "bw", "bw-shadows", "bw-tint", "bw-shadows-tint"];

const DEFAULT_SHADOW_LIGHTNESS = 140; // 0 = dark shadows, 200 = shadows fully gone

function readMode(): ArenaMode {
  if (typeof window === "undefined") return "color";
  const stored = window.localStorage.getItem(MODE_KEY);
  if (stored && (VALID as string[]).includes(stored)) return stored as ArenaMode;
  return "color";
}

function readLightness(): number {
  if (typeof window === "undefined") return DEFAULT_SHADOW_LIGHTNESS;
  const v = window.localStorage.getItem(SHADOW_KEY);
  const n = v != null ? parseFloat(v) : NaN;
  if (!Number.isFinite(n)) return DEFAULT_SHADOW_LIGHTNESS;
  return Math.max(0, Math.min(200, n));
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === MODE_KEY || e.key === SHADOW_KEY) onChange();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

const serverMode = (): ArenaMode => "color";
const serverLightness = (): number => DEFAULT_SHADOW_LIGHTNESS;

/** Arena visual mode + shadow-lightness slider, persisted to localStorage. */
export function useArenaMode(): {
  mode: ArenaMode;
  setMode: (m: ArenaMode) => void;
  shadowLightness: number;
  setShadowLightness: (n: number) => void;
} {
  const mode = useSyncExternalStore(subscribe, readMode, serverMode);
  const shadowLightness = useSyncExternalStore(subscribe, readLightness, serverLightness);

  const setMode = useCallback((m: ArenaMode) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(MODE_KEY, m);
    window.dispatchEvent(new StorageEvent("storage", { key: MODE_KEY, newValue: m }));
  }, []);

  const setShadowLightness = useCallback((n: number) => {
    if (typeof window === "undefined") return;
    const clamped = Math.max(0, Math.min(200, n));
    const s = String(clamped);
    window.localStorage.setItem(SHADOW_KEY, s);
    window.dispatchEvent(new StorageEvent("storage", { key: SHADOW_KEY, newValue: s }));
  }, []);

  return { mode, setMode, shadowLightness, setShadowLightness };
}
