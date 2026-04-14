"use client";

/**
 * Static, non-interactive preview of the dashboard shown behind the onboarding modal.
 * Purely decorative — no data fetching, no links, no interactivity.
 */
export function DashboardPreview() {
  return (
    <div
      className="flex min-h-screen select-none pointer-events-none"
      style={{
        background: "var(--bg)",
      }}
      aria-hidden="true"
    >
      {/* Fake sidebar */}
      <aside
        className="flex flex-col shrink-0"
        style={{
          width: "240px",
          background: "var(--bg-subtle)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <div style={{ padding: "24px 20px 12px" }}>
          <img src="/strawlonglogo.png" alt="" className="h-5 w-auto" />
        </div>
        <div style={{ padding: "8px 12px" }}>
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "var(--radius)",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "6px",
                background: "var(--accent)",
              }}
            />
            <div
              style={{
                height: "12px",
                width: "80px",
                background: "var(--border)",
                borderRadius: "4px",
              }}
            />
          </div>
        </div>
        <nav style={{ padding: "8px 12px" }}>
          {["My Tasks", "Inbox", "API", "Docs"].map((label, i) => (
            <div
              key={label}
              className="flex items-center gap-3"
              style={{
                padding: "8px 12px",
                fontSize: "14px",
                color: i === 0 ? "var(--text)" : "var(--text-muted)",
                background: i === 0 ? "rgba(0,0,0,0.07)" : "transparent",
                borderRadius: "var(--radius)",
                fontWeight: i === 0 ? 500 : 400,
              }}
            >
              <div
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "4px",
                  background: "currentColor",
                  opacity: 0.2,
                }}
              />
              {label}
            </div>
          ))}
        </nav>
      </aside>

      {/* Fake main content */}
      <main className="flex-1" style={{ padding: "32px" }}>
        <div className="mx-auto max-w-[1200px]">
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              paddingBottom: "24px",
              borderBottom: "1px solid var(--border)",
              marginBottom: "24px",
            }}
          >
            <div>
              <div
                style={{
                  height: "28px",
                  width: "260px",
                  background: "var(--border)",
                  borderRadius: "6px",
                  marginBottom: "10px",
                }}
              />
              <div
                style={{
                  height: "16px",
                  width: "320px",
                  background: "var(--border)",
                  borderRadius: "4px",
                  opacity: 0.6,
                }}
              />
            </div>
            <div
              style={{
                padding: "14px 28px",
                borderRadius: "var(--radius)",
                background: "var(--accent)",
                opacity: 0.7,
              }}
            >
              <div style={{ height: "16px", width: "80px" }} />
            </div>
          </div>

          {/* Stat cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "16px",
              marginBottom: "32px",
            }}
          >
            {["Active Tasks", "Submissions", "Total Budget", "Draft"].map((label) => (
              <div
                key={label}
                style={{
                  padding: "20px",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                    marginBottom: "8px",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    height: "28px",
                    width: "48px",
                    background: "var(--border)",
                    borderRadius: "4px",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Table header */}
          <div
            style={{
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: "12px",
            }}
          >
            Your Tasks
          </div>
          <div style={{ borderBottom: "1px solid var(--border)" }}>
            <div
              className="flex items-center gap-4"
              style={{
                padding: "8px 16px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              {["Title", "Category", "Status", "Budget"].map((col) => (
                <div
                  key={col}
                  className={col === "Title" ? "flex-1" : ""}
                  style={{
                    width: col !== "Title" ? "100px" : undefined,
                    fontSize: "11px",
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                  }}
                >
                  {col}
                </div>
              ))}
            </div>

            {/* Fake rows */}
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4"
                style={{
                  padding: "16px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div className="flex-1">
                  <div
                    style={{
                      height: "14px",
                      width: `${180 + i * 30}px`,
                      background: "var(--border)",
                      borderRadius: "4px",
                    }}
                  />
                </div>
                <div style={{ width: "100px" }}>
                  <div
                    style={{
                      height: "12px",
                      width: "60px",
                      background: "var(--border)",
                      borderRadius: "4px",
                      opacity: 0.6,
                    }}
                  />
                </div>
                <div style={{ width: "100px" }}>
                  <div
                    style={{
                      height: "20px",
                      width: "52px",
                      background: "var(--accent-subtle)",
                      borderRadius: "10px",
                    }}
                  />
                </div>
                <div style={{ width: "100px", textAlign: "right" }}>
                  <div
                    style={{
                      height: "14px",
                      width: "48px",
                      background: "var(--border)",
                      borderRadius: "4px",
                      marginLeft: "auto",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
