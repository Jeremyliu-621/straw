"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Github } from "lucide-react";

export default function SignInPage() {
  const [devEmail, setDevEmail] = useState("");
  const [devRole, setDevRole] = useState<"company" | "agent_builder">("company");
  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm px-8">
        <h1
          className="text-center font-sans"
          style={{ fontSize: "36px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text)" }}
        >
          Sign in to Map
        </h1>
        <p
          className="mt-3 text-center font-sans"
          style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)" }}
        >
          Choose how you want to use the platform
        </p>

        <div className="mt-10 space-y-3">
          {/* GitHub → Agent Builder */}
          <button
            onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
            className="flex w-full items-center justify-center gap-2 font-sans transition-colors"
            style={{
              padding: "10px 16px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 500,
              background: "var(--text)",
              color: "var(--inverse-text)",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#333333")}
            onMouseOut={(e) => (e.currentTarget.style.background = "var(--text)")}
          >
            <Github size={16} strokeWidth={1.5} />
            Continue with GitHub
          </button>
          <p
            className="text-center font-sans"
            style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--text-faint)" }}
          >
            For agent builders
          </p>

          <div className="py-2" />

          {/* Google → Company */}
          <button
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="flex w-full items-center justify-center gap-2 font-sans transition-colors"
            style={{
              padding: "10px 16px",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 500,
              background: "transparent",
              color: "var(--text)",
              border: "1px solid var(--border)",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
            onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Continue with Google
          </button>
          <p
            className="text-center font-sans"
            style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--text-faint)" }}
          >
            For companies
          </p>
        </div>

        {/* Dev-only credentials login */}
        {isDev && (
          <div className="mt-10" style={{ borderTop: "1px solid var(--border)", paddingTop: "24px" }}>
            <p
              className="mb-4 font-sans"
              style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" as const, color: "var(--text-faint)" }}
            >
              Dev Login
            </p>
            <div className="space-y-3">
              <div>
                <label
                  className="mb-1 block font-sans"
                  style={{ fontSize: "13px", color: "var(--text-muted)" }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={devEmail}
                  onChange={(e) => setDevEmail(e.target.value)}
                  placeholder="dev@map-platform.dev"
                  className="w-full font-sans"
                  style={{
                    padding: "10px 12px",
                    borderRadius: "6px",
                    fontSize: "15px",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                  }}
                />
              </div>
              <div>
                <label
                  className="mb-1 block font-sans"
                  style={{ fontSize: "13px", color: "var(--text-muted)" }}
                >
                  Role
                </label>
                <select
                  value={devRole}
                  onChange={(e) => setDevRole(e.target.value as "company" | "agent_builder")}
                  className="w-full font-sans"
                  style={{
                    padding: "10px 12px",
                    borderRadius: "6px",
                    fontSize: "15px",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                  }}
                >
                  <option value="company">Company</option>
                  <option value="agent_builder">Agent Builder</option>
                </select>
              </div>
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
                  padding: "10px 16px",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: 500,
                  background: "transparent",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                }}
              >
                Dev Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
