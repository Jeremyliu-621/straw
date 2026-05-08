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
}: {
  name: string | null;
  avatar_url: string | null;
}) {
  const initial = (name ?? "?")[0].toUpperCase();
  if (avatar_url) {
    return (
      <img
        src={avatar_url}
        alt={name ?? ""}
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.8)",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: "50%",
        border: "2px solid rgba(255,255,255,0.8)",
        background: "rgba(255,255,255,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        fontWeight: 600,
        color: "rgba(0,0,0,0.55)",
        flexShrink: 0,
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
      style={{
        display: "flex",
        flexDirection: "column",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--bg-card)",
        textDecoration: "none",
        color: "var(--text)",
        overflow: "hidden",
        minHeight: "180px",
        transition: "border-color 0.12s ease, box-shadow 0.12s ease",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = "var(--text-faint)";
        e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.06)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Gradient banner */}
      <div
        aria-hidden="true"
        style={{
          height: 52,
          background: gradient,
          flexShrink: 0,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "flex-end",
          padding: "0 12px 8px",
        }}
      >
        {task.poster && (
          <PosterAvatar
            name={task.poster.name}
            avatar_url={task.poster.avatar_url}
          />
        )}
      </div>

      {/* Body */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          padding: "12px 14px 14px",
          flex: 1,
        }}
      >
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
            <span className="font-sans">{deadline.label}</span>
          </div>
        </div>

        {/* Title */}
        <h3
          className="font-sans"
          style={{
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--text)",
            lineHeight: 1.4,
            margin: 0,
            flex: 1,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
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
            paddingTop: "8px",
            borderTop: "1px solid var(--border)",
          }}
        >
          <span
            className="font-sans"
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
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
