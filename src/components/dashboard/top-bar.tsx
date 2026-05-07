"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import {
  PanelLeft,
  PanelLeftClose,
  Bell,
  MessageSquare,
  BookOpen,
  Sparkles,
  ChevronRight,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import {
  useSidebar,
  TOPBAR_HEIGHT,
  SIDEBAR_WIDTH_EXPANDED,
  SIDEBAR_WIDTH_COLLAPSED,
} from "./sidebar-context";
import { NotificationsPanel, SEEN_STORAGE_KEY } from "./notifications-panel";
import { useAskRail } from "./ask-rail-context";

/**
 * Title + optional crumb resolved from the current pathname. The dashboard
 * doesn't have deeply-nested routes today, so most paths render as a single
 * title; nested ones (e.g. /dashboard/company/tasks) render as
 * "Company › Tasks". Plain string match — no fancy router-tree walking.
 */
function resolvePageTitle(pathname: string): { primary: string; crumb?: string } {
  // Specific overrides first; fall back to last-segment Title-Case.
  const exact: Record<string, { primary: string; crumb?: string }> = {
    "/dashboard": { primary: "Home" },
    "/dashboard/agent": { primary: "Home" },
    "/dashboard/company": { primary: "Home" },
    "/dashboard/compete": { primary: "Compete" },
    "/dashboard/profile": { primary: "Profile" },
    "/dashboard/inbox": { primary: "Inbox" },
    "/dashboard/tasks": { primary: "Open Tasks" },
    "/dashboard/completed": { primary: "Completed" },
    "/dashboard/joined": { primary: "Your Competitions" },
    "/dashboard/workspace": { primary: "Workspace" },
    "/dashboard/api": { primary: "API" },
    "/dashboard/docs": { primary: "Docs" },
    "/dashboard/settings": { primary: "Settings" },
    "/dashboard/company/tasks": { primary: "Tasks", crumb: "Company" },
    "/dashboard/company/submissions": { primary: "Submissions", crumb: "Company" },
    "/dashboard/company/deals": { primary: "Deals", crumb: "Company" },
    "/tasks/new": { primary: "Post a Task" },
  };
  if (exact[pathname]) return exact[pathname];
  // Generic fallback: last path segment Title-Cased.
  const segs = pathname.split("/").filter(Boolean);
  const last = segs[segs.length - 1] ?? "Dashboard";
  const primary = last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { primary };
}

/**
 * Top bar — sticky horizontal strip across the dashboard. Holds the
 * collapse toggle, the current page title (with optional crumb), and the
 * right-side action cluster (Feedback / Docs / Ask / Bell / Avatar).
 *
 * Replaces the old "user block at the bottom of the sidebar" — the avatar
 * dropdown lives here now. ElevenLabs-style.
 */
