"use client";

import { useState } from "react";

interface SubmissionLike {
  created_at: string;
}

const HEATMAP_COLORS = [
  "var(--bg-subtle)",
  "#dceadd",
  "#b3d4b6",
  "#7fb285",
  "#4d8a55",
];

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function SubmissionHeatmap({
  submissions,
}: {
  submissions: SubmissionLike[];
}) {
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    date: Date;
    count: number;
  } | null>(null);

  const counts = new Map<string, number>();
  for (const s of submissions) {
    const d = new Date(s.created_at);
    const key = dayKey(d);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(today.getDate() + (6 - today.getDay()));
  const start = new Date(end);
  start.setDate(end.getDate() - (53 * 7 - 1));

  const weeks: { date: Date; count: number; future: boolean }[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < 53; w++) {
    const week: { date: Date; count: number; future: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const future = cursor > today;
      const count = future ? 0 : counts.get(dayKey(cursor)) ?? 0;
      week.push({ date: new Date(cursor), count, future });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  const maxCount = Math.max(1, ...Array.from(counts.values()));
  const level = (count: number): number => {
    if (count <= 0) return 0;
    if (maxCount <= 1) return 4;
    const r = count / maxCount;
    if (r <= 0.25) return 1;
    if (r <= 0.5) return 2;
    if (r <= 0.75) return 3;
    return 4;
  };

  const cellSize = 11;
  const cellGap = 3;
  const cellStride = cellSize + cellGap;

  const monthLabels: { week: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, i) => {
    const m = week[0].date.getMonth();
    if (m !== lastMonth) {
      const prev = monthLabels[monthLabels.length - 1];
      if (!prev || i - prev.week >= 3) {
        monthLabels.push({ week: i, label: MONTH_LABELS[m] });
      }
      lastMonth = m;
    }
  });

  const totalSubmissions = submissions.length;
  const cutoff30 = new Date(today);
  cutoff30.setDate(today.getDate() - 30);
  const last30Count = submissions.filter((s) => new Date(s.created_at) >= cutoff30).length;

  return (
    <div
      data-heatmap-root
      style={{
        position: "relative",
        padding: "20px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
      }}
    >
      <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: `${cellGap}px`,
            paddingTop: "16px",
          }}
        >
          {DAY_LABELS.map((label, i) => (
            <div
              key={i}
              className="font-sans"
              style={{
                height: `${cellSize}px`,
                fontSize: "10px",
                color: "var(--text-muted)",
                lineHeight: `${cellSize}px`,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "relative",
              height: "16px",
              width: `${weeks.length * cellStride}px`,
            }}
          >
            {monthLabels.map(({ week, label }) => (
              <span
                key={`${week}-${label}`}
                className="font-sans"
                style={{
                  position: "absolute",
                  left: `${week * cellStride}px`,
                  fontSize: "10px",
                  color: "var(--text-muted)",
                }}
              >
                {label}
              </span>
            ))}
          </div>

          <div style={{ display: "flex", gap: `${cellGap}px` }}>
            {weeks.map((week, wi) => (
              <div
                key={wi}
                style={{ display: "flex", flexDirection: "column", gap: `${cellGap}px` }}
              >
                {week.map((cell, di) => (
                  <div
                    key={di}
                    onMouseEnter={(e) => {
                      if (cell.future) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const parentRect = e.currentTarget
                        .closest("[data-heatmap-root]")
                        ?.getBoundingClientRect();
                      setHover({
                        x: rect.left - (parentRect?.left ?? 0) + cellSize / 2,
                        y: rect.top - (parentRect?.top ?? 0),
                        date: cell.date,
                        count: cell.count,
                      });
                    }}
                    onMouseLeave={() => setHover(null)}
                    style={{
                      width: `${cellSize}px`,
                      height: `${cellSize}px`,
                      borderRadius: "2px",
                      background: cell.future
                        ? "transparent"
                        : HEATMAP_COLORS[level(cell.count)],
                      border: cell.future
                        ? "none"
                        : level(cell.count) === 0
                          ? "1px solid var(--border)"
                          : "none",
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div
          className="font-sans"
          style={{ fontSize: "12px", color: "var(--text-muted)" }}
        >
          {totalSubmissions} submissions in the last year &middot; {last30Count} in the last 30 days
        </div>
        <div
          className="flex items-center gap-2 font-sans"
          style={{ fontSize: "11px", color: "var(--text-muted)" }}
        >
          <span>Less</span>
          {HEATMAP_COLORS.map((color, i) => (
            <span
              key={i}
              style={{
                display: "inline-block",
                width: `${cellSize}px`,
                height: `${cellSize}px`,
                borderRadius: "2px",
                background: color,
                border: i === 0 ? "1px solid var(--border)" : "none",
              }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      {hover && (
        <div
          className="font-sans"
          style={{
            position: "absolute",
            left: `${hover.x}px`,
            top: `${hover.y - 8}px`,
            transform: "translate(-50%, -100%)",
            padding: "6px 10px",
            borderRadius: "6px",
            background: "var(--text)",
            color: "var(--bg)",
            fontSize: "12px",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {hover.count === 0
            ? "No submissions"
            : `${hover.count} submission${hover.count === 1 ? "" : "s"}`}
          <span style={{ opacity: 0.7 }}>
            {" "}
            &middot;{" "}
            {hover.date.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      )}
    </div>
  );
}
