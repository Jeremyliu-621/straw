"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { ROLE_COMPANY, ROLE_AGENT_BUILDER } from "@/constants";
import {
  LogOut,
  ClipboardList,
  User,
  Inbox,
  ChevronsUpDown,
  Building2,
  Bot,
  Code2,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: typeof ClipboardList;
}

const COMPANY_NAV: NavItem[] = [
  { label: "Tasks", href: "/dashboard/company", icon: ClipboardList },
  { label: "Inbox", href: "/dashboard/inbox", icon: Inbox },
];

const AGENT_NAV: NavItem[] = [
  { label: "Tasks", href: "/dashboard/agent", icon: ClipboardList },
  { label: "Profile", href: "/agents/profile", icon: User },
  { label: "Inbox", href: "/dashboard/inbox", icon: Inbox },
  { label: "API", href: "/dashboard/api", icon: Code2 },
];

interface WorkspaceOption {
  id: string;
  label: string;
  description: string;
  icon: typeof Building2;
  action: () => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const isDev = process.env.NODE_ENV === "development";

export function Sidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const activeRole = session?.user?.role;
  const isCompany = activeRole === ROLE_COMPANY;
  const navItems = isCompany ? COMPANY_NAV : AGENT_NAV;

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const workspaces: WorkspaceOption[] = [
    {
      id: "company",
      label: "Company",
      description: "Post tasks and evaluate agents",
      icon: Building2,
      action: () => {
        if (isDev) {
          signIn("credentials", {
            email: "dev-company@straw.dev",
            role: "company",
            callbackUrl: "/dashboard",
          });
        }
        setDropdownOpen(false);
      },
    },
    {
      id: "builder",
      label: "Builder",
      description: "Build and submit AI agents",
      icon: Bot,
      action: () => {
        if (isDev) {
          signIn("credentials", {
            email: "dev-builder@straw.dev",
            role: "agent_builder",
            callbackUrl: "/dashboard",
          });
        }
        setDropdownOpen(false);
      },
    },
    {
      id: "api",
      label: "API",
      description: "Integrate with the Straw API",
      icon: Code2,
      action: () => {
        router.push("/dashboard/api");
        setDropdownOpen(false);
      },
    },
  ];

  const activeWorkspace = isCompany ? workspaces[0] : workspaces[1];
  const ActiveIcon = activeWorkspace.icon;

  return (
    <aside
      className="fixed left-0 top-0 flex h-screen flex-col"
      style={{
        width: "240px",
        background: "var(--bg-subtle)",
        borderRight: "1px solid var(--border)",
        transition: "background-color 0.3s ease",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "24px 20px 12px" }}>
        <Link
          href="/dashboard"
          className="font-sans"
          style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", textDecoration: "none" }}
        >
          <img src="/strawlonglogo.png" alt="Straw Logo" className="h-5 w-auto" />
        </Link>
      </div>

      {/* Workspace switcher */}
      <div ref={dropdownRef} style={{ padding: "0 12px", position: "relative" }}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 font-sans transition-colors"
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
          <span className="flex-1 truncate">{activeWorkspace.label}</span>
          <ChevronsUpDown size={14} strokeWidth={1.5} style={{ color: "var(--text-faint)", flexShrink: 0 }} />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div
            className="font-sans"
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: "12px",
              right: "12px",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
              zIndex: 50,
              padding: "4px",
              overflow: "hidden",
            }}
          >
            {workspaces.map((ws) => {
              const WsIcon = ws.icon;
              const isCurrent = ws.id === activeWorkspace.id;
              return (
                <button
                  key={ws.id}
                  onClick={ws.action}
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
      <nav className="flex-1" style={{ padding: "0 12px", marginTop: "8px" }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 font-sans transition-colors"
              style={{
                padding: "8px 12px",
                fontSize: "14px",
                fontWeight: isActive ? 500 : 400,
                color: isActive ? "var(--text)" : "var(--text-muted)",
                textDecoration: "none",
                background: isActive ? "rgba(0,0,0,0.07)" : "transparent",
                borderRadius: "var(--radius)",
                transition: "all 0.15s ease",
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
              <Icon size={18} strokeWidth={1.5} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        {/* Avatar */}
        {session?.user?.image ? (
          <img
            src={session.user.image}
            alt=""
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            className="flex items-center justify-center font-sans"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "var(--accent-subtle)",
              color: "var(--accent)",
              fontSize: "12px",
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {getInitials(session?.user?.name ?? "U")}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            className="font-sans truncate"
            style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)" }}
          >
            {session?.user?.name}
          </p>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-1 font-sans transition-colors"
            style={{
              fontSize: "12px",
              color: "var(--text-faint)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              marginTop: "2px",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-faint)")}
          >
            <LogOut size={12} strokeWidth={1.5} />
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}
