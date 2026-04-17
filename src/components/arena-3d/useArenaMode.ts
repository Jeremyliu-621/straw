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
const PURE_WHITE_KEY = "arena3d.pureWhite";
const VALID: ArenaMode[] = ["color", "bw", "bw-shadows", "bw-tint", "bw-shadows-tint"];

const DEFAULT_SHADOW_LIGHTNESS = 140; // 0 = dark shadows, 200 = shadows fully gone
const DEFAULT_PURE_WHITE = true;

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

function readPureWhite(): boolean {
  if (typeof window === "undefined") return DEFAULT_PURE_WHITE;
  const v = window.localStorage.getItem(PURE_WHITE_KEY);
  if (v === "true") return true;
  if (v === "false") return false;
  return DEFAULT_PURE_WHITE;
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (
      e.key === MODE_KEY ||
      e.key === SHADOW_KEY ||
      e.key === PURE_WHITE_KEY
    ) {
      onChange();
    }
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

const serverMode = (): ArenaMode => "color";
const serverLightness = (): number => DEFAULT_SHADOW_LIGHTNESS;
const serverPureWhite = (): boolean => DEFAULT_PURE_WHITE;

/** Arena visual mode + shadow-lightness slider + pure-white override,
 *  persisted to localStorage. */
export function useArenaMode(): {
  mode: ArenaMode;
  setMode: (m: ArenaMode) => void;
  shadowLightness: number;
  setShadowLightness: (n: number) => void;
  pureWhite: boolean;
  setPureWhite: (b: boolean) => void;
} {
  const mode = useSyncExternalStore(subscribe, readMode, serverMode);
  const shadowLightness = useSyncExternalStore(subscribe, readLightness, serverLightness);
  const pureWhite = useSyncExternalStore(subscribe, readPureWhite, serverPureWhite);

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

  const setPureWhite = useCallback((b: boolean) => {
    if (typeof window === "undefined") return;
    const s = b ? "true" : "false";
    window.localStorage.setItem(PURE_WHITE_KEY, s);
    window.dispatchEvent(new StorageEvent("storage", { key: PURE_WHITE_KEY, newValue: s }));
  }, []);

  return { mode, setMode, shadowLightness, setShadowLightness, pureWhite, setPureWhite };
}
