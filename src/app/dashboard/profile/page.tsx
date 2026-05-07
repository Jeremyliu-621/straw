"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { CATEGORY_OPTIONS } from "@/constants";

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

  return (
    <div>
      {/* Hero */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          paddingBottom: "24px",
          borderBottom: "1px solid var(--border)",
          marginBottom: "24px",
        }}
      >
        <div>
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
        {session?.user?.supabaseId && (
          <Link
            href={`/agents/${session.user.supabaseId}`}
            className="font-sans"
            style={{
              fontSize: "13px",
              color: "var(--text-muted)",
              textDecoration: "none",
              flexShrink: 0,
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "var(--text)")}
            onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            View public profile →
          </Link>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{
                height: "40px",
                background: "var(--bg-subtle)",
                borderRadius: "var(--radius)",
              }}
            />
          ))}
        </div>
      ) : (
        <form
          id="profile-form"
          onSubmit={handleSave}
          style={{
            maxWidth: "720px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          <div style={{ gridColumn: "1 / -1" }}>
            <Field
              id="profile-display-name"
              label="Display Name"
              required
              value={displayName}
              onChange={setDisplayName}
              placeholder="Your name or handle"
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <Field
              id="profile-github-url"
              label="GitHub URL"
              value={githubUrl}
              onChange={setGithubUrl}
              placeholder="https://github.com/you"
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
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
              rows={3}
              className="w-full resize-none font-sans outline-none"
              style={{
                padding: "9px 12px",
                borderRadius: "var(--radius)",
                fontSize: "14px",
                color: "var(--text)",
                border: "1px solid var(--border)",
                background: "var(--bg)",
              }}
            />
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label
              className="mb-2 block font-sans"
              style={{ fontSize: "13px", color: "var(--text-muted)" }}
            >
              Specializations
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {CATEGORY_OPTIONS.map((cat) => {
                const active = categories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className="font-sans"
                    style={{
                      padding: "5px 12px",
                      borderRadius: "999px",
                      fontSize: "13px",
                      fontWeight: active ? 500 : 400,
                      border: `1px solid ${active ? "var(--text)" : "var(--border)"}`,
                      background: active ? "var(--text)" : "transparent",
                      color: active ? "var(--inverse-text)" : "var(--text-muted)",
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
              <input
                type="text"
                value={otherCategory}
                onChange={(e) => setOtherCategory(e.target.value)}
                placeholder="Specify category..."
                className="mt-2 font-sans outline-none"
                style={{
                  padding: "8px 12px",
                  borderRadius: "var(--radius)",
                  fontSize: "14px",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  width: "220px",
                }}
              />
            )}
          </div>

          {/* Save row */}
          <div
            style={{
              gridColumn: "1 / -1",
              marginTop: "16px",
              paddingTop: "16px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <div>
              {error && (
                <p
                  className="font-sans"
                  style={{ fontSize: "13px", color: "var(--error)" }}
                >
                  {error}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/dashboard/agent")}
                className="font-sans transition-colors"
                style={{
                  padding: "9px 18px",
                  borderRadius: "var(--radius)",
                  fontSize: "14px",
                  fontWeight: 500,
                  background: "transparent",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !displayName}
                className="font-sans transition-colors disabled:opacity-40"
                style={{
                  padding: "9px 18px",
                  borderRadius: "var(--radius)",
                  fontSize: "14px",
                  fontWeight: 500,
                  background: "var(--text)",
                  color: "var(--inverse-text)",
                  border: "none",
                  cursor: saving || !displayName ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving..." : "Save profile"}
              </button>
            </div>
          </div>
        </form>
      )}
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