export function TopBar() {
  const { collapsed, toggle } = useSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const { open: askOpen, toggle: toggleAsk } = useAskRail();

  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;
  const { primary, crumb } = resolvePageTitle(pathname);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (menuOpen || notifOpen) {
      document.addEventListener("mousedown", onClickOutside);
      return () => document.removeEventListener("mousedown", onClickOutside);
    }
  }, [menuOpen, notifOpen]);

  /**
   * Drives the unread-dot on the bell. Compares the latest
   * `published_at` from `/api/dashboard/notifications` against the
   * `last-seen` timestamp persisted by the panel. Re-runs when the
   * panel writes (via the same-tab "straw:notifications-seen" event)
   * or on `storage` events from other tabs.
   */
  useEffect(() => {
    let cancelled = false;
    async function recompute() {
      try {
        const res = await fetch("/api/dashboard/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const j: { items?: Array<{ publishedAt: string }> } = await res.json();
        const latest = j.items?.[0]?.publishedAt ?? null;
        if (!latest) {
          if (!cancelled) setHasUnread(false);
          return;
        }
        let seen: string | null = null;
        try {
          seen = window.localStorage.getItem(SEEN_STORAGE_KEY);
        } catch {
          seen = null;
        }
        if (!cancelled) setHasUnread(!seen || seen < latest);
      } catch {
        // Network failure — leave dot in its current state.
      }
    }
    recompute();
    function onSeen() {
      setHasUnread(false);
    }
    function onStorage(e: StorageEvent) {
      if (e.key === SEEN_STORAGE_KEY) recompute();
    }
    window.addEventListener("straw:notifications-seen", onSeen);
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("straw:notifications-seen", onSeen);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const initials = (session?.user?.name ?? "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header
      className="fixed"
      style={{
        top: "var(--inset-top, 0px)",
        left: `calc(var(--inset-left, 0px) + ${sidebarWidth}px)`,
        right: "var(--inset-right, 0px)",
        height: `${TOPBAR_HEIGHT}px`,
        background: "var(--bg)",
        borderBottom: "1px solid var(--border)",
        borderTop: "1px solid var(--frame-border-color, transparent)",
        borderRight: "1px solid var(--frame-border-color, transparent)",
        borderTopRightRadius: "var(--frame-radius, 0px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "0 16px",
        zIndex: 30,
        transition:
          "left 0.18s ease, top 0.24s ease, right 0.24s ease, border-radius 0.24s ease, border-color 0.24s ease",
      }}
    >
      {/* Left — toggle + page title */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="flex items-center justify-center"
          style={{
            width: "30px",
            height: "30px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            background: "var(--bg-card)",
            color: "var(--text-muted)",
            cursor: "pointer",
            flexShrink: 0,
            transition: "background-color 0.12s ease, color 0.12s ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "var(--bg-subtle)";
            e.currentTarget.style.color = "var(--text)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "var(--bg-card)";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          {collapsed ? (
            <PanelLeft size={14} strokeWidth={2} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={14} strokeWidth={2} aria-hidden="true" />
          )}
        </button>

        <nav
          aria-label="Breadcrumb"
          className="flex items-center font-sans"
          style={{ minWidth: 0, gap: "6px" }}
        >
          {crumb && (
            <>
              <span
                style={{
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {crumb}
              </span>
              <ChevronRight
                size={12}
                strokeWidth={2}
                style={{ color: "var(--text-faint)", flexShrink: 0 }}
                aria-hidden="true"
              />
            </>
          )}
          <span
            style={{
              fontSize: "14px",
              fontWeight: 500,
              color: "var(--text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {primary}
          </span>
        </nav>
      </div>

      {/* Right — actions + avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
        <TopBarPill icon={<MessageSquare size={13} strokeWidth={2} aria-hidden="true" />} label="Feedback" href="mailto:hello@straw.wiki?subject=Straw%20feedback" />
        <TopBarPill icon={<BookOpen size={13} strokeWidth={2} aria-hidden="true" />} label="Docs" href="/dashboard/docs" />
        {/* Ask — toggles the global AskRail (rendered by DashboardShell). */}
        <button
          type="button"
          onClick={toggleAsk}
          aria-label="Ask Straw"
          aria-expanded={askOpen}
          className="font-sans"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            height: "30px",
            padding: "0 11px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            background: askOpen ? "var(--bg-subtle)" : "var(--bg-card)",
            color: askOpen ? "var(--text)" : "var(--text-muted)",
            fontSize: "12px",
            fontWeight: 500,
            whiteSpace: "nowrap",
            cursor: "pointer",
            transition:
              "background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease",
          }}
          onMouseOver={(e) => {
            if (!askOpen) {
              e.currentTarget.style.background = "var(--bg-subtle)";
              e.currentTarget.style.color = "var(--text)";
              e.currentTarget.style.borderColor = "var(--text-faint)";
            }
          }}
          onMouseOut={(e) => {
            if (!askOpen) {
              e.currentTarget.style.background = "var(--bg-card)";
              e.currentTarget.style.color = "var(--text-muted)";
              e.currentTarget.style.borderColor = "var(--border)";
            }
          }}
        >
          <Sparkles size={13} strokeWidth={2} aria-hidden="true" />
          <span>Ask</span>
        </button>

        {/* Notifications bell + panel */}
        <div ref={notifRef} style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setNotifOpen((v) => !v)}
            aria-label="Notifications"
            aria-expanded={notifOpen}
            className="flex items-center justify-center"
            style={{
              position: "relative",
              width: "30px",
              height: "30px",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              background: notifOpen ? "var(--bg-subtle)" : "var(--bg-card)",
              color: notifOpen ? "var(--text)" : "var(--text-muted)",
              cursor: "pointer",
              flexShrink: 0,
              transition: "background-color 0.12s ease, color 0.12s ease",
            }}
            onMouseOver={(e) => {
              if (!notifOpen) {
                e.currentTarget.style.background = "var(--bg-subtle)";
                e.currentTarget.style.color = "var(--text)";
              }
            }}
            onMouseOut={(e) => {
              if (!notifOpen) {
                e.currentTarget.style.background = "var(--bg-card)";
                e.currentTarget.style.color = "var(--text-muted)";
              }
            }}
          >
            <Bell size={13} strokeWidth={2} aria-hidden="true" />
            {hasUnread && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: "5px",
                  right: "5px",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "var(--cta)",
                  border: "1px solid var(--bg-card)",
                }}
              />
            )}
          </button>
          {notifOpen && (
            <NotificationsPanel onClose={() => setNotifOpen(false)} />
          )}
        </div>

        {/* Avatar + dropdown */}
        <div ref={menuRef} style={{ position: "relative", marginLeft: "4px" }}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Account menu"
            aria-expanded={menuOpen}
            className="flex items-center justify-center"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              border: "1px solid var(--border)",
              background: "var(--accent-subtle)",
              color: "var(--accent)",
              cursor: "pointer",
              padding: 0,
              overflow: "hidden",
              fontSize: "12px",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span className="font-sans">{initials}</span>
            )}
          </button>

          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                width: "220px",
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
                zIndex: 40,
                padding: "4px",
              }}
            >
              <div
                style={{
                  padding: "10px 12px",
                  borderBottom: "1px solid var(--border)",
                  marginBottom: "4px",
                }}
              >
                <p
                  className="font-sans"
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--text)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {session?.user?.name ?? "Account"}
                </p>
                <p
                  className="font-sans"
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    margin: 0,
                    marginTop: "1px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {session?.user?.email ?? ""}
                </p>
              </div>
              <DropdownItem
                icon={<User size={13} strokeWidth={2} aria-hidden="true" />}
                label="Profile"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/dashboard/profile");
                }}
              />
              <DropdownItem
                icon={<Settings size={13} strokeWidth={2} aria-hidden="true" />}
                label="Settings"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/dashboard/settings");
                }}
              />
              <div
                style={{
                  height: "1px",
                  background: "var(--border)",
                  margin: "4px 0",
                }}
              />
              <DropdownItem
                icon={<LogOut size={13} strokeWidth={2} aria-hidden="true" />}
                label="Sign out"
                onClick={() => {
                  setMenuOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function TopBarPill({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="font-sans"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        height: "30px",
        padding: "0 11px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--bg-card)",
        color: "var(--text-muted)",
        fontSize: "12px",
        fontWeight: 500,
        textDecoration: "none",
        whiteSpace: "nowrap",
        transition: "background-color 0.12s ease, color 0.12s ease, border-color 0.12s ease",
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = "var(--bg-subtle)";
        e.currentTarget.style.color = "var(--text)";
        e.currentTarget.style.borderColor = "var(--text-faint)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = "var(--bg-card)";
        e.currentTarget.style.color = "var(--text-muted)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function DropdownItem({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center font-sans"
      style={{
        width: "100%",
        gap: "10px",
        padding: "8px 12px",
        background: "transparent",
        border: "none",
        borderRadius: "var(--radius)",
        color: "var(--text)",
        fontSize: "13px",
        cursor: "pointer",
        textAlign: "left",
        transition: "background-color 0.12s ease",
      }}
      onMouseOver={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
      onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ color: "var(--text-muted)", display: "inline-flex" }}>{icon}</span>
      {label}
    </button>
  );
}
