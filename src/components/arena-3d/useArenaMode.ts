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
const TINT_NORMAL_KEY = "arena3d.tintNormal";
const TINT_PURE_KEY = "arena3d.tintPureWhite";
const EDGE_KEY = "arena3d.edgeThreshold";
const VALID: ArenaMode[] = ["color", "bw", "bw-shadows", "bw-tint", "bw-shadows-tint"];

const DEFAULT_SHADOW_LIGHTNESS = 140; // 0 = dark shadows, 200 = shadows fully gone
const DEFAULT_PURE_WHITE = true;
// Tint = fraction of white in each mesh's tinted color (0 = full original,
// 1 = pure white). Kept separately for pure-white on vs off because ACES
// off makes the same tint read noticeably more vivid.
const DEFAULT_TINT_NORMAL = 0.5;
const DEFAULT_TINT_PURE_WHITE = 0.58;
// Edges-geometry threshold in degrees — lines only drawn where adjacent
// faces meet at >= this angle. Higher = sparser / cleaner.
const DEFAULT_EDGE_THRESHOLD = 15;

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

function readFloat(key: string, fallback: number, min: number, max: number): number {
  if (typeof window === "undefined") return fallback;
  const v = window.localStorage.getItem(key);
  const n = v != null ? parseFloat(v) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: StorageEvent) => {
    if (
      e.key === MODE_KEY ||
      e.key === SHADOW_KEY ||
      e.key === PURE_WHITE_KEY ||
      e.key === TINT_NORMAL_KEY ||
      e.key === TINT_PURE_KEY ||
      e.key === EDGE_KEY
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
const serverTintNormal = (): number => DEFAULT_TINT_NORMAL;
const serverTintPure = (): number => DEFAULT_TINT_PURE_WHITE;
const serverEdge = (): number => DEFAULT_EDGE_THRESHOLD;

/** Arena visual mode + shadow-lightness slider + pure-white override + tint
 *  amounts + edge threshold, persisted to localStorage. */
export function useArenaMode(): {
  mode: ArenaMode;
  setMode: (m: ArenaMode) => void;
  shadowLightness: number;
  setShadowLightness: (n: number) => void;
  pureWhite: boolean;
  setPureWhite: (b: boolean) => void;
  tintNormal: number;
  setTintNormal: (n: number) => void;
  tintPureWhite: number;
  setTintPureWhite: (n: number) => void;
  edgeThreshold: number;
  setEdgeThreshold: (n: number) => void;
} {
  const mode = useSyncExternalStore(subscribe, readMode, serverMode);
  const shadowLightness = useSyncExternalStore(subscribe, readLightness, serverLightness);
  const pureWhite = useSyncExternalStore(subscribe, readPureWhite, serverPureWhite);
  const tintNormal = useSyncExternalStore(
    subscribe,
    () => readFloat(TINT_NORMAL_KEY, DEFAULT_TINT_NORMAL, 0, 1),
    serverTintNormal
  );
  const tintPureWhite = useSyncExternalStore(
    subscribe,
    () => readFloat(TINT_PURE_KEY, DEFAULT_TINT_PURE_WHITE, 0, 1),
    serverTintPure
  );
  const edgeThreshold = useSyncExternalStore(
    subscribe,
    () => readFloat(EDGE_KEY, DEFAULT_EDGE_THRESHOLD, 0, 60),
    serverEdge
  );

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

  const makeFloatSetter = (key: string, min: number, max: number) =>
    (n: number) => {
      if (typeof window === "undefined") return;
      const clamped = Math.max(min, Math.min(max, n));
      const s = String(clamped);
      window.localStorage.setItem(key, s);
      window.dispatchEvent(new StorageEvent("storage", { key, newValue: s }));
    };

  const setTintNormal = useCallback(makeFloatSetter(TINT_NORMAL_KEY, 0, 1), []);
  const setTintPureWhite = useCallback(makeFloatSetter(TINT_PURE_KEY, 0, 1), []);
  const setEdgeThreshold = useCallback(makeFloatSetter(EDGE_KEY, 0, 60), []);

  return {
    mode,
    setMode,
    shadowLightness,
    setShadowLightness,
    pureWhite,
    setPureWhite,
    tintNormal,
    setTintNormal,
    tintPureWhite,
    setTintPureWhite,
    edgeThreshold,
    setEdgeThreshold,
  };
}
