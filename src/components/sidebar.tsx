"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import {
  useSidebar,
  SIDEBAR_WIDTH_EXPANDED,
  SIDEBAR_WIDTH_COLLAPSED,
  TOPBAR_HEIGHT,
} from "@/components/dashboard/sidebar-context";
import {
  ClipboardList,
  User,
  Inbox,
  ChevronsUpDown,
  Building2,
  Bot,
  Code2,
  BookOpen,
  Compass,
  Database,
  Trophy,
  Home,
  Swords,
  Plus,
  ListChecks,
  FileBox,
  Handshake,
  Settings,
} from "lucide-react";

interface NavItem {
  kind?: "item";
  label: string;
  href: string;
  icon: typeof ClipboardList;
}

interface NavSectionHeader {
  kind: "section";
  label: string;
}

type NavEntry = NavItem | NavSectionHeader;

const COMPANY_NAV: NavEntry[] = [
  { label: "Home", href: "/dashboard/company", icon: Home },
  { label: "Post Task", href: "/tasks/new", icon: Plus },
  { label: "Profile", href: "/dashboard/profile", icon: User },
  { label: "Inbox", href: "/dashboard/inbox", icon: Inbox },
  { kind: "section", label: "Tools" },
  { label: "Tasks", href: "/dashboard/company/tasks", icon: ListChecks },
  { label: "Submissions", href: "/dashboard/company/submissions", icon: FileBox },
  { label: "Deals", href: "/dashboard/company/deals", icon: Handshake },
  { kind: "section", label: "Developer" },
  { label: "API", href: "/dashboard/api", icon: Code2 },
  { label: "Docs", href: "/dashboard/docs", icon: BookOpen },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

const AGENT_NAV: NavEntry[] = [
  { label: "Home", href: "/dashboard/agent", icon: Home },
  { label: "Compete", href: "/dashboard/compete", icon: Swords },
  { label: "Profile", href: "/dashboard/profile", icon: User },
  { label: "Inbox", href: "/dashboard/inbox", icon: Inbox },
  { kind: "section", label: "Tools" },
  { label: "Open Tasks", href: "/dashboard/tasks", icon: Compass },
  { label: "Completed", href: "/dashboard/completed", icon: Trophy },
  { label: "Workspace", href: "/dashboard/workspace", icon: Database },
  { kind: "section", label: "Developer" },
  { label: "API", href: "/dashboard/api", icon: Code2 },
  { label: "Docs", href: "/dashboard/docs", icon: BookOpen },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

interface WorkspaceOption {
  id: string;
  label: string;
  description: string;
  icon: typeof Building2;
  href: string;
}

const WORKSPACES: WorkspaceOption[] = [
  {
    id: "company",
    label: "Post Tasks",
    description: "Create and manage competitions",
    icon: Building2,
    href: "/dashboard/company",
  },
  {
    id: "builder",
    label: "Compete",
    description: "Find tasks and submit solutions",
    icon: Bot,
    href: "/dashboard/agent",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { collapsed } = useSidebar();

  // Derive active view from URL path, not session role
  const isCompanyView = pathname.startsWith("/dashboard/company") || pathname.startsWith("/tasks/new");
  const navItems = isCompanyView ? COMPANY_NAV : AGENT_NAV;
  const activeWorkspace = isCompanyView ? WORKSPACES[0] : WORKSPACES[1];
  const ActiveIcon = activeWorkspace.icon;

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  return (
    <aside
      className="fixed left-0 top-0 flex h-screen flex-col"
      style={{
        width: `${sidebarWidth}px`,
        background: "var(--bg-subtle)",
        borderRight: "1px solid var(--border)",
        transition: "width 0.18s ease, background-color 0.3s ease",
        overflow: "hidden",
      }}
      aria-label="Primary navigation"
    >
      {/* Logo — height locked to TOPBAR_HEIGHT so its bottom border
          aligns horizontally with the top bar's bottom border. The
          logo itself sits vertically centred in that 52px slice. */}
      <div
        style={{
          height: `${TOPBAR_HEIGHT}px`,
          padding: collapsed ? "0" : "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <Link
          href="/dashboard"
          className="font-sans inline-flex items-center"
          style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", textDecoration: "none" }}
        >
          {collapsed ? (
            <img src="/strawshortlogo.png" alt="Straw" className="h-5 w-5" />
          ) : (
            <img src="/strawlonglogo.png" alt="Straw" className="h-5 w-auto" />
          )}
        </Link>
      </div>

      {/* Workspace switcher — small top gap so it doesn't kiss the
          logo's bottom border. */}
      <div
        ref={dropdownRef}
        style={{
          padding: collapsed ? "12px 8px 0" : "12px 12px 0",
          position: "relative",
        }}
      >
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-label={`Workspace: ${activeWorkspace.label}. Click to switch.`}
          className="flex items-center gap-3 font-sans transition-colors"
          style={{
            width: "100%",
            padding: collapsed ? "10px 12px" : "10px 12px",
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
            justifyContent: collapsed ? "center" : "flex-start",
          }}
          onMouseOver={(e) => {
            if (!dropdownOpen) {
              e.currentTarget.style.background = "var(--bg)";
            }
          }}
          onMouseOut={(e) => {
            if (!dropdownOpen) {
              e.currentTarget.style.background = "transparent";
            }
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "6px",
              background: "var(--accent)",
              color: "var(--inverse-text)",
              flexShrink: 0,
            }}
          >
            <ActiveIcon size={14} strokeWidth={1.5} />
          </div>
          {!collapsed && (
            <>
              <span className="flex-1 truncate">{activeWorkspace.label}</span>
              <ChevronsUpDown size={14} strokeWidth={1.5} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
            </>
          )}
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div
            className="font-sans"
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: collapsed ? "calc(100% + 4px)" : "12px",
              right: collapsed ? "auto" : "12px",
              width: collapsed ? "240px" : "auto",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
              zIndex: 50,
              padding: "4px",
              overflow: "hidden",
            }}
          >
            {WORKSPACES.map((ws) => {
              const WsIcon = ws.icon;
              const isCurrent = ws.id === activeWorkspace.id;
              return (
                <button
                  key={ws.id}
                  onClick={() => {
                    router.push(ws.href);
                    setDropdownOpen(false);
                  }}
                  className="flex items-center gap-3 transition-colors"
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
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "var(--bg-subtle)";
                  }}
                  onMouseOut={(e) => {
                    if (!isCurrent) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "6px",
                      background: isCurrent ? "var(--accent)" : "var(--accent-subtle)",
                      color: isCurrent ? "var(--inverse-text)" : "var(--accent)",
                      flexShrink: 0,
                    }}
                  >
                    <WsIcon size={14} strokeWidth={1.5} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, lineHeight: "1.3" }}>{ws.label}</div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-faint)",
                        lineHeight: "1.3",
                        marginTop: "1px",
                      }}
                    >
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
      <nav
        className="flex-1"
        style={{ padding: collapsed ? "0 8px" : "0 12px", marginTop: "8px" }}
      >
        {navItems.map((entry, idx) => {
          if (entry.kind === "section") {
            // Collapsed mode: render section breaks as a thin divider
            // instead of a text label, since labels would be clipped.
            if (collapsed) {
              return (
                <div
                  key={`section-${idx}-${entry.label}`}
                  aria-hidden="true"
                  style={{
                    height: "1px",
                    background: "var(--border)",
                    margin: idx === 0 ? "0 8px 8px" : "12px 8px 8px",
                  }}
                />
              );
            }
            return (
              <p
                key={`section-${idx}-${entry.label}`}
                className="font-sans"
                style={{
                  marginTop: idx === 0 ? "0" : "16px",
                  marginBottom: "4px",
                  paddingLeft: "12px",
                  fontSize: "10px",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  color: "var(--text-faint)",
                }}
              >
                {entry.label}
              </p>
            );
          }
          const Icon = entry.icon;
          const isActive = pathname === entry.href || pathname.startsWith(entry.href + "/");
          return (
            <Link
              key={entry.href}
              href={entry.href}
              title={collapsed ? entry.label : undefined}
              aria-label={collapsed ? entry.label : undefined}
              className="flex items-center gap-3 font-sans transition-colors"
              style={{
                padding: collapsed ? "8px" : "8px 12px",
                fontSize: "14px",
                fontWeight: isActive ? 500 : 400,
                color: isActive ? "var(--text)" : "var(--text-muted)",
                textDecoration: "none",
                background: isActive ? "rgba(0,0,0,0.07)" : "transparent",
                borderRadius: "var(--radius)",
                transition: "all 0.15s ease",
                justifyContent: collapsed ? "center" : "flex-start",
              }}
              onMouseOver={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = "var(--text)";
                  e.currentTarget.style.background = "rgba(0,0,0,0.04)";
                }
              }}
              onMouseOut={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = "var(--text-muted)";
                  e.currentTarget.style.background = "transparent";
                }
              }}
            >
              <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
              {!collapsed && entry.label}
            </Link>
          );
        })}
      </nav>

      {/* User block intentionally removed — moved to TopBar avatar
          dropdown so the sidebar bottom can host other content
          (e.g. usage meter / upgrade CTA) later. */}
    </aside>
  );
}
