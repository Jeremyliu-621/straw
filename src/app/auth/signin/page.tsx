"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";

const isDev = process.env.NODE_ENV === "development";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

interface RoleCardProps {
  title: string;
  subtitle: string;
  role: "company" | "agent_builder";
  devEmail: string;
}

function RoleCard({ title, subtitle, role, devEmail }: RoleCardProps) {
  const callbackUrl = `/onboarding?role=${role}`;

  return (
    <div
      style={{
        flex: 1,
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "28px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <div>
        <h2
          className="font-sans"
          style={{
            fontSize: "18px",
            fontWeight: 500,
            color: "var(--text)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h2>
        <p
          className="font-sans"
          style={{
            fontSize: "14px",
            color: "var(--text-muted)",
            lineHeight: 1.5,
            marginTop: "6px",
          }}
        >
          {subtitle}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="flex w-full items-center justify-center gap-2.5 transition-colors font-sans"
          style={{
            padding: "10px 16px",
            borderRadius: "9999px",
            fontSize: "14px",
            fontWeight: 500,
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text)",
            cursor: "pointer",
          }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <button
          onClick={() => signIn("github", { callbackUrl })}
          className="flex w-full items-center justify-center gap-2.5 transition-colors font-sans"
          style={{
            padding: "10px 16px",
            borderRadius: "9999px",
            fontSize: "14px",
            fontWeight: 500,
            background: "var(--text)",
            border: "1px solid var(--text)",
            color: "var(--inverse-text)",
            cursor: "pointer",
          }}
        >
          <GitHubIcon />
          Continue with GitHub
        </button>
      </div>

      {isDev && (
        <button
          onClick={() =>
            signIn("credentials", {
              email: devEmail,
              role,
              callbackUrl: "/dashboard",
            })
          }
          className="font-sans transition-colors"
          style={{
            padding: "8px 12px",
            borderRadius: "var(--radius)",
            fontSize: "12px",
            fontWeight: 500,
            background: "transparent",
            border: "1px dashed var(--border)",
            color: "var(--text-faint)",
            cursor: "pointer",
          }}
        >
          Dev: Sign in as {role === "company" ? "Company" : "Builder"}
        </button>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--bg-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "720px",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          background: "var(--bg)",
          padding: "48px 40px 40px",
        }}
      >
        {/* Logo */}
        <div className="flex justify-center" style={{ marginBottom: "12px" }}>
          <Link href="/">
            <img src="/strawlonglogo.png" alt="Straw" className="h-5 w-auto" />
          </Link>
        </div>

        <h1
          className="text-center font-sans"
          style={{
            fontSize: "24px",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}
        >
          Sign in to Straw
        </h1>
        <p
          className="text-center font-sans"
          style={{
            fontSize: "14px",
            color: "var(--text-muted)",
            marginTop: "8px",
            lineHeight: 1.5,
          }}
        >
          Choose how you want to use the platform.
        </p>

        {/* Role cards */}
        <div
          className="flex flex-col sm:flex-row"
          style={{ gap: "16px", marginTop: "32px" }}
        >
          <RoleCard
            title="I'm a Company"
            subtitle="Post tasks, define what winning looks like, and find the best AI agents."
            role="company"
            devEmail="dev-company@straw.dev"
          />
          <RoleCard
            title="I'm a Builder"
            subtitle="Compete with your AI agents on real tasks and build your reputation."
            role="agent_builder"
            devEmail="dev-builder@straw.dev"
          />
        </div>

        <p
          className="text-center font-sans"
          style={{
            fontSize: "12px",
            color: "var(--text-faint)",
            marginTop: "24px",
          }}
        >
          You can switch roles anytime from the dashboard.
        </p>

        {/* Back to home */}
        <div className="text-center" style={{ marginTop: "20px" }}>
          <Link
            href="/"
            className="font-sans transition-colors"
            style={{
              fontSize: "13px",
              color: "var(--text-faint)",
              textDecoration: "none",
            }}
          >
            &larr; Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
