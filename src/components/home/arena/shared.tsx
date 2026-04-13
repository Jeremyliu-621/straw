"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";

// Shared presentational components for the arena mini-app

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  open: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  evaluating: { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  closed: { bg: "#f4f4f4", text: "var(--text-muted)", border: "var(--border)" },
  completed: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  running: { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  pending: { bg: "#f4f4f4", text: "var(--text-faint)", border: "var(--border)" },
  draft: { bg: "#f4f4f4", text: "var(--text-faint)", border: "var(--border)" },
  failed: { bg: "#fef2f2", text: "var(--error)", border: "#fecaca" },
};

export function MockStatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.pending;
  return (
    <span
      className="inline-block font-sans"
      style={{
        fontSize: "11px",
        fontWeight: 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "3px 8px",
        borderRadius: "var(--radius)",
        background: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
      }}
    >
      {status}
    </span>
  );
}

export function StatCard({ label, value, mono }: { label: string; value: string | number; mono?: boolean }) {
  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        background: "var(--bg)",
      }}
    >
      <p
        className="font-sans"
        style={{
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: "8px",
        }}
      >
        {label}
      </p>
      <p
        className={mono ? "font-mono" : "font-sans"}
        style={{
          fontSize: "28px",
          fontWeight: 600,
          color: "var(--text)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </p>
    </div>
  );
}

// ── Animated stat card with comical overshoot ───────────────────────────────

const BOUNCY_SPRING = { stiffness: 120, damping: 10, mass: 1 };
const SMOOTH_SPRING = { stiffness: 60, damping: 20, mass: 1 };

function AnimatedNumber({
  target,
  active,
  decimals = 0,
  mono,
  overshoot = 3.5,
}: {
  target: number;
  active: boolean;
  decimals?: number;
  mono?: boolean;
  overshoot?: number;
}) {
  const motionVal = useMotionValue(0);
  const springConfig = overshoot > 1 ? BOUNCY_SPRING : SMOOTH_SPRING;
  const spring = useSpring(motionVal, springConfig);
  const display = useTransform(spring, (v) => {
    const clamped = Math.max(0, v);
    return decimals > 0 ? clamped.toFixed(decimals) : Math.round(clamped).toString();
  });
  const [text, setText] = useState(decimals > 0 ? "0.00" : "0");

  useEffect(() => {
    if (active) {
      if (overshoot > 1) {
        // Shoot way past, then settle back to target
        motionVal.set(target * overshoot);
        const timer = setTimeout(() => motionVal.set(target), 400);
        return () => clearTimeout(timer);
      }
      motionVal.set(target);
    }
  }, [active, target, motionVal, overshoot]);

  useEffect(() => {
    return display.on("change", (v) => setText(v));
  }, [display]);

  return (
    <motion.p
      className={mono ? "font-mono" : "font-sans"}
      style={{
        fontSize: "28px",
        fontWeight: 600,
        color: "var(--text)",
        letterSpacing: "-0.02em",
      }}
    >
      {text}
    </motion.p>
  );
}

export function AnimatedStatCard({
  label,
  value,
  mono,
  animate,
  overshoot = 3.5,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
  animate: boolean;
  overshoot?: number;
}) {
  const isNumeric = typeof value === "number" || (typeof value === "string" && !isNaN(parseFloat(value)) && value !== "--");
  const numericTarget = isNumeric ? parseFloat(String(value)) : 0;
  const hasDecimals = typeof value === "string" && value.includes(".");

  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        background: "var(--bg)",
      }}
    >
      <p
        className="font-sans"
        style={{
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: "8px",
        }}
      >
        {label}
      </p>
      {animate && isNumeric ? (
        <AnimatedNumber
          target={numericTarget}
          active={animate}
          decimals={hasDecimals ? 2 : 0}
          mono={mono}
          overshoot={overshoot}
        />
      ) : (
        <AnimatePresence mode="wait">
          <motion.p
            key={String(value)}
            className={mono ? "font-mono" : "font-sans"}
            initial={animate ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              fontSize: "28px",
              fontWeight: 600,
              color: "var(--text)",
              letterSpacing: "-0.02em",
            }}
          >
            {value}
          </motion.p>
        </AnimatePresence>
      )}
    </div>
  );
}

export const LABEL_STYLE = {
  fontSize: "11px",
  fontWeight: 500,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  color: "var(--text-muted)",
};

export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <span className="font-sans" style={LABEL_STYLE}>
        {children}
      </span>
    </div>
  );
}

export function BackLink({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="font-sans inline-flex items-center gap-1"
      style={{
        fontSize: "13px",
        color: "var(--text-muted)",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
        marginBottom: 24,
      }}
      onMouseOver={(e) => (e.currentTarget.style.color = "var(--text)")}
      onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m15 18-6-6 6-6" />
      </svg>
      {children}
    </button>
  );
}

export function TableHeader({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`flex items-center gap-4 px-4 py-2 ${className ?? ""}`}
      style={{ borderBottom: "1px solid var(--border)", ...style }}
    >
      {children}
    </div>
  );
}
