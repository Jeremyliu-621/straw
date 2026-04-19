"use client";

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

// ── Card 1 visual: bounty poster ────────────────────────────────────────────

// Flat projection of the 3D AgentCharacter's head — same block geometry
// (skin cube + hair slab + two eye dots), rendered as SVG rects so it reads
// as a pixel portrait stamped onto the poster rather than a second WebGL
// canvas. Coordinates mirror the world-space boxes in AgentCharacter.tsx,
// flipped for SVG's y-down axis.
function PixelHead({ size = 70 }: { size?: number }) {
  const skin = "#d8a06e";
  const hair = "#3e2723";
  const eye = "#1a1a1a";
  return (
    <svg
      width={size}
      height={size}
      viewBox="-14 -17 28 30"
      shapeRendering="crispEdges"
      style={{ display: "block" }}
    >
      <rect x={-12} y={-15} width={24} height={6} fill={hair} />
      <rect x={-11} y={-11} width={22} height={22} fill={skin} />
      <rect x={-7} y={-3} width={4} height={4} fill={eye} />
      <rect x={3} y={-3} width={4} height={4} fill={eye} />
    </svg>
  );
}

function TaskMakerVisual() {
  const rows = [
    { label: "Correctness", weight: 30 },
    { label: "Test coverage", weight: 25 },
    { label: "API design", weight: 25 },
    { label: "Performance", weight: 20 },
  ];
  const serif = "Georgia, 'Times New Roman', serif";
  const mutedLabel = {
    fontSize: 11,
    letterSpacing: "0.14em",
    textTransform: "uppercase" as const,
    color: "#555",
  };
  return (
    <div
      className="font-sans"
      style={{
        padding: "18px 20px 20px",
        borderRadius: 4,
        background: "#ffffff",
        border: "1px solid var(--border)",
      }}
    >
      {/* Tiny poster-ism: a ticket header, not a banner */}
      <div
        style={{
          ...mutedLabel,
          paddingBottom: 10,
          borderBottom: "1px solid var(--border)",
          marginBottom: 14,
        }}
      >
        Bounty · Task #001
      </div>

      {/* Portrait + title */}
      <div
        style={{
          display: "flex",
          gap: 14,
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            flex: "0 0 auto",
            padding: 5,
            background: "var(--bg-subtle)",
            border: "1px solid var(--border)",
          }}
        >
          <PixelHead size={56} />
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            color: "#111",
            lineHeight: 1.25,
          }}
        >
          SEC Sentiment
          <br />
          Analysis API
        </div>
      </div>

      {/* Reward */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          paddingTop: 12,
          borderTop: "1px solid var(--border)",
          marginBottom: 14,
        }}
      >
        <span style={mutedLabel}>Reward</span>
        <span
          style={{
            fontFamily: serif,
            fontSize: 20,
            fontWeight: 700,
            color: "#111",
          }}
        >
          $2,500
        </span>
      </div>

      {/* Scored on */}
      <div
        style={{
          paddingTop: 12,
          borderTop: "1px solid var(--border)",
        }}
      >
        <div style={{ ...mutedLabel, marginBottom: 8 }}>Scored on</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between"
              style={{ fontSize: 13, color: "#111" }}
            >
              <span>{r.label}</span>
              <span className="font-mono" style={{ color: "#333" }}>
                {r.weight}%
              </span>
            </div>
          ))}
        </div>
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
            <BuilderDeskVisual />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
