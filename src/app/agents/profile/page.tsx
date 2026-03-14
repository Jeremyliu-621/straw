"use client";

import { useEffect, useState } from "react";

interface Profile {
  display_name: string;
  docker_image: string | null;
  bio: string | null;
  github_url: string | null;
  categories: string[];
}

export default function AgentProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form fields
  const [displayName, setDisplayName] = useState("");
  const [dockerImage, setDockerImage] = useState("");
  const [bio, setBio] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [categories, setCategories] = useState("");

  useEffect(() => {
    fetch("/api/agents/profile")
      .then((res) => res.json())
      .then((data: Profile) => {
        setProfile(data);
        setDisplayName(data.display_name);
        setDockerImage(data.docker_image ?? "");
        setBio(data.bio ?? "");
        setGithubUrl(data.github_url ?? "");
        setCategories(data.categories.join(", "));
      })
      .catch(() => setMessage({ type: "error", text: "Failed to load profile" }))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/agents/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          docker_image: dockerImage || undefined,
          bio: bio || undefined,
          github_url: githubUrl || undefined,
          categories: categories
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
        }),
      });

      if (!res.ok) {
        setMessage({ type: "error", text: "Failed to save profile" });
        return;
      }

      setMessage({ type: "success", text: "Profile saved" });
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-lg" style={{ padding: "32px" }}>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
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

  return (
    <div className="mx-auto max-w-lg" style={{ padding: "32px" }}>
      <h1
        className="font-sans"
        style={{ fontSize: "36px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text)" }}
      >
        Your Profile
      </h1>
      <p
        className="mt-2 font-sans"
        style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)" }}
      >
        This is how companies see you. Keep it current.
      </p>

      <form onSubmit={handleSave} className="mt-8 space-y-5">
        <FormField label="Display Name" required value={displayName} onChange={setDisplayName} />
        <FormField
          label="Docker Image"
          value={dockerImage}
          onChange={setDockerImage}
          placeholder="ghcr.io/you/agent:latest"
          helper="Your agent's Docker image. Must be pullable by the platform."
        />
        <div>
          <label className="mb-1 block font-sans" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Bio
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="What kind of agents do you build?"
            rows={3}
            className="w-full resize-none font-sans outline-none"
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
        <FormField label="GitHub URL" value={githubUrl} onChange={setGithubUrl} />
        <FormField
          label="Categories"
          value={categories}
          onChange={setCategories}
          placeholder="code-generation, refactoring"
          helper="Comma-separated specializations"
        />

        {message && (
          <p
            className="font-sans"
            style={{
              fontSize: "13px",
              color: message.type === "error" ? "var(--error)" : "var(--success)",
            }}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !displayName}
          className="font-sans transition-colors disabled:opacity-40"
          style={{
            padding: "10px 16px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: 500,
            background: "var(--text)",
            color: "var(--inverse-text)",
          }}
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
}

function FormField({
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
          padding: "10px 12px",
          borderRadius: "6px",
          fontSize: "15px",
          color: "var(--text)",
          border: "1px solid var(--border)",
          background: "var(--bg)",
        }}
      />
      {helper && (
        <p className="mt-1 font-sans" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          {helper}
        </p>
      )}
    </div>
  );
}
