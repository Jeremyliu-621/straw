"use client";

import { useState } from "react";
import {
  ClipboardList,
  User,
  Inbox,
  Code2,
  Bot,
  Building2,
  ChevronsUpDown,
  LogOut,
} from "lucide-react";
import { useArena } from "./ArenaProvider";

const AGENT_NAV = [
  { label: "Tasks", route: "dashboard", icon: ClipboardList },
  { label: "Profile", route: "profile", icon: User },
  { label: "Inbox", route: "inbox", icon: Inbox },
  { label: "API", route: "api", icon: Code2 },
];

const COMPANY_NAV = [
  { label: "Tasks", route: "dashboard", icon: ClipboardList },
  { label: "Inbox", route: "inbox", icon: Inbox },
];

export default function MockSidebar() {
  const { role, setRole, route, navigate } = useArena();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  const isCompany = role === "company";
  const navItems = isCompany ? COMPANY_NAV : AGENT_NAV;
  const ActiveIcon = isCompany ? Building2 : Bot;
  const activeLabel = isCompany ? "Company" : "Builder";

  // Determine which nav item is active based on route
  const activeRoute = route.startsWith("task/") ? "dashboard" : route;

  return (
    <aside
      style={{
        width: 240,
        flexShrink: 0,
        background: "var(--bg-subtle)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "24px 20px 12px" }}>
        <img src="/strawlonglogo.png" alt="Straw" className="h-5 w-auto" />
      </div>

      {/* Workspace switcher */}
      <div style={{ padding: "0 12px", position: "relative" }}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 font-sans"
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--text)",
            background: dropdownOpen ? "var(--bg)" : "transparent",
            border: "1px solid",
            borderColor: dropdownOpen ? "var(--border)" : "transparent",
            borderRadius: "var(--radius)",
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.15s ease",
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: "var(--accent)",
              color: "var(--inverse-text)",
              flexShrink: 0,
            }}
          >
            <ActiveIcon size={14} strokeWidth={1.5} />
          </div>
          <span style={{ flex: 1 }}>{activeLabel}</span>
          <ChevronsUpDown size={14} strokeWidth={1.5} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div
            className="font-sans"
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 12,
              right: 12,
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
              zIndex: 50,
              padding: 4,
              overflow: "hidden",
            }}
          >
            {[
              { id: "company", label: "Company", description: "Post tasks and evaluate agents", icon: Building2 },
              { id: "agent_builder", label: "Builder", description: "Build and submit AI agents", icon: Bot },
            ].map((ws) => {
              const WsIcon = ws.icon;
              const isCurrent = ws.id === role;
              return (
                <button
                  key={ws.id}
                  onClick={() => {
                    setRole(ws.id as "company" | "agent_builder");
                    setDropdownOpen(false);
                  }}
                  className="flex items-center gap-3"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    fontSize: "13px",
                    color: "var(--text)",
                    background: isCurrent ? "var(--bg-subtle)" : "transparent",
                    border: "none",
                    borderRadius: "calc(var(--radius) - 2px)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "background 0.1s ease",
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = "var(--bg-subtle)"; }}
                  onMouseOut={(e) => { if (!isCurrent) e.currentTarget.style.background = "transparent"; }}
                >
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: isCurrent ? "var(--accent)" : "var(--accent-subtle)",
                      color: isCurrent ? "var(--inverse-text)" : "var(--accent)",
                      flexShrink: 0,
                    }}
                  >
                    <WsIcon size={14} strokeWidth={1.5} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, lineHeight: "1.3" }}>{ws.label}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-faint)", lineHeight: "1.3", marginTop: 1 }}>
                      {ws.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ padding: "0 12px", marginTop: 8 }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeRoute === item.route;
          const isHovered = hoveredNav === item.label;
          return (
            <div
              key={item.label}
              className="flex items-center gap-3 font-sans"
              style={{
                padding: "8px 12px",
                fontSize: "14px",
                fontWeight: isActive ? 500 : 400,
                color: isActive || isHovered ? "var(--text)" : "var(--text-muted)",
                background: isActive
                  ? "rgba(0,0,0,0.07)"
                  : isHovered
                    ? "rgba(0,0,0,0.04)"
                    : "transparent",
                borderRadius: "var(--radius)",
                transition: "all 0.15s ease",
                cursor: "pointer",
              }}
              onClick={() => {
                navigate(item.route);
                setDropdownOpen(false);
              }}
              onMouseOver={() => setHoveredNav(item.label)}
              onMouseOut={() => setHoveredNav(null)}
            >
              <Icon size={18} strokeWidth={1.5} />
              {item.label}
            </div>
          );
        })}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* User section */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          className="flex items-center justify-center font-sans"
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "var(--accent-subtle)",
            color: "var(--accent)",
            fontSize: "12px",
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          SA
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="font-sans truncate" style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)", margin: 0 }}>
            Sarah Anderson
          </p>
          <div className="flex items-center gap-1 font-sans" style={{ fontSize: "12px", color: "var(--text-faint)", marginTop: 2 }}>
            <LogOut size={12} strokeWidth={1.5} />
            Sign out
          </div>
        </div>
      </div>
    </aside>
  );
}
