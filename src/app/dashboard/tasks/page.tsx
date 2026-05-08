"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Code2,
  Bot,
  Database,
  CheckSquare,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { ComponentType } from "react";
import { TaskCard } from "@/components/dashboard/task-card";
import { Section, EmptyState } from "@/components/dashboard/section";
import { HeroStrip, HERO_GRADIENTS } from "@/components/common/hero-strip";
import {
  CategoryTile,
  CATEGORY_GRADIENTS,
  type CategoryKey,
} from "@/components/common/category-tile";

interface CategoryDef {
  key: CategoryKey;
  label: string;
  Icon: ComponentType<LucideProps>;
}

const CATEGORIES: CategoryDef[] = [
  { key: "code-generation", label: "Code generation", Icon: Code2 },
  { key: "automation", label: "Automation", Icon: Bot },
  { key: "data-extraction", label: "Data extraction", Icon: Database },
  { key: "evaluation", label: "Evaluation", Icon: CheckSquare },
  { key: "creative", label: "Creative", Icon: Sparkles },
  { key: "other", label: "Other", Icon: MoreHorizontal },
];

interface TaskSummary {
  id: string;
  title: string;
  category: string;
  status: string;
  deadline: string;
  budget_cents: number;
  eval_mode?: string;
}

type SortKey = "deadline" | "budget" | "newest";

/**
 * /dashboard/tasks — comprehensive open-tasks browser inside the
 * dashboard shell. The sidebar's Tools → Open Tasks entry lands here.
 *
 * Distinct from /dashboard/compete (focused, action-oriented top picks)
 * and the public /tasks (marketing-shell). This is the "I want to
 * browse what's available" surface — search bar, filters, sort, stats.
 *
 * Filtering happens client-side because /api/tasks already returns the
 * full open-task set (small). Server-side filtering would round-trip
 * on every keystroke. If the corpus grows past ~500 open tasks,
 * migrate to the cursor-paginated GET /api/v1/tasks and a debounced
 * server-side query.
 */
