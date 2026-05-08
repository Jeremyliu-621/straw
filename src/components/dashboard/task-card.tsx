"use client";

import Link from "next/link";
import { Calendar } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { computeDeadlineState } from "./rich-task-row";
import { CATEGORY_GRADIENTS } from "@/components/common/category-tile";
import type { CategoryKey } from "@/components/common/category-tile";

const FALLBACK_GRADIENT =
  "linear-gradient(135deg, var(--orb-beige) 0%, var(--orb-lavender) 100%)";

function categoryGradient(category: string): string {
  return CATEGORY_GRADIENTS[category as CategoryKey] ?? FALLBACK_GRADIENT;
}

export interface TaskCardProps {
  task: {
    id: string;
    title: string;
    category: string;
    status: string;
    deadline: string;
    budget_cents: number;
    eval_mode?: string;
    poster?: { name: string | null; avatar_url: string | null } | null;
  };
}

function PosterAvatar({
  name,
  avatar_url,
  size = 44,
}: {
  name: string | null;
  avatar_url: string | null;
  size?: number;
}) {
  const initial = (name ?? "?")[0].toUpperCase();
  const shared: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.85)",
    boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
    flexShrink: 0,
  };

  if (avatar_url) {
    return (
      <img
        src={avatar_url}
        alt={name ?? ""}
        style={{ ...shared, objectFit: "cover" }}
      />
    );
  }
  return (
    <div
      style={{
        ...shared,
        background: "rgba(255,255,255,0.35)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 600,
        color: "rgba(0,0,0,0.5)",
        letterSpacing: "-0.01em",
      }}
    >
      {initial}
    </div>
  );
}

export function TaskCard({ task }: TaskCardProps) {
  const deadline = computeDeadlineState(task.deadline);
  const gradient = categoryGradient(task.category);

  return (
    <Link
      href={`/tasks/${task.id}?from=dashboard`}
      className="font-sans"
      style={{
        display: "flex",
        flexDirection: "column",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--bg-card)",
        textDecoration: "none",
        color: "var(--text)",
        overflow: "hidden",
        transition: "border-color 0.14s ease, box-shadow 0.14s ease, transform 0.14s ease",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = "var(--border-strong)";
        e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.07)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Gradient banner — no avatar here, it straddles the fold below */}
      <div
        aria-hidden="true"
        style={{
          height: 68,
          background: gradient,
          flexShrink: 0,
        }}
      />

      {/* Body — rounded top panel overlapping the banner.
          The avatar is absolutely positioned so the 12px curve bisects it,
          half in the gradient, half in the white body. */}
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: "12px 12px 0 0",
          marginTop: -12,
          flex: 1,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          // Extra top padding when avatar is present — 22px (half of 44px avatar) + 12px gap
          padding: task.poster ? "34px 14px 16px" : "14px 14px 16px",
        }}
      >
        {/* Avatar centred on the curve */}
        {task.poster && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: -22,   // half of 44px → curve bisects the avatar
              left: 14,
              zIndex: 1,
            }}
          >
            <PosterAvatar
              name={task.poster.name}
              avatar_url={task.poster.avatar_url}
            />
          </div>
        )}
        {/* Status + deadline */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <StatusBadge status={task.status} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              color: deadline.urgent
                ? "var(--error)"
                : deadline.warning
                  ? "var(--warning)"
                  : "var(--text-muted)",
              fontVariantNumeric: "tabular-nums" as const,
            }}
            title={new Date(task.deadline).toLocaleString()}
          >
            <Calendar
              size={11}
              strokeWidth={2}
              style={{ color: deadline.urgent ? "var(--error)" : "var(--text-faint)" }}
              aria-hidden="true"
            />
            <span>{deadline.label}</span>
          </div>
        </div>

        {/* Title */}
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--text)",
            lineHeight: 1.4,
            margin: 0,
            flex: 1,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
            letterSpacing: "-0.01em",
          }}
        >
          {task.title}
        </h3>

        {/* Footer — category + budget */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            paddingTop: "10px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              color: "var(--text-faint)",
              letterSpacing: "0.04em",
              textTransform: "uppercase" as const,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {task.category}
          </span>
          <span
            className="font-mono"
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--text)",
              fontVariantNumeric: "tabular-nums" as const,
              flexShrink: 0,
            }}
          >
            ${(task.budget_cents / 100).toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  );
}
