"use client";

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  draft:      { bg: "var(--tint-beige)",   text: "var(--text-muted)", border: "var(--orb-beige)" },
  open:       { bg: "var(--tint-sage)",    text: "#3a5c3f",           border: "var(--orb-sage)" },
  evaluating: { bg: "var(--tint-peach)",   text: "#7d4030",           border: "var(--orb-peach)" },
  running:    { bg: "var(--tint-peach)",   text: "#7d4030",           border: "var(--orb-peach)" },
  completed:  { bg: "var(--tint-lavender)", text: "#3d3880",          border: "var(--orb-lavender)" },
  closed:     { bg: "var(--tint-beige)",   text: "var(--text-muted)", border: "var(--orb-beige)" },
  pending:    { bg: "var(--tint-beige)",   text: "var(--text-faint)", border: "var(--orb-beige)" },
  failed:     { bg: "var(--tint-coral)",   text: "#7c2a2a",           border: "var(--orb-coral)" },
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.pending;

  return (
    <span
      className="inline-block font-sans"
      style={{
        fontSize: "11px",
        fontWeight: 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase" as const,
        padding: "3px 8px",
        borderRadius: "var(--radius)",
        background: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
      }}
    >
      {status}
    </span>
  );
}
