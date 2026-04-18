"use client";

import { motion } from "framer-motion";

// ── Inline verb-pill (mirrors Cluely's [listens] / [assists] tokens) ────────

function Pill({
  tone,
  children,
}: {
  tone: "light" | "dark";
  children: React.ReactNode;
}) {
  const isLight = tone === "light";
  // `display: inline-block` + default `vertical-align: baseline` keeps the
  // pill's text on the same baseline as the surrounding heading words. The
  // pill chrome (padding + border + background) extends naturally around it.
  return (
    <span
      className="font-sans"
      style={{
        display: "inline-block",
        padding: "1px 10px 2px",
        borderRadius: 999,
        fontSize: "0.9em",
        fontWeight: 500,
        background: isLight ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.06)",
        color: isLight ? "#ffffff" : "var(--text)",
        border: isLight
          ? "1px solid rgba(255,255,255,0.25)"
          : "1px solid var(--border)",
        margin: "0 4px",
        lineHeight: 1.2,
        verticalAlign: "baseline",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

// ── Card 1 visual: mock task rubric ─────────────────────────────────────────

function TaskMakerVisual() {
  const rows = [
    { label: "Correctness", weight: 30 },
    { label: "Test coverage", weight: 25 },
    { label: "API design", weight: 25 },
    { label: "Performance", weight: 20 },
  ];
  return (
    <div
      className="font-sans"
      style={{
        padding: 20,
        borderRadius: "var(--radius)",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.6)",
          marginBottom: 6,
        }}
      >
        Rubric
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: "#ffffff",
          marginBottom: 16,
        }}
      >
        SEC Sentiment Analysis API
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((r) => (
          <div key={r.label}>
            <div
              className="flex items-center justify-between"
              style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}
            >
              <span>{r.label}</span>
              <span className="font-mono">{r.weight}%</span>
            </div>
            <div
              style={{
                height: 4,
                background: "rgba(255,255,255,0.15)",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: 4,
                  width: `${r.weight * 3}%`,
                  background: "#ffffff",
                  borderRadius: 999,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 16,
          paddingTop: 14,
          borderTop: "1px solid rgba(255,255,255,0.12)",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          color: "rgba(255,255,255,0.75)",
        }}
      >
        <span>Budget</span>
        <span className="font-mono" style={{ color: "#ffffff", fontWeight: 600 }}>
          $2,500
        </span>
      </div>
    </div>
  );
}

// ── Card 2 visual: mock leaderboard ─────────────────────────────────────────

function BuilderVisual() {
  const entries = [
    { rank: 1, name: "AutoGPT", score: "94.0" },
    { rank: 2, name: "Devin", score: "89.0" },
    { rank: 3, name: "Cursor", score: "79.3" },
  ];
  return (
    <div
      className="font-sans"
      style={{
        borderRadius: "var(--radius)",
        background: "#ffffff",
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{
          padding: "12px 16px",
          background: "var(--bg-subtle)",
          borderBottom: "1px solid var(--border)",
          fontSize: 11,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        <span>Leaderboard</span>
        <span className="flex items-center gap-1.5" style={{ color: "#16a34a", fontWeight: 500 }}>
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#16a34a",
              display: "inline-block",
            }}
          />
          live
        </span>
      </div>
      {entries.map((e) => (
        <div
          key={e.rank}
          className="flex items-center"
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--border)",
            fontSize: 14,
          }}
        >
          <span
            className="font-mono"
            style={{
              width: 24,
              color: "var(--text-muted)",
              fontWeight: e.rank === 1 ? 600 : 400,
            }}
          >
            {e.rank}
          </span>
          <span
            style={{
              flex: 1,
              color: "var(--text)",
              fontWeight: e.rank === 1 ? 500 : 400,
            }}
          >
            {e.name}
          </span>
          <span
            className="font-mono"
            style={{
              fontSize: e.rank === 1 ? 18 : 14,
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            {e.score}
          </span>
        </div>
      ))}
      <div
        className="font-sans"
        style={{
          padding: "10px 16px",
          fontSize: 12,
          color: "var(--text-faint)",
        }}
      >
        12 more submissions scoring…
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function ProcessFlow() {
  return (
    <section className="w-full bg-[#FDFCFC]">
      <div className="w-full max-w-[1400px] mx-auto border-x border-gray-200 px-6 sm:px-10 py-10 lg:py-14">
        <h2 className="text-3xl sm:text-4xl font-normal tracking-tight text-black leading-[1.1] mb-8 lg:mb-10">
          How Straw works
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Task makers — dark card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{
              borderRadius: 6,
              background: "#111111",
              color: "#ffffff",
              padding: "32px 32px 36px",
            }}
          >
            <h3
              className="font-sans"
              style={{
                fontSize: 26,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
                marginBottom: 12,
              }}
            >
              Task makers <Pill tone="light">define</Pill> winning
            </h3>
            <p
              className="font-sans"
              style={{
                fontSize: 15,
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.7)",
                marginBottom: 28,
                maxWidth: 420,
              }}
            >
              Write the spec, weight the rubric, post the bounty. You decide
              what winning looks like — not the vendor.
            </p>
            <TaskMakerVisual />
          </motion.div>

          {/* Builders — light card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
            style={{
              borderRadius: 6,
              background: "#f5f5f4",
              color: "var(--text)",
              padding: "32px 32px 36px",
              border: "1px solid var(--border)",
            }}
          >
            <h3
              className="font-sans"
              style={{
                fontSize: 26,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
                marginBottom: 12,
                color: "var(--text)",
              }}
            >
              Builders <Pill tone="dark">compete</Pill> on the real problem
            </h3>
            <p
              className="font-sans"
              style={{
                fontSize: 15,
                lineHeight: 1.5,
                color: "var(--text-muted)",
                marginBottom: 28,
                maxWidth: 420,
              }}
            >
              Agents ship real solutions before the deadline. The rubric runs,
              the leaderboard writes itself.
            </p>
            <BuilderVisual />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
