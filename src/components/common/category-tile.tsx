"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import type { LucideProps } from "lucide-react";

/**
 * Mood-tile pill — a compact pastel-gradient card with a label
 * (icon-pill) overlaid bottom-left. Modeled on the ElevenLabs Music
 * Marketplace category row. Lifts on hover; selected state inverts to
 * a solid border to read clearly across all themes.
 */
interface CategoryTileProps {
  label: string;
  Icon?: ComponentType<LucideProps>;
  /** CSS gradient string. Use `--orb-*` token pairs for theming. */
  gradient: string;
  href?: string;
  selected?: boolean;
  /** Click handler. Used when href is absent (filter-toggle mode). */
  onClick?: () => void;
}

export function CategoryTile({
  label,
  Icon,
  gradient,
  href,
  selected = false,
  onClick,
}: CategoryTileProps) {
  const inner = (
    <span
      className="font-sans"
      style={{
        position: "absolute",
        left: 12,
        bottom: 12,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 10px",
        background: "rgba(255,255,255,0.78)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 500,
        color: "#2a1f12",
        whiteSpace: "nowrap",
      }}
    >
      {Icon && <Icon size={12} strokeWidth={2} aria-hidden="true" />}
      {label}
    </span>
  );

  const sharedStyle = {
    position: "relative" as const,
    display: "block",
    width: "100%",
    minHeight: 100,
    height: "100%",
    background: gradient,
    borderRadius: 10,
    border: selected
      ? "2px solid var(--text)"
      : "1px solid rgba(0,0,0,0.06)",
    cursor: "pointer",
    overflow: "hidden",
    transition:
      "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
    textDecoration: "none",
    color: "inherit",
  };

  const hoverIn = (el: HTMLElement) => {
    el.style.transform = "translateY(-2px)";
    el.style.boxShadow = "0 6px 18px rgba(0,0,0,0.08)";
  };
  const hoverOut = (el: HTMLElement) => {
    el.style.transform = "translateY(0)";
    el.style.boxShadow = "none";
  };

  if (href) {
    return (
      <Link
        href={href}
        style={sharedStyle}
        onMouseEnter={(e) => hoverIn(e.currentTarget)}
        onMouseLeave={(e) => hoverOut(e.currentTarget)}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ ...sharedStyle, padding: 0 }}
      aria-pressed={selected}
      onMouseEnter={(e) => hoverIn(e.currentTarget)}
      onMouseLeave={(e) => hoverOut(e.currentTarget)}
    >
      {inner}
    </button>
  );
}

/**
 * Six pastel gradients, one per task category. The pairings rotate
 * through the orb palette so adjacent tiles feel distinct.
 */
export const CATEGORY_GRADIENTS = {
  "code-generation":
    "linear-gradient(135deg, var(--orb-blue) 0%, var(--orb-lavender) 100%)",
  automation:
    "linear-gradient(135deg, var(--orb-sage) 0%, var(--orb-blue) 100%)",
  "data-extraction":
    "linear-gradient(135deg, var(--orb-beige) 0%, var(--orb-sage) 100%)",
  evaluation:
    "linear-gradient(135deg, var(--orb-coral) 0%, var(--orb-beige) 100%)",
  creative:
    "linear-gradient(135deg, var(--orb-peach) 0%, var(--orb-coral) 100%)",
  other:
    "linear-gradient(135deg, var(--orb-lavender) 0%, var(--orb-peach) 100%)",
} as const;

export type CategoryKey = keyof typeof CATEGORY_GRADIENTS;
