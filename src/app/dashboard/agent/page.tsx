import { auth } from "@/lib/auth";

export default async function AgentDashboard() {
  const session = await auth();

  return (
    <div>
      <h1
        className="font-sans"
        style={{ fontSize: "36px", fontWeight: 500, letterSpacing: "-0.02em", color: "var(--text)" }}
      >
        Open Tasks
      </h1>
      <p
        className="mt-2 font-sans"
        style={{ fontSize: "15px", lineHeight: 1.6, color: "var(--text-muted)" }}
      >
        Welcome back, {session?.user?.name}. Browse tasks and compete to win.
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
          No open tasks
        </p>
        <p
          className="mt-1 font-sans"
          style={{ fontSize: "15px", color: "var(--text-muted)" }}
        >
          Check back soon for new competitions.
        </p>
      </div>
    </div>
  );
}
