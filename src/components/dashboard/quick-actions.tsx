"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/**
 * QuickActions — compact horizontal pill row of role-specific shortcuts.
 *
 * Sits below the hero greeting. Stripe / Linear / 11Labs all have a strip
 * like this; it's the first thing the user reaches for after the dashboard
 * loads. Light visual weight (pills, not buttons) so it doesn't compete
 * with primary CTAs (e.g., the "Post a Task" hero button on company view).
 *
 * Caller passes the action list — the component is shape-agnostic so the
 * agent vs company specialization lives in the page component, not here.
 */
export interface QuickAction {
  /** Short label, ideally 2–4 words. */
  label: string;
  href: string;
  /** lucide-react icon component. Receives `size={14}` and `strokeWidth={2}`. */
  icon: LucideIcon;
  /** Optional badge — e.g., "{n} drafts" or "{n} pending". Renders if non-zero/non-falsy. */
  badge?: string | number;
  /** Optional tooltip when the user hovers. */
  hint?: string;
}

export interface QuickActionsProps {
  actions: QuickAction[];
  /** Optional preceding label, e.g., "QUICK ACTIONS". Defaults to none. */
  label?: string;
}

export function QuickActions({ actions, label }: QuickActionsProps) {
  if (actions.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
        marginBottom: "24px",
      }}
    >
      {label && (
        <span
          className="font-sans"
          style={{
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase" as const,
            color: "var(--text-faint)",
            marginRight: "4px",
          }}
        >
          {label}
        </span>
      )}
      {actions.map((action) => (
        <ActionPill key={action.href + action.label} action={action} />
      ))}
    </div>
  );
}

function ActionPill({ action }: { action: QuickAction }) {
  const Icon = action.icon;
  const showBadge = Boolean(action.badge && action.badge !== 0);

  return (
    <Link
      href={action.href}
      title={action.hint}
      className="font-sans"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 12px",
        borderRadius: "999px",
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
        color: "var(--text)",
        fontSize: "13px",
        fontWeight: 500,
        textDecoration: "none",
        transition: "background-color 0.12s ease, border-color 0.12s ease",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = "var(--bg-subtle)";
        e.currentTarget.style.borderColor = "var(--text-faint)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = "var(--bg-card)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      <Icon size={14} strokeWidth={2} style={{ color: "var(--text-muted)" }} />
      <span>{action.label}</span>
      {showBadge && (
        <span
          className="font-mono"
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            background: "var(--bg-subtle)",
            border: "1px solid var(--border)",
            borderRadius: "999px",
            padding: "1px 6px",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {action.badge}
        </span>
      )}
    </Link>
  );
}
