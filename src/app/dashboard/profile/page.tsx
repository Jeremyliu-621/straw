"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { CATEGORY_OPTIONS } from "@/constants";
import { Button } from "@/components/ui/button";

interface Profile {
  display_name: string;
  bio: string | null;
  github_url: string | null;
  categories: string[];
}

/**
 * Profile editor — lives inside the dashboard shell so the sidebar +
 * workspace switcher stay visible. Cancel returns to /dashboard/agent;
 * Save persists and bounces the user back to the dashboard. The public
 * profile (linked from the section header) still lives at /agents/[id]
 * — that's the read-only marketing surface, separate concern.
 */
export default function DashboardProfilePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [otherCategory, setOtherCategory] = useState("");

  useEffect(() => {
    fetch("/api/agents/profile")
      .then((res) => res.json())
      .then((data: Profile) => {
        setDisplayName(data.display_name);
        setBio(data.bio ?? "");
        setGithubUrl(data.github_url ?? "");
        const known = data.categories.filter((c) =>
          (CATEGORY_OPTIONS as readonly string[]).includes(c)
        );
        const other = data.categories.filter(
          (c) => !(CATEGORY_OPTIONS as readonly string[]).includes(c)
        );
        setCategories(other.length > 0 ? [...known, "other"] : known);
        if (other.length > 0) setOtherCategory(other.join(", "));
      })
      .catch(() => setError("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const finalCategories = categories
      .map((c) => (c === "other" ? otherCategory.trim() : c))
      .filter(Boolean);

    try {
      const res = await fetch("/api/agents/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          bio: bio || undefined,
          github_url: githubUrl || undefined,
          categories: finalCategories,
        }),
      });

      if (!res.ok) {
        setError("Failed to save profile");
        return;
      }

      router.push("/dashboard/agent");
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  function toggleCategory(cat: string) {
    if (categories.includes(cat)) {
      setCategories(categories.filter((c) => c !== cat));
    } else {
      setCategories([...categories, cat]);
    }
  }

  const initials = (session?.user?.name ?? "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div>
      {/* Hero */}
      <div
        style={{
          paddingBottom: "24px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "24px",
        }}
      >
        <h1
          className="font-sans"
          style={{
            fontSize: "28px",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}
        >
          Your profile
        </h1>
        <p
          className="mt-2 font-sans"
          style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)" }}
        >
          How you appear to companies on the leaderboard and in deals.
        </p>
      </div>

      {loading ? (
        <SectionSkeleton />
      ) : (
        <form
          id="profile-form"
          onSubmit={handleSave}
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          {/* Top row — Identity (primary, wider) + Specializations side rail */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 5fr) minmax(0, 3fr)",
              gap: "16px",
              alignItems: "start",
            }}
          >
            {/* ── Identity card ────────────────────────────── */}
            <Card label="Identity">
              {/* Avatar + preview link */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  marginBottom: "20px",
                  paddingBottom: "20px",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {session?.user?.image ? (
                  <img
                    src={session.user.image}
                    alt=""
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      flexShrink: 0,
                      border: "1px solid var(--border)",
                    }}
                  />
                ) : (
                  <div
                    className="flex items-center justify-center font-sans"
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "50%",
                      background: "var(--accent-subtle)",
                      color: "var(--accent)",
                      fontSize: "18px",
                      fontWeight: 600,
                      flexShrink: 0,
                      border: "1px solid var(--border)",
                    }}
                  >
                    {initials}
                  </div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p
                    className="font-sans"
                    style={{
                      fontSize: "11px",
                      fontWeight: 500,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase" as const,
                      color: "var(--text-muted)",
                      margin: 0,
                      marginBottom: "4px",
                    }}
                  >
                    Avatar
                  </p>
                  <p
                    className="font-sans"
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    Pulled from your sign-in provider.
                  </p>
                </div>
                {session?.user?.supabaseId && (
                  <Link
                    href={`/agents/${session.user.supabaseId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-sans"
                    style={{
                      fontSize: "12.5px",
                      color: "var(--text-muted)",
                      textDecoration: "none",
                      flexShrink: 0,
                      padding: "6px 10px",
                      border: "1px solid var(--border)",
                      borderRadius: "var(--radius)",
                      whiteSpace: "nowrap",
                      transition: "background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = "var(--bg-subtle)";
                      e.currentTarget.style.borderColor = "var(--text-faint)";
                      e.currentTarget.style.color = "var(--text)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.color = "var(--text-muted)";
                    }}
                  >
                    Preview public profile ↗
                  </Link>
                )}
              </div>

              {/* Name + GitHub side by side */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  marginBottom: "16px",
                }}
              >
                <Field
                  id="profile-display-name"
                  label="Display Name"
                  required
                  value={displayName}
                  onChange={setDisplayName}
                  placeholder="Your name or handle"
                />
                <Field
                  id="profile-github-url"
                  label="GitHub URL"
                  value={githubUrl}
                  onChange={setGithubUrl}
                  placeholder="https://github.com/you"
                />
              </div>

              {/* Bio */}
              <div>
                <label
                  htmlFor="profile-bio"
                  className="mb-1 block font-sans"
                  style={{ fontSize: "13px", color: "var(--text-muted)" }}
                >
                  Bio
                </label>
                <textarea
                  id="profile-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="What kind of agents do you build?"
                  rows={5}
                  className="w-full resize-none font-sans outline-none"
                  style={{
                    padding: "10px 12px",
                    borderRadius: "var(--radius)",
                    fontSize: "14px",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    lineHeight: 1.55,
                  }}
                />
              </div>
            </Card>

            {/* ── Specializations ───────────────────────────── */}
            <Card label="Specializations">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {CATEGORY_OPTIONS.map((cat) => {
                  const active = categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className="font-sans"
                      style={{
                        padding: "5px 11px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        fontWeight: active ? 500 : 400,
                        border: `1px solid ${active ? "#111" : "var(--border)"}`,
                        background: active ? "#f7d4d0" : "transparent",
                        color: active ? "#111" : "var(--text-muted)",
                        cursor: "pointer",
                        transition: "all 0.12s",
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
              {categories.includes("other") && (
                <div style={{ marginTop: "12px" }}>
                  <Field
                    id="profile-other-category"
                    label="Custom"
                    value={otherCategory}
                    onChange={setOtherCategory}
                    placeholder="medical-imaging, ml-ops"
                  />
                </div>
              )}
            </Card>
          </div>

          {/* ── Sticky save bar ──────────────────────────────────
              Sits at the bottom of the form. Becomes sticky when
              the form scrolls so primary actions are always
              reachable; on shorter viewports it's already in view. */}
          <div
            style={{
              position: "sticky",
              bottom: "16px",
              marginTop: "8px",
              padding: "12px 16px",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "12px",
              zIndex: 5,
            }}
          >
            {error ? (
              <p
                className="font-sans"
                role="alert"
                style={{
                  fontSize: "13px",
                  color: "var(--error)",
                  margin: 0,
                  marginRight: "auto",
                }}
              >
                {error}
              </p>
            ) : (
              <p
                className="font-sans"
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  margin: 0,
                  marginRight: "auto",
                }}
              >
                {displayName ? "Ready to save." : "Add a display name to continue."}
              </p>
            )}
            <Button
              variant="secondary"
              size="md"
              onClick={() => router.push("/dashboard/agent")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={saving || !displayName}
            >
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ── Card primitive ─────────────────────────────────────────────────────
//
// Each form section sits in a bordered card with a small label header,
// matching the visual rhythm of KpiTile / RichRow / WorkspaceUsage in
// the rest of the dashboard. Description sits as muted body text under
// the label, then the form fields live below.

function Card({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        background: "var(--bg)",
        padding: "20px",
      }}
    >
      <p
        className="font-sans"
        style={{
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase" as const,
          color: "var(--text-muted)",
          marginBottom: "16px",
        }}
      >
        {label}
      </p>
      {children}
    </section>
  );
}

function SectionSkeleton() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 5fr) minmax(0, 3fr)",
        gap: "16px",
        alignItems: "start",
      }}
    >
      <div
        className="animate-pulse"
        style={{
          height: "440px",
          background: "var(--bg-subtle)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {[160, 220].map((h, i) => (
          <div
            key={i}
            className="animate-pulse"
            style={{
              height: `${h}px`,
              background: "var(--bg-subtle)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
  helper,
  id,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  helper?: string;
  id: string;
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
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full font-sans outline-none"
        style={{
          padding: "9px 12px",
          borderRadius: "var(--radius)",
          fontSize: "14px",
          color: "var(--text)",
          border: "1px solid var(--border)",
          background: "var(--bg)",
        }}
      />
      {helper && (
        <p
          className="mt-1 font-sans"
          style={{ fontSize: "12px", color: "var(--text-muted)" }}
        >
          {helper}
        </p>
      )}
    </div>
  );
}
