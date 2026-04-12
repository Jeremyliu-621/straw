"use client";

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  draft: { bg: "#f4f4f4", text: "var(--text-faint)", border: "var(--border)" },
  open: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  evaluating: { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  closed: { bg: "#f4f4f4", text: "var(--text-muted)", border: "var(--border)" },
  pending: { bg: "#f4f4f4", text: "var(--text-faint)", border: "var(--border)" },
  running: { bg: "#fffbeb", text: "#d97706", border: "#fde68a" },
  completed: { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" },
  failed: { bg: "#fef2f2", text: "var(--error)", border: "#fecaca" },
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
