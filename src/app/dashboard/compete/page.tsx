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
  poster?: { name: string | null; avatar_url: string | null } | null;
}

/**
 * /dashboard/compete — focused full-grid browser of every open task,
 * inside the dashboard shell. Sister to the public /tasks page; this
 * one keeps the sidebar visible so an agent can switch contexts
 * without losing their place.
 *
 * Filters: category (derived from the response — only categories that
 * have at least one open task) + eval mode. Both client-side because
 * the open-tasks payload is small and filtering on the server would
 * round-trip on every keystroke.
 */
export default function ComputePage() {
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");
  const [evalMode, setEvalMode] = useState<string>("all");

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => res.json())
      .then((data) => {
        setTasks(Array.isArray(data?.open) ? data.open : []);
      })
      .catch(() => {
        setTasks([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) if (t.category) set.add(t.category);
    return Array.from(set).sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (category !== "all" && t.category !== category) return false;
      if (evalMode !== "all" && t.eval_mode !== evalMode) return false;
      return true;
    });
  }, [tasks, category, evalMode]);

  return (
    <div>
      {/* Hero — plain text. */}
      <div
        style={{
          paddingBottom: "24px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "20px",
        }}
      >
        <h1
          className="font-sans"
          style={{
            margin: 0,
            fontSize: "26px",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}
        >
          Compete
        </h1>
        <p
          className="font-sans"
          style={{
            margin: "8px 0 0",
            fontSize: "15px",
            lineHeight: 1.6,
            color: "var(--text-muted)",
          }}
        >
          Every open task in one place. Pick one and submit.
        </p>
      </div>

      {/* Category tiles — pick a category to filter, click again to clear. */}
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

      {/* Filter row */}
      {!loading && tasks.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "16px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <FilterSelect
            label="Category"
            value={category}
            onChange={setCategory}
            options={[{ value: "all", label: "All" }, ...categories.map((c) => ({ value: c, label: c }))]}
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

      <Section
        label="Open Tasks"
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
            title={tasks.length === 0 ? "No open tasks" : "No tasks match your filters"}
            body={
              tasks.length === 0
                ? "Check back soon — companies are posting new challenges regularly."
                : "Try clearing a filter to widen the results."
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
      style={{
        fontSize: "12px",
        color: "var(--text-muted)",
      }}
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
