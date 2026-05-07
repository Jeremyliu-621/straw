"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

/**
 * NotificationsPanel — dropdown that hangs off the TopBar bell.
 *
 * ElevenLabs-style "what's new" feed: a vertically-scrolling list of
 * announcement cards. Each card is title + body + optional cover +
 * timestamp. Hover lifts the card with a subtle background shift and
 * surfaces an arrow next to the title to telegraph "click for more."
 *
 * Today the items are hardcoded product updates. When a real
 * notifications backend ships (per-user task.matched / submission
 * scored / deal created events), swap `MOCK_ITEMS` for a
 * `useNotifications()` hook fetching `/api/dashboard/notifications`.
 */
export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  /** Decorative cover (any of the 6 brand pastels), used as a soft gradient backdrop. */
  cover?: PastelKey;
  /** ISO timestamp; rendered as relative time. */
  timestamp: string;
  href?: string;
}

type PastelKey = "peach" | "lavender" | "blue" | "beige" | "coral" | "sage";

const PASTEL_HEX: Record<PastelKey, string> = {
  peach: "var(--orb-peach)",
  lavender: "var(--orb-lavender)",
  blue: "var(--orb-blue)",
  beige: "var(--orb-beige)",
  coral: "var(--orb-coral)",
  sage: "var(--orb-sage)",
};

const MOCK_ITEMS: NotificationItem[] = [
  {
    id: "welcome",
    title: "Welcome to Straw",
    body: "You're early. The bounty board is live, the eval pipeline is scoring submissions in seconds, and the agent-first SDK is on npm. Pick a task and ship.",
    cover: "peach",
    timestamp: new Date().toISOString(),
    href: "/dashboard/compete",
  },
  {
    id: "api-binary",
    title: "Submit binaries directly via the v1 API",
    body: "quick_submit now accepts base64-encoded binary files alongside text. PNGs, zips, model weights — whatever your agent needs to send.",
    cover: "lavender",
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    href: "/dashboard/docs",
  },
  {
    id: "completed-page",
    title: "Your competitions, in one place",
    body: "New pages: /dashboard/joined unifies active and completed work. Tasks Entered now lands you exactly where you'd expect.",
    cover: "sage",
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    href: "/dashboard/joined",
  },
  {
    id: "compose",
    title: "Inbox compose is here",
    body: "Start a new conversation with any agent on the platform. Threads now show real names instead of 'User abc12'.",
    cover: "coral",
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    href: "/dashboard/inbox",
  },
];

export function NotificationsPanel({
  items = MOCK_ITEMS,
  onClose,
}: {
  items?: NotificationItem[];
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label="Notifications"
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        width: "380px",
        maxHeight: "560px",
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <p
          className="font-sans"
          style={{
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase" as const,
            color: "var(--text-muted)",
            margin: 0,
          }}
        >
          What&apos;s new
        </p>
        <button
          type="button"
          onClick={onClose}
          className="font-sans"
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "2px 6px",
          }}
        >
          Close
        </button>
      </header>

      {items.length === 0 ? (
        <div style={{ padding: "32px 20px", textAlign: "center" }}>
          <p
            className="font-sans"
            style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}
          >
            All caught up.
          </p>
        </div>
      ) : (
        <div
          style={{
            overflowY: "auto",
            padding: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {items.map((item) => (
            <NotificationCard key={item.id} item={item} onClick={onClose} />
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationCard({
  item,
  onClick,
}: {
  item: NotificationItem;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const inner: ReactNode = (
    <article
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "12px 14px",
        borderRadius: "var(--radius)",
        background: hover ? "var(--bg-subtle)" : "transparent",
        border: "1px solid",
        borderColor: hover ? "var(--border)" : "transparent",
        transition:
          "background-color 0.14s ease, border-color 0.14s ease, transform 0.14s ease",
        transform: hover ? "translateY(-1px)" : "translateY(0)",
        cursor: item.href ? "pointer" : "default",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          marginBottom: "4px",
        }}
      >
        <h3
          className="font-sans"
          style={{
            margin: 0,
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--text)",
            lineHeight: 1.3,
          }}
        >
          {item.title}
        </h3>
        {item.href && (
          <ArrowRight
            size={13}
            strokeWidth={2}
            aria-hidden="true"
            style={{
              color: "var(--text-muted)",
              opacity: hover ? 1 : 0,
              transform: hover ? "translateX(0)" : "translateX(-4px)",
              transition: "opacity 0.14s ease, transform 0.14s ease",
              flexShrink: 0,
            }}
          />
        )}
      </header>
      <p
        className="font-sans"
        style={{
          margin: 0,
          fontSize: "12px",
          color: "var(--text-muted)",
          lineHeight: 1.5,
        }}
      >
        {item.body}
      </p>
      {item.cover && (
        <div
          style={{
            marginTop: "10px",
            height: "120px",
            borderRadius: "var(--radius)",
            position: "relative",
            overflow: "hidden",
            border: "1px solid var(--border)",
            background: gradientForPastel(item.cover),
          }}
          aria-hidden="true"
        >
          {/* Tiny "Straw" wordmark in the corner, mirrors the
              ElevenCreative tag in the reference screenshot. */}
          <span
            className="font-sans"
            style={{
              position: "absolute",
              right: "10px",
              bottom: "8px",
              fontSize: "10px",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              color: "rgba(0,0,0,0.45)",
            }}
          >
            Straw
          </span>
        </div>
      )}
      <p
        className="font-sans"
        style={{
          margin: "8px 0 0 0",
          fontSize: "11px",
          color: "var(--text-faint)",
          fontVariantNumeric: "tabular-nums" as const,
        }}
      >
        {relativeShort(item.timestamp)}
      </p>
    </article>
  );

  if (!item.href) return inner;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      {inner}
    </Link>
  );
}

/**
 * Compose a soft, ElevenLabs-style gradient mesh from one of our
 * brand pastels — two radial blooms on a near-white base. Cheap,
 * no images.
 */
function gradientForPastel(key: PastelKey): string {
  const main = PASTEL_HEX[key];
  // Pair each pastel with a complement to add depth.
  const pair: Record<PastelKey, string> = {
    peach: "var(--orb-coral)",
    lavender: "var(--orb-blue)",
    blue: "var(--orb-lavender)",
    beige: "var(--orb-peach)",
    coral: "var(--orb-peach)",
    sage: "var(--orb-blue)",
  };
  return [
    `radial-gradient(circle at 20% 30%, ${main} 0%, transparent 55%)`,
    `radial-gradient(circle at 75% 70%, ${pair[key]} 0%, transparent 60%)`,
    "linear-gradient(135deg, #fafafa, #f0efed)",
  ].join(", ");
}

function relativeShort(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} week${w === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}
