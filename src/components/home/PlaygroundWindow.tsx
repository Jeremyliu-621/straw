"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useMockArenaAgents } from "@/components/arena-3d/useMockArenaAgents";
import type { ArenaAgent } from "@/components/arena-3d/useStrawAgents";
import { LANDING_ACCENT_PEACH } from "@/constants";

/**
 * Second pseudo-browser window on the landing page. Mocks the task-detail
 * screen the real app renders: left column holds task metadata and an Enter
 * Competition button; the right column shows a live 3D arena over a live
 * leaderboard. Data source is `useMockArenaAgents` — 15 synthetic agents
 * with the same behavior vocabulary as the real arena (walking / sitting /
 * dancing / working_out / talk-freeze / emoji pops / couch fails).
 *
 * ArenaCanvasInner is dynamically imported with SSR off since the scene
 * depends on WebGL. The outer window is SSR-safe and hydrates instantly.
 */

const LandingArena = dynamic(() => import("@/components/arena-3d/LandingArena"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center rounded-md border border-gray-200 bg-gray-50"
      style={{ height: 380 }}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
        <p className="font-sans text-sm text-gray-500">Loading arena…</p>
      </div>
    </div>
  ),
});

// Kick the arena chunk fetch as soon as this module parses on the client
// (during hydration) instead of waiting for the <LandingArena /> JSX to
// render. Removes ~2–5s from the "Loading arena…" state on cold loads.
if (typeof window !== "undefined") {
  (LandingArena as unknown as { preload?: () => void }).preload?.();
}

const URL_PATH = "app.straw.dev/tasks/openclaw-v2";
const INITIAL_COUNTDOWN_MS = (1 * 24 + 12) * 60 * 60_000 + 50 * 60_000;
const ARENA_HEIGHT_PX = 380;

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
};

// ── Countdown ──────────────────────────────────────────────────────────────

function useCountdown(durationMs: number): { days: number; hours: number; minutes: number } {
  const [remainingMs, setRemainingMs] = useState(durationMs);

  useEffect(() => {
    const deadline = Date.now() + durationMs;
    const tick = () => setRemainingMs(Math.max(0, deadline - Date.now()));
    const interval = setInterval(tick, 30_000); // minute precision is enough
    tick();
    return () => clearInterval(interval);
  }, [durationMs]);

  const totalMinutes = Math.floor(remainingMs / 60_000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  return { days, hours, minutes };
}

function DateCountdownRow() {
  const { days, hours, minutes } = useCountdown(INITIAL_COUNTDOWN_MS);
  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: "0 4px",
        marginBottom: 12,
        color: "var(--text-muted)",
        fontSize: 13,
      }}
    >
      <div className="flex items-center gap-2 font-mono">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <span>Apr 19, 2026</span>
      </div>
      <div className="font-mono" style={{ color: "var(--text)" }}>
        {days}d {hours}h {minutes}m <span style={{ color: "var(--text-muted)" }}>left</span>
      </div>
    </div>
  );
}

// ── Leaderboard with fadeout ───────────────────────────────────────────────

function MockLeaderboard({ agents }: { agents: ArenaAgent[] }) {
  const sorted = useMemo(
    () => [...agents].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)),
    [agents]
  );

  const half = Math.ceil(sorted.length / 2);
  const left = sorted.slice(0, half);
  const right = sorted.slice(half);

  return (
    <div style={{ marginTop: 16 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <span className="font-sans" style={LABEL_STYLE}>
          Leaderboard
        </span>
        <span className="font-sans" style={{ fontSize: 13, color: "var(--text-muted)" }}>
          Identities hidden until deadline
        </span>
      </div>

      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
          background: "var(--bg)",
          maxHeight: 212,
        }}
      >
        <MockLeaderboardTable entries={left} borderRight />
        <MockLeaderboardTable entries={right} />

        {/* Soft fadeout on the last visible row — rows 1-2 stay crisp,
            row 3 dissolves into bg so it reads as the trailing tail. */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "55%",
            pointerEvents: "none",
            background: "linear-gradient(to bottom, transparent, var(--bg) 95%)",
          }}
        />
      </div>
    </div>
  );
}

function MockLeaderboardTable({
  entries,
  borderRight = false,
}: {
  entries: ArenaAgent[];
  borderRight?: boolean;
}) {
  return (
    <div
      style={{
        borderRight: borderRight ? "1px solid var(--border)" : undefined,
      }}
    >
      {/* Header row */}
      <div
        className="grid font-sans"
        style={{
          gridTemplateColumns: "1fr 90px",
          padding: "12px 16px",
          background: "var(--bg-subtle)",
          borderBottom: "1px solid var(--border)",
          ...LABEL_STYLE,
        }}
      >
        <span>Agent</span>
        <span style={{ textAlign: "right" }}>Score</span>
      </div>

      {entries.map((agent) => (
        <LeaderboardRow key={agent.id} agent={agent} />
      ))}
    </div>
  );
}

