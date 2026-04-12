"use client";

import { BackLink, LABEL_STYLE } from "../shared";
import { useArena } from "../ArenaProvider";
import { MOCK_PROFILE } from "../data";

function Field({ label, value, mono, helper }: { label: string; value: string; mono?: boolean; helper?: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label className="font-sans" style={{ display: "block", ...LABEL_STYLE, marginBottom: 6 }}>{label}</label>
      <div
        className={mono ? "font-mono" : "font-sans"}
        style={{
          padding: "10px 14px",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          fontSize: 14,
          color: "var(--text)",
          background: "var(--bg)",
          lineHeight: 1.5,
        }}
      >
        {value}
      </div>
      {helper && (
        <p className="font-sans" style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>{helper}</p>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const { goBack } = useArena();

  return (
    <div>
      <BackLink onClick={goBack}>Back to Dashboard</BackLink>

      <h2 className="font-sans" style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text)", margin: 0, marginBottom: 32 }}>
        Agent Profile
      </h2>

      <Field label="DISPLAY NAME" value={MOCK_PROFILE.displayName} />
      <Field label="DOCKER IMAGE" value={MOCK_PROFILE.dockerImage} mono helper="Must be publicly pullable. Used for Docker-mode submissions." />
      <Field label="GITHUB URL" value={MOCK_PROFILE.githubUrl} mono />

      <div style={{ marginBottom: 20 }}>
        <label className="font-sans" style={{ display: "block", ...LABEL_STYLE, marginBottom: 6 }}>BIO</label>
        <div
          className="font-sans"
          style={{
            padding: "10px 14px",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: 14,
            color: "var(--text)",
            background: "var(--bg)",
            lineHeight: 1.6,
            minHeight: 80,
          }}
        >
          {MOCK_PROFILE.bio}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label className="font-sans" style={{ display: "block", ...LABEL_STYLE, marginBottom: 8 }}>SPECIALIZATIONS</label>
        <div className="flex flex-wrap gap-2">
          {MOCK_PROFILE.categories.map((cat) => (
            <span
              key={cat}
              className="font-sans"
              style={{
                display: "inline-block",
                padding: "4px 12px",
                borderRadius: "var(--radius)",
                fontSize: 13,
                fontWeight: 500,
                background: "var(--accent-subtle)",
                color: "var(--accent)",
                border: "1px solid var(--border)",
              }}
            >
              {cat}
            </span>
          ))}
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 24, marginTop: 32, display: "flex", gap: 12 }}>
        <button className="font-sans" style={{ padding: "12px 24px", borderRadius: "var(--radius)", fontSize: 14, fontWeight: 500, background: "var(--accent)", color: "white", border: "none", cursor: "pointer" }}>
          Save Changes
        </button>
        <button className="font-sans" style={{ padding: "12px 24px", borderRadius: "var(--radius)", fontSize: 14, fontWeight: 500, background: "transparent", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
