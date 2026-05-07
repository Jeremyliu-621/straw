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

// Common dimensions: a 32x32 square wraps every icon (workspace avatar
// and every nav item) so they share an x-position and the active-state
// highlight can be a clean square in collapsed mode without ever
// extending past the rail edge.
const ICON_BOX = 32;
const NAV_ICON = 18;
const WORKSPACE_ICON = 16;
const ACTIVE_BG = "rgba(0,0,0,0.07)";
const HOVER_BG = "rgba(0,0,0,0.04)";

// In collapsed mode we want the icon-box rail-centered: with rail=64 and
// box=32, the box's left edge needs to sit at x=16. Nav has 12px outer
// padding, so the inner Link/button needs 4px left-padding (12+4=16).
const ROW_PAD_X_COLLAPSED = 4;
const ROW_PAD_X_EXPANDED = 12;
const ROW_PAD_Y = 4;

function NavLink({
  entry,
  collapsed,
  isActive,
}: {
  entry: NavItem;
  collapsed: boolean;
  isActive: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const Icon = entry.icon;

  // In collapsed mode the highlight lives on the icon square (so it
  // can't bleed past the 64px rail edge). In expanded mode it lives on
  // the whole row (full-width pill).
  const wrapperBg = collapsed
    ? isActive
      ? ACTIVE_BG
      : hovered
        ? HOVER_BG
        : "transparent"
    : "transparent";

  const linkBg = !collapsed
    ? isActive
      ? ACTIVE_BG
      : hovered
        ? HOVER_BG
        : "transparent"
    : "transparent";

  return (
    <Link
      href={entry.href}
      title={collapsed ? entry.label : undefined}
      aria-label={collapsed ? entry.label : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-3 font-sans"
      style={{
        padding: `${ROW_PAD_Y}px ${
          collapsed ? ROW_PAD_X_COLLAPSED : ROW_PAD_X_EXPANDED
        }px`,
        fontSize: "14px",
        fontWeight: isActive ? 500 : 400,
        color: isActive || hovered ? "var(--text)" : "var(--text-muted)",
        textDecoration: "none",
        background: linkBg,
        borderRadius: "var(--radius)",
        transition:
          "color 0.15s ease, background 0.15s ease, padding 0.18s ease",
      }}
    >
      <span
        style={{
          width: ICON_BOX,
          height: ICON_BOX,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: wrapperBg,
          borderRadius: "var(--radius)",
          flexShrink: 0,
          transition: "background 0.15s ease",
        }}
      >
        <Icon size={NAV_ICON} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <span
        style={{
          opacity: collapsed ? 0 : 1,
          transition: "opacity 0.12s ease",
          whiteSpace: "nowrap",
        }}
      >
        {entry.label}
      </span>
    </Link>
  );
}

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
      className="fixed flex flex-col"
      style={{
        top: "var(--inset-top, 0px)",
        left: "var(--inset-left, 0px)",
        height: "calc(100vh - var(--inset-top, 0px) - var(--inset-bottom, 0px))",
        width: `${sidebarWidth}px`,
        background: "var(--bg-subtle)",
        borderRight: "1px solid var(--border)",
        borderTop: "1px solid var(--frame-border-color, transparent)",
        borderLeft: "1px solid var(--frame-border-color, transparent)",
        borderBottom: "1px solid var(--frame-border-color, transparent)",
        borderTopLeftRadius: "var(--frame-radius, 0px)",
        borderBottomLeftRadius: "var(--frame-radius, 0px)",
        transition:
          "width 0.18s ease, background-color 0.3s ease, top 0.24s ease, left 0.24s ease, height 0.24s ease, border-radius 0.24s ease, border-color 0.24s ease",
        overflow: "hidden",
      }}
      aria-label="Primary navigation"
    >
      {/* Logo — height locked to TOPBAR_HEIGHT so its bottom border
          aligns with the top bar's. In collapsed mode the container
          width matches the rail (64px) and centers the short mark
          horizontally; in expanded mode it spans the full rail and
          left-anchors the wordmark. */}
      <div
        style={{
          height: `${TOPBAR_HEIGHT}px`,
          padding: collapsed ? "0" : "0 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
          width: collapsed
            ? `${SIDEBAR_WIDTH_COLLAPSED}px`
            : `${SIDEBAR_WIDTH_EXPANDED}px`,
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

      {/* Workspace switcher — fixed expanded layout regardless of
          collapse state. The 240px row is naturally clipped by the
          rail's overflow:hidden when the rail is 64px, so the icon
          stays anchored at its expanded x-position and the label
          fades out of view. No "crash to centre" jolt. */}
      <div
        ref={dropdownRef}
        style={{
          padding: "12px 12px 0",
          position: "relative",
          width: `${SIDEBAR_WIDTH_EXPANDED}px`,
        }}
      >
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          aria-label={`Workspace: ${activeWorkspace.label}. Click to switch.`}
          className="flex items-center gap-3 font-sans"
          style={{
            width: "100%",
            // Padding matches NavLink so the avatar's x-position is
            // identical to the nav icon-boxes below in both states.
            padding: `${ROW_PAD_Y}px ${
              collapsed ? ROW_PAD_X_COLLAPSED : ROW_PAD_X_EXPANDED
            }px`,
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--text)",
            // Pill carries the main-content background tone (var(--bg))
            // against the slightly-darker sidebar (var(--bg-subtle)),
            // matching the ElevenLabs workspace switcher.
            // Inset box-shadow border (instead of `border: 1px solid`)
            // so showing/hiding the outline never shifts inner content
            // by 1px. Dropped in collapsed mode where the rail clip
            // would make the right edge disappear awkwardly.
            background: !collapsed ? "var(--bg)" : "transparent",
            boxShadow: !collapsed ? "inset 0 0 0 1px var(--border)" : "none",
            border: "none",
            borderRadius: "var(--radius)",
            cursor: "pointer",
            textAlign: "left",
            transition:
              "background 0.15s ease, box-shadow 0.18s ease, padding 0.18s ease",
          }}
        >
          <div
            className="flex items-center justify-center"
            style={{
              width: ICON_BOX,
              height: ICON_BOX,
              borderRadius: "var(--radius)",
              background: "var(--accent)",
              color: "var(--inverse-text)",
              flexShrink: 0,
            }}
          >
            <ActiveIcon size={WORKSPACE_ICON} strokeWidth={1.5} />
          </div>
          {/* Label + chevron stay in the markup so screen readers can
              still read the workspace name; they're just clipped out
              of view when the rail is 64px. */}
          <span
            className="flex-1 truncate"
            style={{ opacity: collapsed ? 0 : 1, transition: "opacity 0.12s ease" }}
          >
            {activeWorkspace.label}
          </span>
          <ChevronsUpDown
            size={14}
            strokeWidth={1.5}
            style={{
              color: "var(--text-faint)",
              flexShrink: 0,
              opacity: collapsed ? 0 : 1,
              transition: "opacity 0.12s ease",
            }}
          />
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

      {/* Navigation — fixed expanded layout. Width is 240px regardless
          of collapse state; the rail's `overflow: hidden` clips the
          right-hand text. Icons stay anchored at x=24px from the rail
          edge whether collapsed or expanded — no "crash to centre"
          shift. ElevenLabs uses this exact pattern. */}
      <nav
        className="flex-1"
        style={{
          padding: "0 12px",
          marginTop: "8px",
          width: `${SIDEBAR_WIDTH_EXPANDED}px`,
        }}
      >
        {navItems.map((entry, idx) => {
          if (entry.kind === "section") {
            // Collapsed mode: a short divider rail-centered under the
            // icon column (matching ICON_BOX width) instead of a wide
            // bar that bleeds across the full rail. Vertical footprint
            // is padded so the divider takes up the same total height
            // as the expanded text label below — without that, the
            // icons under it would pop upward when the rail collapses.
            if (collapsed) {
              return (
                <div
                  key={`section-${idx}-${entry.label}`}
                  aria-hidden="true"
                  style={{
                    height: "1px",
                    background: "var(--border)",
                    width: `${ICON_BOX}px`,
                    marginLeft: `${ROW_PAD_X_COLLAPSED}px`,
                    // Match expanded: marginTop + text(12) + marginBottom(4)
                    // → marginTop + 1px line + marginBottom(15) keeps total
                    // height identical, so nothing shifts vertically.
                    marginTop: idx === 0 ? 0 : "16px",
                    marginBottom: "15px",
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
                  // Aligns the section caption with the x-position of the
                  // icon-boxes below (nav-pad 12 + ROW_PAD_X_EXPANDED).
                  paddingLeft: `${ROW_PAD_X_EXPANDED}px`,
                  fontSize: "10px",
                  // Lock line-height so the text block is deterministically
                  // 12px tall — the collapsed divider's marginBottom math
                  // depends on this.
                  lineHeight: "12px",
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
          const isActive = pathname === entry.href || pathname.startsWith(entry.href + "/");
          return (
            <NavLink
              key={entry.href}
              entry={entry}
              collapsed={collapsed}
              isActive={isActive}
            />
          );
        })}
      </nav>

      {/* User block intentionally removed — moved to TopBar avatar
          dropdown so the sidebar bottom can host other content
          (e.g. usage meter / upgrade CTA) later. */}
    </aside>
  );
}
