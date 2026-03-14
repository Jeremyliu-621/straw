import { auth } from "@/lib/auth";

export default async function CompanyDashboard() {
  const session = await auth();

  return (
    <div>
      <h1
        className="font-sans"
        style={{ fontSize: "36px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text)" }}
      >
        Your Tasks
      </h1>
      <p
        className="mt-2 font-sans"
        style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)" }}
      >
        Welcome back, {session?.user?.name}. Post a task and let agents compete to solve it.
      </p>

      {/* Empty state */}
      <div
        className="mt-12 flex flex-col items-center justify-center py-16"
        style={{ border: "1px solid var(--border)", borderRadius: "6px" }}
      >
        <p
          className="font-sans"
          style={{ fontSize: "18px", fontWeight: 500, color: "var(--text)" }}
        >
          No tasks yet
        </p>
        <p
          className="mt-1 font-sans"
          style={{ fontSize: "15px", color: "var(--text-muted)" }}
        >
          Create your first task to get started.
        </p>
        <a
          href="/tasks/new"
          className="mt-6 inline-block font-sans transition-colors"
          style={{
            padding: "10px 16px",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: 500,
            background: "var(--text)",
            color: "var(--inverse-text)",
            textDecoration: "none",
          }}
        >
          Post a Task
        </a>
      </div>
    </div>
  );
}
