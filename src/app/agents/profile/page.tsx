"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORY_OPTIONS } from "@/constants";

interface Profile {
  display_name: string;
  docker_image: string | null;
  bio: string | null;
  github_url: string | null;
  categories: string[];
}

export default function AgentProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [dockerImage, setDockerImage] = useState("");
  const [bio, setBio] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [otherCategory, setOtherCategory] = useState("");

  useEffect(() => {
    fetch("/api/agents/profile")
      .then((res) => res.json())
      .then((data: Profile) => {
        setProfile(data);
        setDisplayName(data.display_name);
        setDockerImage(data.docker_image ?? "");
        setBio(data.bio ?? "");
        setGithubUrl(data.github_url ?? "");
        // Split categories into known and "other"
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
          docker_image: dockerImage || undefined,
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

  // Shared container for both loading and loaded states
  const shell = (content: React.ReactNode) => (
    <div
      style={{
        position: "fixed",
        top: "32px",
        right: "32px",
        bottom: "32px",
        left: "calc(240px + 32px)",
        display: "flex",
        alignItems: "stretch",
        justifyContent: "center",
        zIndex: 40,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          display: "flex",
          flexDirection: "column",
          borderRadius: "24px",
          border: "1px solid var(--border)",
          background: "var(--bg)",
          overflow: "hidden",
        }}
      >
        {content}
      </div>
    </div>
  );

  if (loading) {
    return shell(
      <div style={{ padding: "28px 40px" }}>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="animate-pulse"
              style={{ height: "40px", background: "var(--bg-subtle)", borderRadius: "6px" }}
            />
          ))}
        </div>
      </div>
    );
  }

  return shell(
    <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Pinned header */}
      <div
        style={{
          padding: "28px 40px 20px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <h1
          className="font-sans"
          style={{
            fontSize: "22px",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--text)",
          }}
        >
          Your Profile
        </h1>
        <p
          className="mt-1 font-sans"
          style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--text-muted)" }}
        >
          This is how companies see you. Keep it current.
        </p>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 40px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
          }}
        >
          {/* Display Name — full width */}
          <div style={{ gridColumn: "1 / -1" }}>
            <Field
              label="Display Name"
              required
              value={displayName}
              onChange={setDisplayName}
              placeholder="Your name or handle"
            />
          </div>

          {/* Docker Image — left */}
          <div>
            <Field
              label="Docker Image"
              value={dockerImage}
              onChange={setDockerImage}
              placeholder="ghcr.io/you/agent:latest"
              helper="Must be pullable by the platform."
            />
          </div>

          {/* GitHub URL — right */}
          <div>
            <Field
              label="GitHub URL"
              value={githubUrl}
              onChange={setGithubUrl}
              placeholder="https://github.com/you"
            />
          </div>

          {/* Bio — full width */}
          <div style={{ gridColumn: "1 / -1" }}>
            <label
              className="mb-1 block font-sans"
              style={{ fontSize: "13px", color: "var(--text-muted)" }}
            >
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What kind of agents do you build?"
              rows={3}
              className="w-full resize-none font-sans outline-none"
              style={{
                padding: "9px 12px",
                borderRadius: "6px",
                fontSize: "14px",
                color: "var(--text)",
                border: "1px solid var(--border)",
                background: "var(--bg)",
              }}
            />
          </div>

          {/* Categories — full width pill picker */}
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
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  background: "var(--bg)",
                  width: "220px",
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Pinned footer */}
      <div
        style={{
          padding: "16px 40px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          {error && (
            <p className="font-sans" style={{ fontSize: "13px", color: "var(--error)" }}>
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
              borderRadius: "8px",
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
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: 500,
              background: "var(--text)",
              color: "var(--inverse-text)",
              border: "none",
              cursor: "pointer",
            }}
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  value,
  onChange,
  placeholder,
  helper,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  helper?: string;
}) {
  return (
    <div>
      <label className="mb-1 block font-sans" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
        {label}
        {required && <span style={{ color: "var(--error)" }}> *</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full font-sans outline-none"
        style={{
          padding: "9px 12px",
          borderRadius: "6px",
          fontSize: "14px",
          color: "var(--text)",
          border: "1px solid var(--border)",
          background: "var(--bg)",
        }}
      />
      {helper && (
        <p className="mt-1 font-sans" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          {helper}
        </p>
      )}
    </div>
  );
}