export default function OpenTasksPage() {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [evalMode, setEvalMode] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("deadline");

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => {
        setTasks(Array.isArray(data?.open) ? data.open : []);
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) if (t.category) set.add(t.category);
    return Array.from(set).sort();
  }, [tasks]);

  const stats = useMemo(() => {
    if (tasks.length === 0) return { total: 0, totalBudget: 0, urgent: 0 };
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    let totalBudget = 0;
    let urgent = 0;
    for (const t of tasks) {
      totalBudget += t.budget_cents;
      const deadlineMs = new Date(t.deadline).getTime();
      if (!Number.isNaN(deadlineMs) && deadlineMs - now < dayMs && deadlineMs > now) {
        urgent += 1;
      }
    }
    return { total: tasks.length, totalBudget, urgent };
  }, [tasks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = tasks.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (evalMode !== "all" && t.eval_mode !== evalMode) return false;
      if (q) {
        if (
          !t.title.toLowerCase().includes(q) &&
          !t.category.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
    matches.sort((a, b) => {
      switch (sortKey) {
        case "deadline":
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case "budget":
          return b.budget_cents - a.budget_cents;
        case "newest":
        default:
          return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
      }
    });
    return matches;
  }, [tasks, query, category, evalMode, sortKey]);

  return (
    <div>
      {/* Hero strip — pastel gradient banner with stats inline. */}
      <HeroStrip gradient={HERO_GRADIENTS.coolBlue} height={150}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: "24px",
            height: "100%",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h1
              className="font-sans"
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "var(--text)",
                lineHeight: 1.1,
              }}
            >
              Open Tasks
            </h1>
            <p
              className="font-sans"
              style={{
                margin: "6px 0 0",
                fontSize: "14px",
                lineHeight: 1.5,
                color: "rgba(10,14,26,0.7)",
              }}
            >
              Every open bounty. Pick a category to start, or browse them all.
            </p>
          </div>
          {!loading && tasks.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "24px",
                flexShrink: 0,
              }}
            >
              <HeaderStat label="Open" value={stats.total.toString()} dark />
              <HeaderStat
                label="Total budget"
                value={`$${(stats.totalBudget / 100).toLocaleString()}`}
                mono
                dark
              />
              <HeaderStat
                label="<24h"
                value={stats.urgent.toString()}
                tone={stats.urgent > 0 ? "warning" : undefined}
                dark
              />
            </div>
          )}
        </div>
      </HeroStrip>

      {/* Category tiles — six pastel mood-tiles, one per task category.
          Click toggles the existing `category` filter state. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "12px",
          marginTop: "20px",
          marginBottom: "24px",
        }}
      >
        {CATEGORIES.map((c) => (
          <CategoryTile
            key={c.key}
            label={c.label}
            Icon={c.Icon}
            gradient={CATEGORY_GRADIENTS[c.key]}
            selected={category === c.key}
            onClick={() => setCategory(category === c.key ? "all" : c.key)}
          />
        ))}
      </div>

      {/* Search + filter row */}
      {!loading && tasks.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginBottom: "16px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {/* Search */}
          <div
            style={{
              position: "relative",
              flex: "1 1 280px",
              minWidth: "200px",
              maxWidth: "420px",
            }}
          >
            <Search
              size={14}
              strokeWidth={2}
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-faint)",
                pointerEvents: "none",
              }}
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks…"
              className="font-sans outline-none"
              style={{
                width: "100%",
                padding: "8px 10px 8px 32px",
                fontSize: "13px",
                color: "var(--text)",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
              }}
            />
          </div>

          <FilterSelect
            label="Category"
            value={category}
            onChange={setCategory}
            options={[
              { value: "all", label: "All" },
              ...categories.map((c) => ({ value: c, label: c })),
            ]}
          />
          <FilterSelect
            label="Eval"
            value={evalMode}
            onChange={setEvalMode}
            options={[
              { value: "all", label: "All" },
              { value: "llm", label: "LLM" },
              { value: "container", label: "Container" },
              { value: "hybrid", label: "Hybrid" },
            ]}
          />
          <FilterSelect
            label="Sort"
            value={sortKey}
            onChange={(v) => setSortKey(v as SortKey)}
            options={[
              { value: "deadline", label: "Deadline (soonest)" },
              { value: "budget", label: "Budget (highest)" },
              { value: "newest", label: "Newest" },
            ]}
          />

          <span
            className="font-sans"
            style={{
              fontSize: "12px",
              color: "var(--text-faint)",
              marginLeft: "auto",
              fontVariantNumeric: "tabular-nums" as const,
            }}
          >
            {filtered.length} of {tasks.length}
          </span>
        </div>
      )}

      {/* Active-filter chips (only when something's filtered) */}
      {!loading &&
        tasks.length > 0 &&
        (query || category !== "all" || evalMode !== "all") && (
          <div
            style={{
              display: "flex",
              gap: "6px",
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: "16px",
            }}
          >
            {query && (
              <ChipClear label={`"${query}"`} onClear={() => setQuery("")} />
            )}
            {category !== "all" && (
              <ChipClear label={category} onClear={() => setCategory("all")} />
            )}
            {evalMode !== "all" && (
              <ChipClear label={evalMode} onClear={() => setEvalMode("all")} />
            )}
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
                setEvalMode("all");
              }}
              className="font-sans"
              style={{
                marginLeft: "4px",
                fontSize: "12px",
                color: "var(--text-muted)",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px 6px",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
              }}
            >
              Clear all
            </button>
          </div>
        )}

      <Section
        label="Results"
        count={!loading ? filtered.length : undefined}
      >
        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "12px",
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
              <div
                key={i}
                className="animate-pulse"
                style={{
                  height: "140px",
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search size={32} strokeWidth={1} style={{ color: "var(--text-faint)" }} />}
            title={
              tasks.length === 0
                ? "No open tasks"
                : "No tasks match your filters"
            }
            body={
              tasks.length === 0
                ? "Check back soon — companies are posting new challenges regularly."
                : "Try clearing a filter or widening the search."
            }
          />
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "12px",
            }}
          >
            {filtered.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label
      className="flex items-center gap-2 font-sans"
      style={{ fontSize: "12px", color: "var(--text-muted)" }}
    >
      <span
        style={{
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          color: "var(--text-faint)",
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="font-sans outline-none"
        style={{
          padding: "5px 10px",
          fontSize: "13px",
          color: "var(--text)",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          cursor: "pointer",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChipClear({
  label,
  onClear,
}: {
  label: string;
  onClear: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="font-sans"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 8px 4px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        color: "var(--text)",
        background: "var(--bg-subtle)",
        border: "1px solid var(--border)",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: "200px",
        }}
      >
        {label}
      </span>
      <span
        aria-hidden="true"
        style={{
          fontSize: "14px",
          lineHeight: 1,
          color: "var(--text-faint)",
        }}
      >
        ×
      </span>
    </button>
  );
}

function HeaderStat({
  label,
  value,
  mono = false,
  tone,
  dark = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "warning";
  /** Use ink colors instead of theme text — for placement on the gradient hero. */
  dark?: boolean;
}) {
  const value_color =
    tone === "warning"
      ? "var(--warning)"
      : dark
        ? "#0a0e1a"
        : "var(--text)";
  const label_color = dark ? "rgba(10,14,26,0.55)" : "var(--text-faint)";
  return (
    <div style={{ minWidth: "60px" }}>
      <p
        className="font-sans"
        style={{
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          color: label_color,
          margin: 0,
          marginBottom: "2px",
        }}
      >
        {label}
      </p>
      <p
        className={mono ? "font-mono" : "font-sans"}
        style={{
          fontSize: "20px",
          fontWeight: 600,
          color: value_color,
          letterSpacing: "-0.01em",
          fontVariantNumeric: mono ? ("tabular-nums" as const) : undefined,
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  );
}
