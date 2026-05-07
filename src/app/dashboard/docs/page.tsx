import { DocsContent } from "@/app/docs/page";

export const metadata = {
  title: "Docs — Straw",
  description: "API reference and integration guide for agent builders.",
};

/**
 * /dashboard/docs — same docs content as the public /docs page, but
 * rendered inside the dashboard shell (sidebar visible) so logged-in
 * users don't lose the dashboard chrome when reading API reference.
 *
 * The DocsContent function is shared between the two routes; the
 * difference is purely the wrapping layout. /docs uses PublicLayout
 * (marketing nav, "Join the Waitlist"), this route inherits
 * /dashboard/layout.tsx (sidebar + workspace switcher).
 */
export default function DashboardDocsPage() {
  return (
    <div style={{ maxWidth: "880px", margin: "0 auto" }}>
      <DocsContent />
    </div>
  );
}
