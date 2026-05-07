---
type: research
status: snapshot
last_updated: 2026-05-07
related_decisions: D34, D40
---

# Documentation platform research — 2026-05-07

User asked: "Research how big companies / startups display documentation. Sidebars showing different parts, clickable elements, indexing, install guides for the npm package + CLI. Don't want a separate website unless necessary."

This doc surveys six exemplars (Stripe, Vercel, Resend, Anthropic, Supabase, Linear), the two main tooling options (Mintlify and Fumadocs), and lands on a concrete recommendation + IA proposal + migration plan for Straw's docs surface.

## TL;DR

- Recommend **Fumadocs**, a Next.js-native docs framework, mounted at **`/docs` on `straw.wiki`** (no separate domain).
- Mintlify is the path of least resistance (hosted, AI-native, used by Anthropic / Coinbase / Vercel) but costs a subscription, lives off-platform, and can't share auth with the main app. Fumadocs is free, open-source, colocated, and lets us do agent-first docs (a logged-in agent sees their own tier inline in examples).
- IA proposal below: **Get Started → Concepts → Guides → CLI → SDK → MCP → API Reference → Webhooks → Decisions → Changelog.** Auto-generated bits: API ref from OpenAPI, MCP tool ref from package source.
- Migration is mechanical — most of `tasks/*.md` content fits cleanly under Concepts or Guides. The CLAUDE.md anchors stay where they are; docs site reads from a separate `content/docs/` tree.

## Patterns observed across exemplars

### Layout — universal three-pane

Every modern docs site I looked at uses some flavor of:

1. **Left sidebar** — sticky, collapsible by section. Hierarchical (top-level groups → pages → page-level subheadings sometimes).
2. **Main content pane** — centered, max-width ~720–800px for prose. MDX-rendered.
3. **Right "On this page" pane** — auto-generated ToC of headings on the current page, scroll-spy highlighted.

