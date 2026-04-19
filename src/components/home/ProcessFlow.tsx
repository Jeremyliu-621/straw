"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

// 3D builder-at-desk scene — SSR-off because it touches WebGL.
const BuilderDeskVisual = dynamic(() => import("./BuilderDeskVisual"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 180,
        borderRadius: "var(--radius)",
        background: "#FDFCFC",
        border: "1px solid var(--border)",
      }}
    />
  ),
});

// ── Inline verb-pill (mirrors Cluely's [listens] / [assists] tokens) ────────

function Pill({
  accentBg,
  children,
}: {
  accentBg: string;
  children: React.ReactNode;
}) {
  // Pastel accent bg + black outline + dark text — matches the Post-a-Task
  // / Browse-Agents button pattern. Baseline-aligned so the pill's text sits
  // on the same baseline as the surrounding heading words.
  return (
    <span
      className="font-sans"
      style={{
        display: "inline-block",
        padding: "1px 10px 2px",
        borderRadius: 999,
        fontSize: "0.9em",
        fontWeight: 500,
        background: accentBg,
        color: "#111",
        border: "1px solid #111",
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
  // Inner panel = neutral white, no accent — the accent now lives on the `define` pill.
  return (
    <div
      className="font-sans"
      style={{
        padding: 20,
        borderRadius: "var(--radius)",
        background: "#ffffff",
        border: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#555",
          marginBottom: 6,
        }}
      >
        Rubric
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: "#111",
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
              style={{ fontSize: 13, color: "#333", marginBottom: 4 }}
            >
              <span>{r.label}</span>
              <span className="font-mono">{r.weight}%</span>
            </div>
            <div
              style={{
                height: 4,
                background: "var(--bg-subtle)",
                borderRadius: 999,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: 4,
                  width: `${r.weight * 3}%`,
                  background: "#333",
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
          borderTop: "1px solid rgba(0,0,0,0.12)",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 13,
          color: "#333",
        }}
      >
        <span>Budget</span>
        <span className="font-mono" style={{ color: "#111", fontWeight: 600 }}>
          $2,500
        </span>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function ProcessFlow() {
  // Defer mounting the builder's WebGL canvas until the Builders card scrolls
  // into view. Avoids a two-canvas race on page load with the main arena in
  // PlaygroundWindow — when both mount simultaneously under dev HMR pressure,
  // the browser kills one context and the loser goes permanently blank.
  const [buildersInView, setBuildersInView] = useState(false);

  return (
    <section className="w-full bg-[#FDFCFC]">
      <div className="w-full max-w-[1400px] mx-auto border-x border-gray-200 px-6 sm:px-10 py-10 lg:py-14">
        <h2 className="text-3xl sm:text-4xl font-normal tracking-tight text-black leading-[1.1] mb-8 lg:mb-10">
          How Straw works
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Task makers — soft blue-tinted card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            style={{
              borderRadius: 6,
              backgroundColor: "transparent",
              color: "#111",
              padding: "32px 32px 36px",
              border: "1px solid #111",
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
                color: "#111111",
              }}
            >
              Task makers <Pill accentBg="#cfd5e8">define</Pill> winning
            </h3>
            <p
              className="font-sans"
              style={{
                fontSize: 15,
                lineHeight: 1.5,
                color: "#333",
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
            onViewportEnter={() => setBuildersInView(true)}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: "easeOut", delay: 0.08 }}
            style={{
              borderRadius: 6,
              backgroundColor: "transparent",
              color: "var(--text)",
              padding: "32px 32px 36px",
              border: "1px solid #111",
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
              Builders <Pill accentBg="#e0d6d0">compete</Pill> on the real problem
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
            {buildersInView ? (
              <BuilderDeskVisual />
            ) : (
              <div
                style={{
                  height: 180,
                  borderRadius: "var(--radius)",
                  background: "#FDFCFC",
                  border: "1px solid var(--border)",
                }}
              />
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
