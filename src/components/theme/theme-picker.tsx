"use client";

// TODO: remove once the theme is picked. This is a temporary 3-segment
// toggle so Jeremy can compare light / warm-dim / dark side-by-side.

import { Sun, Coffee, Moon } from "lucide-react";
import { useTheme, type Theme } from "./theme-provider";

const OPTIONS: ReadonlyArray<{ id: Theme; label: string; Icon: typeof Sun }> = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "warm-dim", label: "Warm dim", Icon: Coffee },
  { id: "dark", label: "Dark", Icon: Moon },
];

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="group"
      aria-label="Theme"
      style={{
        display: "inline-flex",
        height: 30,
        padding: 2,
        gap: 1,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--bg-card)",
        flexShrink: 0,
      }}
    >
      {OPTIONS.map(({ id, label, Icon }) => {
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTheme(id)}
            aria-label={label}
            aria-pressed={active}
            title={label}
            className="flex items-center justify-center"
            style={{
              width: 26,
              height: 26,
              border: "none",
              borderRadius: "calc(var(--radius) - 1px)",
              background: active ? "var(--bg-subtle)" : "transparent",
              color: active ? "var(--text)" : "var(--text-muted)",
              cursor: "pointer",
              transition:
                "background-color 0.12s ease, color 0.12s ease",
            }}
            onMouseOver={(e) => {
              if (!active) e.currentTarget.style.color = "var(--text)";
            }}
            onMouseOut={(e) => {
              if (!active) e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <Icon size={13} strokeWidth={2} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