Top bar carries: logo, top-level section switcher (e.g., Stripe's "API Reference / Docs / Support"), search (almost always cmd+K), version selector if applicable, dark/light toggle, and increasingly an "Ask AI" button.

### Content patterns

- **Quickstart cards on the docs home** — icon + 1-line title + 1-line description, linking to a language-specific quickstart. Resend exemplifies this: 13 cards (Node / Python / Go / Rust / Elixir / Java / .NET / Next.js / Express / Laravel / Rails / Ruby / CLI). Supabase same pattern with frameworks.
- **Tabbed code examples** — same operation, multiple languages. Stripe's API ref toggles cURL / Ruby / Python / Node / PHP / Go / .NET. Mintlify and Fumadocs both ship `<CodeGroup>` / `<Tabs>` components for this.
- **Copy buttons** on every code block (clipboard icon top-right of block).
- **Callouts** — `<Note>` / `<Warning>` / `<Tip>`. Color-coded, icon-prefixed, indent-bordered.
- **OpenAPI auto-generation** — for the API reference half. Mintlify and Fumadocs both render an OpenAPI spec into a sidebar tree of endpoints, each with method badges (GET/POST), example requests/responses, and a "Try it" button (Stripe, Anthropic, Resend, Supabase).

### AI affordances (universal in 2026)

- **"Ask AI" / chat button** in the top right of every docs page. Stripe, Anthropic, Mintlify-default sites all ship this OOB.
- **`llms.txt`** at the docs root — Resend, Vercel, Anthropic all advertise one. Straw already has `/llms.txt` at the site root (Tier 0 of D37).
- **Per-page context for the AI chat** — when you click "Ask AI" from a specific page, the chat seeds with that page's content as context.

### Reference vs Guides split

Universal pattern:

- **Guides** = tutorial-style, prose-heavy, in narrative order. "How to send your first email." "How to register an agent." Manually authored.
- **Reference** = auto-generated from a spec. Endpoint-by-endpoint, exhaustive, terse.
- **Concepts** = the mental model. "What is a webhook?" "Why does Straw have tiers?" Lives between Guides and Reference.

Mintlify, Fumadocs, and Stripe all have explicit top-level switching between "Guides" and "API Reference" — they're rendered with different layouts (reference is denser, with method+path in the sidebar).

### Distinctive moves worth stealing

- **Stripe's API reference layout**: three columns wide on desktop. Sidebar (endpoint tree) → main (description + parameters table) → right (request/response examples in tabs). Densest practical layout I've seen.
- **Anthropic's "use in console"**: a button next to every code example that opens that example in their playground. Closes the gap between "I read the example" and "I ran the example."
- **Linear's typography**: minimal, lots of whitespace, no chrome. Reads like a Notion page. Distinctive vs the dense Stripe / Vercel layouts. Conveys "this product is opinionated about restraint."
- **Vercel's `install_vercel_plugin` frontmatter** + agent skills: every doc page has structured front-matter + the docs are read by agents at deploy time. Their docs are dual-purpose (humans + agents). Worth mirroring.
- **Supabase's product switcher** in the top nav (Database / Auth / Storage / Realtime / etc.) — each product gets its own sidebar. Useful pattern when one platform has many distinct products. Probably overkill for Straw initially; revisit at scale.

## Tooling options

### Option A — Mintlify (hosted, MDX + Git)

**What it is:** SaaS docs platform. You write MDX in a GitHub repo, Mintlify auto-deploys to `<your-project>.mintlify.app` (or a custom domain). Their bot watches the repo and redeploys on push.

**Customers:** Anthropic, Coinbase, HubSpot, Zapier, AT&T, Perplexity, X (Twitter), Vercel (some properties), Replit, Resend, Vapi, Hume.

**Setup:** ~30 minutes from zero. Connect GitHub, pick a starter, write MDX, push. Their CLI (`mint dev`) gives you `localhost:3000` preview.

**Pros:**
- Best-in-class default UX. Sidebar / search / dark mode / "Ask AI" / OpenAPI auto-render all OOB.
- Built-in AI chat trained on your docs. Matches our agent-first thesis well.
- Massive ecosystem of validators, deploy hooks, analytics.
- Web editor for non-technical contributors.
- The "default look" of modern SaaS docs (we'd look serious immediately).

**Cons:**
- Subscription cost. Pricing is gated; likely $X00/mo at the team tier. Not free.
- Lives off-platform — `docs.straw.wiki` would CNAME to Mintlify. Auth doesn't compose with Straw's session.
- Can't show user-specific content inline (e.g., "your wallet is currently set to X"). Static docs only.
- Less control over the page shell. You're inside their layout.
- Vendor lock-in; migrating off later is non-trivial (their MDX uses their components).

### Option B — Fumadocs (Next.js-native, open-source)

**What it is:** Free, open-source docs framework for React/Next.js. You install the package, it gives you components (`<DocsLayout>`, `<DocsPage>`, `<TableOfContents>`, `<Sidebar>`, etc.) and a content engine that reads MDX from a directory. Mounts as a route in your existing Next.js app.

**Customers:** Endorsed by shadcn (shadcn/ui) and Vercel folks; growing community. Used by smaller projects but quality is high.

**Setup:** `pnpm create fumadocs-app` for a new app, OR mount at `/docs` of the existing Next.js app via `fumadocs-mdx` + `fumadocs-ui`. ~2–4 hours to a working layout for our scale.

**Pros:**
- **Free, open-source, MIT.**
- **Colocated with `straw.wiki`.** Same Next.js app, same auth, same brand. Logged-in users see "your api_key is X" rendered inline in code examples. Operators see their token list. **This is huge for the agent-first story.**
- Composable. We can drop in our own React components anywhere — e.g., a `<RegisterAgentDemo>` that actually mints a key against the staging API right from the docs page.
- Native MDX, native search (Orama built-in, or upgrade to Algolia), native ToC, native code-tabs, native callouts.
- App Router native. Server components for content rendering means fast loads + SEO.
- OpenAPI rendering supported.
- Migrating off is easy because content is plain MDX in our repo.

**Cons:**
- More setup work than Mintlify (~2-4 hours vs ~30 min).
- We own the chrome. If Fumadocs ships an update, we have to update.
- AI-chat ("Ask AI") is not OOB; we'd build it ourselves (~1 day of work using our existing Gemini infra; the dashboard already has an Ask panel — commit `f6c6487`).
- Less polished by default — looks like a fresh shadcn install until we theme it. Not a Mintlify-grade visual default.

### Option C — Don't build a docs site; keep `/api/docs` + `/llms.txt`

**Status quo.** We have:
- `/api/docs` — JSON-formatted full agent loop, 600+ lines, machine-readable.
- `/llms.txt` — Markdown index for LLMs.
- `/.well-known/agent.json` — capability manifest.
- Blog-style markdown in `tasks/*.md` (humans only).

**Pros:** Zero new work. Already optimized for the agent-first audience.

**Cons:** No human-facing surface. Investors / team / hiring candidates / first 10 paying customers all want a "docs" link from the homepage. Right now we don't have that.

## Recommendation

**Ship Fumadocs at `straw.wiki/docs`.**

Reasoning:

1. **Agent-first composition.** We can render code examples that include the *visiting agent's* api_key, tier, and wallet state. Mintlify can't do this. This directly extends the AGENT_FIRST_DREAM doctrine (D40) — the docs aren't a static read, they're a live surface.
2. **No subscription cost.** We're pre-revenue; subscription docs platforms make sense post-Series-A.
3. **Brand consistency.** `straw.wiki/docs` reads, looks, and feels like the rest of the app. Mintlify's layout would clash with the brand foundation we just shipped.
4. **Migrating off is easy.** Content is MDX in our repo. If we outgrow Fumadocs we can move to anything that reads MDX (which is everything).
5. **Strategic moat:** docs that *do something* (mint a real key, hit a real endpoint, render real telemetry) are a wedge over competitors with read-only docs.

If timing is critical and you want docs in production tomorrow, **fall back to Mintlify** — it's the right answer for "we need it now and we'll iterate on agent-native features later."

## Information architecture proposal

```
Straw Docs (sidebar tree)
│
├── Get Started
│   ├── Welcome (what is Straw, the two-role pitch — D40)
│   ├── Quickstart — CLI (`npx @strawai/cli register` → submit → watch)
│   ├── Quickstart — TypeScript SDK
│   ├── Quickstart — cURL / API direct
│   └── Quickstart — MCP (Claude Desktop / Cursor / Claude Code config)
│
├── Concepts
│   ├── Two roles, both agent-first (D40)
│   ├── Tiers (verified / operator_child / staked / anonymous / dev)
│   ├── Wallet & payouts
│   ├── Submission lifecycle
│   ├── Eval pipeline (rubric, judge, scoring)
│   ├── Bounty firehose (D39)
│   └── Universal roles — agents post too
│
├── Guides
│   ├── Bootstrap an autonomous agent (path C — anonymous)
│   ├── Run a fleet of agents (path B — operator tokens)
│   ├── Stake to bootstrap (path A — USDC)
│   ├── Set a payout address
│   ├── Subscribe to new bounties
│   ├── Build a competing agent (full walkthrough)
│   ├── Post a bounty (agent or human)
│   └── Win and get paid (the wallet → payout flow)
│
├── CLI (@strawai/cli)                ← auto-generated from CLI source
│   ├── Install
│   ├── register / login / logout
│   ├── whoami
│   ├── wallet (get / set)
│   ├── tasks (list / detail)
│   ├── submit / watch
│   └── subscribe
│
├── SDK (@strawai/agent-sdk)          ← auto-generated from TypeScript types
│   ├── Install
│   ├── Quickstart
│   ├── client.tasks
│   ├── client.submissions
│   ├── client.agent
│   ├── client.wallet
│   ├── client.operatorTokens
│   ├── client.bounties
│   ├── client.workspace
│   ├── client.search
│   ├── client.eval
│   └── registerAnonymous / mintChildKey
│
├── MCP (@strawai/mcp-server)         ← auto-generated from tool registrations
│   ├── Install (stdio + HTTP transports)
│   ├── Configure for Claude Desktop / Cursor / Claude Code
│   ├── Tool reference (categorized: agent / wallet / tasks / submissions / workspace / search / eval / company)
│   └── HTTP transport details
│
├── API Reference                     ← auto-generated from OpenAPI
│   ├── Authentication
│   ├── Agents
│   ├── Wallet
│   ├── Operator Tokens
│   ├── Tasks
│   ├── Submissions
│   ├── Bounties (firehose)
│   ├── Workspace (KV + Files)
│   ├── Search
│   ├── Eval (preview)
│   └── Webhooks
│
├── Webhooks
│   ├── Overview
│   ├── Configure & verify
│   ├── Event reference
│   └── Coinbase Commerce webhook (D37 path A)
│
├── Architecture decisions             ← curated subset of tasks/DECISIONS.md
│   ├── D37 — autonomous identity + wallet
│   ├── D38 — CLI
│   ├── D39 — bounty firehose
│   ├── D40 — doctrine reset
│   └── (link to GitHub for the full log)
│
└── Changelog                          ← per-version release notes
    ├── @strawai/cli releases
    ├── @strawai/agent-sdk releases
    └── @strawai/mcp-server releases
```

Top-level sidebar groups: 9 sections. Initial scope: Get Started + Concepts + Guides + CLI + SDK + MCP. API Reference, Webhooks, Decisions, Changelog can land in the second pass.

## Distinctive features to ship (Fumadocs path)

If we go Fumadocs, the moves that differentiate us from a stock Mintlify-clone:

1. **Logged-in agent context.** When the visitor is signed in (NextAuth session), code examples on every page substitute their actual `agent_id` and a redacted prefix of their api_key into the snippet. "Try this on your account" instead of "here's a generic example."
2. **Live "Run this in your browser" buttons.** Some examples (`whoami`, `wallet get`, `tasks list`) are read-only and safe to execute against the visitor's own session. Click → result rendered inline. Like Anthropic's "use in console" but better.
3. **Tier-aware docs.** Anonymous-tier visitors see a banner: "These submissions don't count for the leaderboard until you cross the floor — here's how to clear it." Verified-tier visitors don't see that banner.
4. **MCP one-click install.** A `<McpInstall client="claude-code" />` component renders the right `claude_desktop_config.json` snippet for the chosen client, with the visitor's api_key already filled in.
5. **/docs/llms.txt** scoped to docs only (vs the existing root /llms.txt). Lets agents fetch a docs-only index.
6. **Edit on GitHub** link on every page → `github.com/Jeremyliu-621/straw/edit/master/content/docs/<path>.mdx`.
7. **Last updated** timestamp from git blame.
8. **Versioning later.** When the API hits v2, add a version selector. Not needed for v1.

## Migration plan from `tasks/*.md`

Most of the markdown that's already in `tasks/` belongs in either Guides or Concepts. The CLAUDE.md anchors stay where they are (they're for *future Claude*, not for end-users); docs site reads from a separate `content/docs/` tree.

| Existing source | Destination doc page |
|---|---|
| `tasks/REQUIREMENTS.md` (post-D40 banner version) | Concepts → Two roles, both agent-first |
| `tasks/HOW_IT_WORKS.md` | Concepts → Submission lifecycle + Eval pipeline (split) |
| `tasks/AGENT_FIRST_DREAM.md` | Concepts → Universal roles (the doctrine itself) |
| `tasks/proposals/agent-first-customer-2026-05-07.md` | Architecture decisions → D37/D38/D39 (curated) |
| `packages/cli/README.md` | CLI → Install + per-command pages |
| `packages/agent-sdk/README.md` | SDK → Install + Quickstart |
| `packages/mcp-server/README.md` | MCP → Install + Configure |
| `src/app/api/docs/route.ts` (the JSON) | API Reference (auto-generated from OpenAPI later; for v1 transcribe by hand) |
| `src/app/.well-known/agent.json` | Get Started → Welcome (cite + link) |
| `public/llms.txt` | Get Started → Welcome (cite + link) |

Sequence:

1. **Phase 1 — Stand up Fumadocs.** `pnpm dlx create-fumadocs-app` into a `docs/` subdirectory of the existing app, OR install `fumadocs-ui` + `fumadocs-mdx` directly into the Next.js app and mount at `/docs`. Decision: mount in-app (avoids two Next.js apps). ~2-4 hours.
2. **Phase 2 — Get Started + Concepts pages.** Migrate REQUIREMENTS / HOW_IT_WORKS / AGENT_FIRST_DREAM into MDX. Ship the four quickstarts (CLI / SDK / cURL / MCP). ~half a day.
3. **Phase 3 — CLI / SDK / MCP reference.** One page per command / resource / tool. Most can be auto-generated by a script that reads the source TS. ~half a day.
4. **Phase 4 — API Reference.** Author an OpenAPI spec for `/api/v1/*` (the existing `/api/docs` JSON is most of the way there). Render via Fumadocs OpenAPI plugin. ~1 day.
5. **Phase 5 — Distinctive features.** Logged-in agent context, MCP one-click install, tier-aware banners. ~1-2 days.

**Total: 4-5 days of focused work for a v1 docs site.** Comparable to Mintlify migration (which is faster to set up but slower to differentiate).

## Open questions for you

1. **Mintlify or Fumadocs?** I lean Fumadocs (above). If you want to ship docs this week and care less about the agent-aware-rendering moat, Mintlify is the right answer.
2. **Subdomain or path?** `docs.straw.wiki` (subdomain) or `straw.wiki/docs` (path)? Path is simpler (no DNS, no separate deployment). Subdomain is what big-co's do (Stripe / Vercel / Anthropic) but adds complexity. Recommend path until traffic > 100K/mo.
3. **OpenAPI now or later?** API Reference is the most-asked-for section by enterprise customers. If we want it in v1, we need an OpenAPI spec — which means writing it (the JSON in `/api/docs` is a head-start). Rough estimate: 1 day. Defer to v1.5?
4. **Search vendor?** Fumadocs ships with Orama (free, in-process). Algolia is the gold standard but $X0/mo. Recommend Orama until we have content scale.
5. **Visual style?** Match the existing app brand (Cormorant Garamond + custom palette) or go full-clean-tech (Inter + neutral grays like Mintlify default)? Recommend match-existing — docs should feel like the same product.

## What I deliberately did not propose

- A separate `straw.wiki/wiki` site for internal team docs (`tasks/*.md`). Those files stay in the repo, served only via the README graph + `tasks/README.md`. They're for Claude and for us, not for users.
- An interactive playground / sandbox like Stripe's API explorer. That's a v2+ effort; for v1, "Run this in your browser" buttons on safe read-only endpoints are 80% of the value.
- A "video tutorials" section. Premature.
- Full multi-language SDK (Python / Go) docs. We only have TypeScript today; don't promise more.

## Appendix: exemplar sites cataloged

| Site | URL | Platform | Distinctive moves |
|---|---|---|---|
| Stripe API Reference | https://docs.stripe.com/api | Custom (Markdoc) | Three-column dense reference layout; in-page tabbed code examples; per-endpoint try-it |
| Vercel Docs | https://vercel.com/docs | Custom (Next.js) | Frontmatter-rich (each doc is structured); agent-readable; product switcher |
| Resend Docs | https://resend.com/docs | Mintlify | Quickstart cards by language (13 framework cards); MDX with custom React components |
| Anthropic Docs | https://platform.claude.com/docs | Mintlify | "Use in console" button on every code example; AI chat |
| Supabase Docs | https://supabase.com/docs | Custom (Next.js) | Top-nav product switcher; explicit Guides vs Reference split; framework quickstart cards |
| Linear Docs | https://linear.app/docs | Custom (Next.js) | Minimalist typography; AI as a sidebar item; no chrome |
| Mintlify (the platform) | https://mintlify.com | (its own product) | AI-native, MDX in Git, hosted, auto-deploy on push |
| Fumadocs (the framework) | https://fumadocs.dev | (Next.js library) | Composable, OSS, twoslash, OpenAPI rendering, Orama search |
