"use client";

import { useState } from "react";

interface SubmissionLike {
  created_at: string;
}

// Pastel green ramp — pulled from the same sage palette as the rest
// of the dashboard (--tint-sage → --orb-sage → sage-badge). Quiet,
// not the saturated GitHub green.
const HEATMAP_COLORS = [
  "var(--bg-subtle)",
  "#e3eae4",
  "#d0d7d1",
  "#b8cdba",
  "#8db89c",
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

  // Streaks over the visible year window. `current` walks back from today
  // until a gap; `longest` is the longest run of submission days seen.
  let currentStreak = 0;
  const cursorBack = new Date(today);
  while ((counts.get(dayKey(cursorBack)) ?? 0) > 0) {
    currentStreak++;
    cursorBack.setDate(cursorBack.getDate() - 1);
  }
  let longestStreak = 0;
  let run = 0;
  const streakCursor = new Date(start);
  while (streakCursor <= today) {
    if ((counts.get(dayKey(streakCursor)) ?? 0) > 0) {
      run++;
      if (run > longestStreak) longestStreak = run;
    } else {
      run = 0;
    }
    streakCursor.setDate(streakCursor.getDate() + 1);
  }

  return (
    <div
      data-heatmap-root
      style={{
        position: "relative",
        padding: "20px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        display: "flex",
        flexWrap: "nowrap",
        gap: "56px",
        alignItems: "stretch",
        overflowX: "auto",
      }}
    >
      {/* Heatmap column — natural-width grid + Less/More legend. */}
      <div
        style={{
          flex: "0 0 auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
      <div style={{ display: "flex", gap: "8px" }}>
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

      </div>

      {/* KPI rail — tight inline rows, label left / value right. */}
      <div
        style={{
          flex: "0 0 200px",
          minWidth: "200px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignSelf: "stretch",
        }}
      >
        {[
          { label: "Submissions", value: totalSubmissions, unit: "" },
          { label: "Last 30 days", value: last30Count, unit: "" },
          { label: "Current streak", value: currentStreak, unit: currentStreak === 1 ? "day" : "days" },
          { label: "Longest streak", value: longestStreak, unit: longestStreak === 1 ? "day" : "days" },
        ].map(({ label, value, unit }) => (
          <div
            key={label}
            className="font-sans"
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </span>
            <span style={{ display: "flex", alignItems: "baseline", gap: "3px" }}>
              <span
                style={{
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "var(--text)",
                  letterSpacing: "-0.02em",
                }}
              >
                {value}
              </span>
              {unit && (
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>
                  {unit}
                </span>
              )}
            </span>
          </div>
        ))}
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
