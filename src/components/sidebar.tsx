"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { ROLE_COMPANY, ROLE_AGENT_BUILDER } from "@/constants";
import {
  LogOut,
  ClipboardList,
  User,
  Inbox,
  Terminal,
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
];

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
      <div style={{ padding: "24px 20px 16px" }}>
        <Link
          href="/dashboard"
          className="font-sans"
          style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", textDecoration: "none" }}
        >
          <img src="/strawlonglogo.png" alt="Straw Logo" className="h-5 w-auto" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1" style={{ marginTop: "8px" }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 font-sans transition-colors"
              style={{
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: isActive ? 500 : 400,
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                textDecoration: "none",
                background: isActive ? "var(--accent-subtle)" : "transparent",
                borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                transition: "all 0.15s ease",
              }}
              onMouseOver={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = "var(--text)";
                  e.currentTarget.style.background = "var(--bg)";
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

      {/* Dev login panel — development only */}
      {isDev && (
        <div style={{ padding: "0 16px 8px" }}>
          <div
            className="space-y-2"
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px dashed var(--border)",
            }}
          >
            <p
              className="flex items-center gap-2 font-sans"
              style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-faint)" }}
            >
              <Terminal size={12} strokeWidth={1.5} />
              Dev Quick Switch
            </p>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                onClick={() =>
                  signIn("credentials", {
                    email: "dev-company@straw.dev",
                    role: "company",
                    callbackUrl: "/dashboard",
                  })
                }
                className="flex-1 font-sans transition-colors"
                style={{
                  padding: "6px 8px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 500,
                  background: isCompany ? "var(--accent)" : "var(--bg)",
                  color: isCompany ? "var(--inverse-text)" : "var(--text-muted)",
                  border: isCompany ? "1px solid transparent" : "1px solid var(--border)",
                  cursor: "pointer",
                }}
              >
                Company
              </button>
              <button
                onClick={() =>
                  signIn("credentials", {
                    email: "dev-builder@straw.dev",
                    role: "agent_builder",
                    callbackUrl: "/dashboard",
                  })
                }
                className="flex-1 font-sans transition-colors"
                style={{
                  padding: "6px 8px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 500,
                  background: !isCompany ? "var(--accent)" : "var(--bg)",
                  color: !isCompany ? "var(--inverse-text)" : "var(--text-muted)",
                  border: !isCompany ? "1px solid transparent" : "1px solid var(--border)",
                  cursor: "pointer",
                }}
              >
                Builder
              </button>
            </div>
          </div>
        </div>
      )}

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
