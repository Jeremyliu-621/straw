"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { ROLE_COMPANY, ROLE_AGENT_BUILDER, type UserRole } from "@/constants";
import {
  LogOut,
  Building2,
  Bot,
  ClipboardList,
  User,
  Inbox,
  Terminal,
  ChevronDown,
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
  const { data: session, update } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [devOpen, setDevOpen] = useState(false);
  const [devEmail, setDevEmail] = useState("");
  const [devRole, setDevRole] = useState<"company" | "agent_builder">("company");

  const activeRole = session?.user?.role;
  const isCompany = activeRole === ROLE_COMPANY;
  const navItems = isCompany ? COMPANY_NAV : AGENT_NAV;

  async function switchRole(newRole: UserRole) {
    if (newRole === activeRole) return;
    await update({ role: newRole });
    router.push(newRole === ROLE_COMPANY ? "/dashboard/company" : "/dashboard/agent");
  }

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

      {/* Role switcher */}
      <div style={{ padding: "0 16px 8px" }}>
        <div
          style={{
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: "7px",
            padding: "4px",
            display: "flex",
            gap: "4px",
          }}
        >
          <button
            onClick={() => switchRole(ROLE_COMPANY)}
            className="flex-1 flex items-center justify-center gap-2 font-sans transition-all"
            style={{
              padding: "8px 12px",
              borderRadius: "7px",
              fontSize: "13px",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              background: isCompany ? "var(--accent)" : "transparent",
              color: isCompany ? "var(--inverse-text)" : "var(--text-muted)",
            }}
          >
            <Building2 size={15} strokeWidth={1.8} />
            Company
          </button>
          <button
            onClick={() => switchRole(ROLE_AGENT_BUILDER)}
            className="flex-1 flex items-center justify-center gap-2 font-sans transition-all"
            style={{
              padding: "8px 12px",
              borderRadius: "7px",
              fontSize: "13px",
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
              background: !isCompany ? "var(--accent)" : "transparent",
              color: !isCompany ? "var(--inverse-text)" : "var(--text-muted)",
            }}
          >
            <Bot size={15} strokeWidth={1.8} />
            Builder
          </button>
        </div>
        {/* Role descriptor */}
        <p
          className="font-sans text-center"
          style={{
            fontSize: "11px",
            color: "var(--text-faint)",
            marginTop: "8px",
            lineHeight: 1.4,
          }}
        >
          {isCompany ? "Managing tasks & hiring agents" : "Competing & building solutions"}
        </p>
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
          <button
            onClick={() => setDevOpen(!devOpen)}
            className="flex w-full items-center justify-between font-sans transition-colors"
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--text-faint)",
              background: "transparent",
              border: "1px dashed var(--border)",
              cursor: "pointer",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "var(--text-muted)";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.color = "var(--text-faint)";
            }}
          >
            <span className="flex items-center gap-2">
              <Terminal size={13} strokeWidth={1.5} />
              Dev Login
            </span>
            <ChevronDown
              size={13}
              strokeWidth={1.5}
              style={{
                transform: devOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.15s ease",
              }}
            />
          </button>

          {devOpen && (
            <div
              className="space-y-2"
              style={{
                marginTop: "8px",
                padding: "12px",
                borderRadius: "8px",
                background: "var(--bg)",
                border: "1px solid var(--border)",
              }}
            >
              <input
                type="email"
                value={devEmail}
                onChange={(e) => setDevEmail(e.target.value)}
                placeholder="dev@straw.dev"
                className="w-full font-sans outline-none"
                style={{
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent, var(--text))";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              />
              <select
                value={devRole}
                onChange={(e) =>
                  setDevRole(e.target.value as "company" | "agent_builder")
                }
                className="w-full font-sans outline-none"
                style={{
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                }}
              >
                <option value="company">Company</option>
                <option value="agent_builder">Agent Builder</option>
              </select>
              <button
                onClick={() =>
                  signIn("credentials", {
                    email: devEmail,
                    role: devRole,
                    callbackUrl: "/dashboard",
                  })
                }
                disabled={!devEmail}
                className="w-full font-sans transition-colors disabled:opacity-40"
                style={{
                  padding: "7px 10px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: 500,
                  background: "var(--text)",
                  color: "var(--inverse-text)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Switch Account
              </button>
            </div>
          )}
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
