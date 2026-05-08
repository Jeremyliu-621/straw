import { redirect } from "next/navigation";

export const metadata = {
  title: "Docs — Straw",
};

/**
 * /dashboard/docs — redirected to /docs as of 2026-05-07.
 *
 * The previous "show the same docs content inside the dashboard shell"
 * pattern was replaced by a real docs site at /docs (its own layout,
 * sidebar, search, ToC). Sidebar links pointing at /dashboard/docs land
 * users at the new docs surface.
 */
export default function DashboardDocsPage() {
  redirect("/docs");
}
