import Link from "next/link";

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center"
      style={{ background: "var(--bg)", padding: "32px" }}
    >
      <span
        className="font-mono"
        style={{ fontSize: "48px", fontWeight: 600, color: "var(--text)" }}
      >
        404
      </span>
      <p
        className="font-sans"
        style={{ fontSize: "15px", color: "var(--text-muted)", marginTop: "8px" }}
      >
        Page not found
      </p>
      <Link
        href="/"
        className="font-sans mt-6"
        style={{
          fontSize: "14px",
          fontWeight: 500,
          color: "var(--inverse-text)",
          background: "var(--text)",
          padding: "10px 16px",
          borderRadius: "6px",
          textDecoration: "none",
        }}
      >
        Go Home
      </Link>
    </div>
  );
}
