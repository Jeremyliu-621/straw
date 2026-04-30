"use client";

import Link from "next/link";
import { useState } from "react";

type SuccessState = { position: number; alreadyJoined: boolean };

export default function WaitlistPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  const canSubmit = name.trim().length > 0 && email.trim().length > 0 && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/public/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company: company.trim() || undefined,
          position: position.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      setSuccess({ position: data.position, alreadyJoined: data.alreadyJoined });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#FDFCFC",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Title row — full width */}
      <div style={{ width: "100%", borderBottom: "1px solid #e5e7eb" }}>
        <div
          style={{
            maxWidth: "860px",
            margin: "0 auto",
            padding: "20px 40px",
            borderLeft: "1px solid #e5e7eb",
            borderRight: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <Link href="/" className="flex items-center">
            <img src="/strawlonglogo.png" alt="Straw" style={{ height: "16px", width: "auto" }} />
          </Link>
          <Link
            href="/"
            className="font-sans"
            style={{ fontSize: "13px", color: "var(--text-muted)" }}
          >
            Back to home
          </Link>
        </div>
      </div>

      {/* Content + footer rail — one continuous max-w-860 column with
          left/right borders running uninterrupted from the title rule
          down to the bottom rule. */}
      <div style={{ flex: 1, width: "100%" }}>
        <div
          style={{
            maxWidth: "860px",
            margin: "0 auto",
            minHeight: "100%",
            paddingTop: "48px",
            paddingLeft: "40px",
            paddingRight: "40px",
            paddingBottom: "120px",
            borderLeft: "1px solid #e5e7eb",
            borderRight: "1px solid #e5e7eb",
          }}
        >
          {success ? (
            <SuccessPanel position={success.position} alreadyJoined={success.alreadyJoined} />
          ) : (
            <FormPanel
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              company={company}
              setCompany={setCompany}
              position={position}
              setPosition={setPosition}
              loading={loading}
              error={error}
              canSubmit={canSubmit}
              onSubmit={handleSubmit}
            />
          )}
        </div>
      </div>

      {/* Bottom rule — full-width line that closes the page; vertical
          rails above end exactly here, no severed-segment look. */}
      <div style={{ width: "100%", borderTop: "1px solid #e5e7eb" }} />
    </div>
  );
}

function FormPanel({
  name,
  setName,
  email,
  setEmail,
  company,
  setCompany,
  position,
  setPosition,
  loading,
  error,
  canSubmit,
  onSubmit,
}: {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  company: string;
  setCompany: (v: string) => void;
  position: string;
  setPosition: (v: string) => void;
  loading: boolean;
  error: string | null;
  canSubmit: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <>
      <h1
        className="font-sans"
        style={{
          fontSize: "26px",
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--text)",
          marginBottom: "8px",
        }}
      >
        Join the waitlist
      </h1>
      <p
        className="font-sans"
        style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "32px" }}
      >
        We&apos;re onboarding companies and agent builders in waves. Drop your details and
        we&apos;ll let you know when it&apos;s your turn.
      </p>

      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Field id="wl-name" label="Name" required value={name} onChange={setName} placeholder="Ada Lovelace" />
        <Field
          id="wl-email"
          label="Email"
          required
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="ada@example.com"
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          <Field
            id="wl-company"
            label="Company"
            optional
            value={company}
            onChange={setCompany}
            placeholder="Acme Inc."
          />
          <Field
            id="wl-position"
            label="Position"
            optional
            value={position}
            onChange={setPosition}
            placeholder="Head of Engineering"
          />
        </div>

        {error && (
          <p className="font-sans" style={{ fontSize: "13px", color: "var(--error)" }}>
            {error}
          </p>
        )}

        <div style={{ marginTop: "8px" }}>
          <button
            type="submit"
            disabled={!canSubmit}
            className="font-sans"
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 500,
              color: "#111",
              background: "#f7d4d0",
              border: "1px solid #111",
              borderRadius: "var(--radius)",
              cursor: canSubmit ? "pointer" : "not-allowed",
              opacity: canSubmit ? 1 : 0.5,
              transition: "opacity 120ms ease",
            }}
          >
            {loading ? "Joining…" : "Join the waitlist"}
          </button>
        </div>
      </form>
    </>
  );
}

function SuccessPanel({ position, alreadyJoined }: { position: number; alreadyJoined: boolean }) {
  return (
    <div style={{ textAlign: "center", padding: "32px 0" }}>
      <p
        className="font-sans"
        style={{
          fontSize: "13px",
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: "16px",
        }}
      >
        {alreadyJoined ? "You're already on the list" : "You're in"}
      </p>
      <p
        className="font-sans"
        style={{
          fontSize: "16px",
          color: "var(--text-muted)",
          marginBottom: "8px",
        }}
      >
        You&apos;re number
      </p>
      <p
        className="font-mono"
        style={{
          fontSize: "96px",
          fontWeight: 500,
          letterSpacing: "-0.04em",
          color: "var(--text)",
          lineHeight: 1,
          marginBottom: "12px",
        }}
      >
        #{position.toLocaleString()}
      </p>
      <p
        className="font-sans"
        style={{ fontSize: "16px", color: "var(--text-muted)", marginBottom: "32px" }}
      >
        on the waitlist.
      </p>
      <p
        className="font-sans"
        style={{
          fontSize: "13px",
          color: "var(--text-faint)",
          maxWidth: "420px",
          margin: "0 auto 32px",
          lineHeight: 1.6,
        }}
      >
        We&apos;ll email you the moment your slot opens up.
      </p>
      <Link
        href="/"
        className="font-sans"
        style={{
          display: "inline-block",
          padding: "10px 20px",
          fontSize: "14px",
          fontWeight: 500,
          color: "#111",
          background: "transparent",
          border: "1px solid #111",
          borderRadius: "var(--radius)",
        }}
      >
        Back to home
      </Link>
    </div>
  );
}

function Field({
  id,
  label,
  required,
  optional,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block font-sans"
        style={{ fontSize: "13px", color: "var(--text-muted)" }}
      >
        {label}
        {required && <span style={{ color: "var(--error)" }}> *</span>}
        {optional && (
          <span style={{ color: "var(--text-faint)", marginLeft: "6px" }}>optional</span>
        )}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={
          type === "email" ? "email" : id === "wl-name" ? "name" : id === "wl-company" ? "organization" : id === "wl-position" ? "organization-title" : "off"
        }
        className="w-full font-sans outline-none"
        style={{
          padding: "10px 12px",
          borderRadius: "var(--radius)",
          fontSize: "14px",
          color: "var(--text)",
          border: "1px solid var(--border)",
          background: "var(--bg)",
        }}
      />
    </div>
  );
}
