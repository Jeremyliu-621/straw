"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { User, Code2, Bell, AlertTriangle, LogOut } from "lucide-react";
import { Section } from "@/components/dashboard/section";
import { Button } from "@/components/ui/button";

/**
 * /dashboard/settings — single hub for account, notifications, and
 * destructive actions. Placeholder for cards that will deepen later
 * (notification prefs, password change, account deletion). For now
 * everything links out to where the real surface lives or shows
 * "coming soon."
 */
export default function SettingsPage() {
  const { data: session } = useSession();

  return (
    <div style={{ maxWidth: "880px" }}>
      {/* Hero */}
      <div
        style={{
          paddingBottom: "20px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "20px",
        }}
      >
        <h1
          className="font-sans"
          style={{
            fontSize: "26px",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}
        >
          Settings
        </h1>
        <p
          className="mt-2 font-sans"
          style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)" }}
        >
          Account, notifications, and developer access in one place.
        </p>
      </div>

      <Section label="Account">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <SettingRow
            icon={<User size={16} strokeWidth={2} aria-hidden="true" />}
            title="Profile"
            description={`Display name, bio, specializations${session?.user?.name ? ` — currently "${session.user.name}"` : ""}`}
            href="/dashboard/profile"
            cta="Edit"
          />
          <SettingRow
            icon={<Code2 size={16} strokeWidth={2} aria-hidden="true" />}
            title="API keys"
            description="Programmatic access. Issue, list, revoke."
            href="/dashboard/api"
            cta="Manage"
          />
          <SettingRow
            icon={<Bell size={16} strokeWidth={2} aria-hidden="true" />}
            title="Email & notifications"
            description="Notification preferences, email frequency."
            cta="Coming soon"
            disabled
          />
        </div>
      </Section>

      <Section label="Account info" marginTop={32}>
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            background: "var(--bg-card)",
            padding: "16px 20px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          <InfoRow label="Name" value={session?.user?.name ?? "—"} />
          <InfoRow label="Email" value={session?.user?.email ?? "—"} />
          <InfoRow label="Role" value={session?.user?.role ?? "—"} mono />
          <InfoRow
            label="Onboarded"
            value={session?.user?.onboarded ? "Yes" : "No"}
            mono
          />
        </div>
      </Section>

      <Section label="Danger zone" marginTop={32}>
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            background: "var(--bg-card)",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <AlertTriangle
              size={16}
              strokeWidth={2}
              style={{ color: "var(--text-muted)", marginTop: "2px", flexShrink: 0 }}
              aria-hidden="true"
            />
            <div>
              <p
                className="font-sans"
                style={{
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--text)",
                  margin: 0,
                }}
              >
                Sign out of all devices
              </p>
              <p
                className="font-sans"
                style={{
                  marginTop: "2px",
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  margin: "2px 0 0 0",
                }}
              >
                Ends your current session. You&apos;ll need to sign back in.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/" })}
            leadingIcon={<LogOut size={13} strokeWidth={2} aria-hidden="true" />}
          >
            Sign out
          </Button>
        </div>
      </Section>
    </div>
  );
}

function SettingRow({
  icon,
  title,
  description,
  href,
  cta,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
  cta: string;
  disabled?: boolean;
}) {
  const inner = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "12px 16px",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--bg-card)",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        style={{
          color: "var(--text-muted)",
          flexShrink: 0,
          width: "20px",
          display: "inline-flex",
          justifyContent: "center",
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          className="font-sans"
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--text)",
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {title}
        </p>
        <p
          className="font-sans"
          style={{
            marginTop: "2px",
            fontSize: "12px",
            color: "var(--text-muted)",
            margin: "2px 0 0 0",
            lineHeight: 1.45,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {description}
        </p>
      </div>
      <span
        className="font-sans"
        style={{
          fontSize: "12px",
          color: disabled ? "var(--text-faint)" : "var(--text-muted)",
          flexShrink: 0,
        }}
      >
        {cta} {!disabled && "→"}
      </span>
    </div>
  );

  if (disabled || !href) {
    return inner;
  }

  return (
    <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>
      {inner}
    </Link>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p
        className="font-sans"
        style={{
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          color: "var(--text-faint)",
          margin: 0,
          marginBottom: "3px",
        }}
      >
        {label}
      </p>
      <p
        className={mono ? "font-mono" : "font-sans"}
        style={{
          fontSize: "13px",
          color: "var(--text)",
          margin: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </p>
    </div>
  );
}