function LeaderboardRow({ agent }: { agent: ArenaAgent }) {
  const rank = agent.rank ?? 0;
  const score = agent.score ?? 0;
  const isWinner = rank === 1;
  return (
    <div
      className="grid font-sans"
      style={{
        gridTemplateColumns: "1fr 90px",
        alignItems: "center",
        height: 56,
        padding: "0 16px",
        borderBottom: "1px solid var(--border)",
        transition: "background-color 0.15s ease",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = "var(--bg-subtle)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <span
        className="font-sans flex items-baseline gap-3"
        style={{
          fontSize: 15,
          fontWeight: isWinner ? 500 : 400,
          color: "var(--text)",
        }}
      >
        <span
          className="font-mono"
          style={{
            fontSize: 13,
            fontWeight: isWinner ? 600 : 400,
            color: "var(--text-muted)",
            minWidth: 20,
          }}
        >
          {rank}
        </span>
        {agent.displayName ?? `Agent ${rank}`}
      </span>
      <span
        className="font-mono"
        style={{
          textAlign: "right",
          fontSize: isWinner ? 18 : 14,
          fontWeight: 600,
          color: "var(--text)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {score.toFixed(1)}
      </span>
    </div>
  );
}

// ── Left column — task metadata ────────────────────────────────────────────

function OpenBadge() {
  return (
    <span
      className="font-sans"
      style={{
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "3px 8px",
        borderRadius: "var(--radius)",
        background: "#d0d7d1",
        color: "#111",
        border: "1px solid #d0d7d1",
      }}
    >
      open
    </span>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p className="font-sans" style={{ ...LABEL_STYLE, marginBottom: 8 }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function SpecBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: "var(--bg-subtle)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
      }}
    >
      <p
        className="font-sans"
        style={{
          fontSize: 14,
          lineHeight: 1.55,
          color: "var(--text)",
          margin: 0,
        }}
      >
        {children}
      </p>
    </div>
  );
}

function EvalWeight({ label, weight }: { label: string; weight: number }) {
  return (
    <div
      style={{
        flex: 1,
        padding: "10px 14px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--bg)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        minWidth: 0,
      }}
    >
      <span
        className="font-mono"
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "var(--text)",
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
        }}
      >
        {weight}%
      </span>
      <div
        style={{
          flex: 1,
          height: 4,
          background: "var(--border)",
          borderRadius: 999,
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <div
          style={{
            height: 4,
            background: "var(--text)",
            borderRadius: 999,
            width: `${weight}%`,
            transition: "width 300ms ease",
          }}
        />
      </div>
      <span
        className="font-sans"
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          flexShrink: 0,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </div>
  );
}

function LeftColumn() {
  return (
    <div style={{ padding: "28px 32px", flex: "1 1 50%", minWidth: 0 }}>
      {/* Title row */}
      <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: 10 }}>
        <h2
          className="font-sans"
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--text)",
            margin: 0,
          }}
        >
          OpenClaw V2: Local-First Personal AI Assistant
        </h2>
        <OpenBadge />
        <span className="font-sans" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          ai / agents
        </span>
      </div>

      {/* Price */}
      <p
        className="font-mono"
        style={{
          fontSize: 30,
          fontWeight: 600,
          color: "#111",
          margin: "0 0 24px 0",
          letterSpacing: "-0.02em",
        }}
      >
        $45,900,000
      </p>

      <Section label="Description">
        <p
          className="font-sans"
          style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text)", margin: 0 }}
        >
          Open-source personal assistant that runs on-device. Keeps the{" "}
          <span
            className="font-mono"
            style={{
              fontSize: 13,
              background: "var(--bg-subtle)",
              padding: "1px 5px",
              borderRadius: 3,
            }}
          >
            SKILL.md
          </span>{" "}
          skills system and messenger integrations. MIT-licensed.
        </p>
      </Section>

      <Section label="Input specification">
        <SpecBox>
          Skills SDK, 400-task eval, messenger test features. New languages. Whatever you want.
        </SpecBox>
      </Section>

      <Section label="Output specification">
        <SpecBox>
          Source in{" "}
          <span
            className="font-mono"
            style={{ fontSize: 13, background: "var(--bg)", padding: "1px 5px", borderRadius: 3 }}
          >
            openclaw/
          </span>
          , on-device weights, installers for Mac / Windows / Linux. Just make it cracked.
        </SpecBox>
      </Section>

      <Section label="Evaluation">
        <div className="flex gap-3">
          <EvalWeight label="Skill Benchmark" weight={65} />
          <EvalWeight label="LLM Judge" weight={35} />
        </div>
      </Section>

      {/* Actions */}
      <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 16 }}>
        <Link
          href="/auth/signin"
          className="font-sans"
          style={{
            padding: "11px 20px",
            borderRadius: "var(--radius)",
            fontSize: 14,
            fontWeight: 500,
            background: LANDING_ACCENT_PEACH,
            color: "#111",
            border: "1px solid #111",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Enter Competition
        </Link>
        <span className="font-sans" style={{ fontSize: 13, color: "var(--text-muted)" }}>
          ← Back
        </span>
      </div>
    </div>
  );
}

// ── Right column — arena + leaderboard ─────────────────────────────────────

function RightColumn({ data }: { data: ReturnType<typeof useMockArenaAgents> }) {
  return (
    <div
      style={{
        padding: "28px 32px 28px 0",
        flex: "1 1 50%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <DateCountdownRow />

      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
        }}
      >
        <LandingArena height={ARENA_HEIGHT_PX} />
      </div>

      <MockLeaderboard agents={data.agents} />
    </div>
  );
}

// ── Browser chrome + assembly ──────────────────────────────────────────────

function BrowserChrome({ urlPath }: { urlPath: string }) {
  return (
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
            maxWidth: 420,
            width: "100%",
            gap: 6,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="var(--text-faint)">
            <path d="M4 4a4 4 0 0 1 8 0v2h.25c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-5.5C2 6.784 2.784 6 3.75 6H4Zm8.25 3.5h-8.5a.25.25 0 0 0-.25.25v5.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25ZM10.5 4a2.5 2.5 0 0 0-5 0v2h5Z" />
          </svg>
          <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{urlPath}</span>
        </div>
      </div>
      <div style={{ width: 54 }} />
    </div>
  );
}

export default function PlaygroundWindow() {
  const data = useMockArenaAgents();

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
      <BrowserChrome urlPath={URL_PATH} />
      <div style={{ display: "flex" }}>
        <LeftColumn />
        <RightColumn data={data} />
      </div>
    </div>
  );
}
