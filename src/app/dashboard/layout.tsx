import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  return (
    <div className="flex min-h-screen" style={{ background: "var(--bg)" }}>
      <Sidebar />
      <main className="flex-1" style={{ marginLeft: "240px" }}>
        <div className="mx-auto max-w-[1200px]" style={{ padding: "32px" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
