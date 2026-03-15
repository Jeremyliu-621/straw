"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ROLE_COMPANY, type UserRole } from "@/constants";
import { LogOut } from "lucide-react";

interface SidebarUser {
  name?: string | null;
  role: UserRole;
}

interface NavItem {
  label: string;
  href: string;
}

const COMPANY_NAV: NavItem[] = [
  { label: "Tasks", href: "/dashboard/company" },
  { label: "Inbox", href: "/dashboard/inbox" },
];

const AGENT_NAV: NavItem[] = [
  { label: "Tasks", href: "/dashboard/agent" },
  { label: "Profile", href: "/agents/profile" },
  { label: "Inbox", href: "/dashboard/inbox" },
];

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const isCompany = user.role === ROLE_COMPANY;
  const navItems = isCompany ? COMPANY_NAV : AGENT_NAV;

  return (
    <aside
      className="fixed left-0 top-0 flex h-screen flex-col"
      style={{
        width: "240px",
        background: "var(--bg-subtle)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "24px 20px 32px" }}>
        <Link
          href="/dashboard"
          className="font-sans"
          style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)", textDecoration: "none" }}
        >
          <img src="/strawlonglogo.png" alt="Straw Logo" className="h-5 w-auto" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className="block font-sans transition-colors"
              style={{
                padding: "8px 20px",
                fontSize: "14px",
                fontWeight: isActive ? 500 : 400,
                color: "var(--text)",
                textDecoration: "none",
                background: isActive ? "var(--bg)" : "transparent",
                borderLeft: isActive ? "2px solid var(--text)" : "2px solid transparent",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border)" }}>
        <p
          className="font-sans"
          style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)" }}
        >
          {user.name}
        </p>
        <p
          className="font-sans"
          style={{
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.06em",
            textTransform: "uppercase" as const,
            color: "var(--text-muted)",
          }}
        >
          {isCompany ? "Company" : "Agent Builder"}
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-2 flex items-center gap-1 font-sans transition-colors"
          style={{
            fontSize: "13px",
            color: "var(--text-muted)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          <LogOut size={14} strokeWidth={1.5} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
