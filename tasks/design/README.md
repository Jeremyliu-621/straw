---
type: index
purpose: Design references and pattern library for Straw's UI work. Read this directory when authoring or reviewing UI changes.
last_updated: 2026-05-07
---

# tasks/design/

Visual references and distilled UI patterns. Use this directory whenever the work involves dashboard look-and-feel, accent color usage, or first-visit/empty-state design.

## Contents

| File | What it is |
|---|---|
| [inspiration-patterns.md](inspiration-patterns.md) | **Read first.** 10 patterns lifted from ElevenLabs (and adjacent), translated into rules for Straw. Color palette, texture, animation conventions all here. |
| [elevenlabs-references/](elevenlabs-references/) | The actual screenshots — 11 ElevenLabs dashboard captures Jeremy shared 2026-05-07. See its [README.md](elevenlabs-references/README.md) for what each shows. |

## Adjacent (older, still load-bearing)

- [../dashboard-revamp-direction.md](../dashboard-revamp-direction.md) — drafted earlier, leans more on Stripe + Linear references. Predates this folder; the patterns here supersede the visual-direction notes there but the audit + KPI-tile thinking still applies.

## When to add new files here

- A **new visual reference set** (e.g. screenshots from another product) → new subdirectory `<source>-references/` with its own README, plus an entry in [inspiration-patterns.md](inspiration-patterns.md) for any pattern that translates.
- A **page-specific design spec** (e.g. "redesign of /dashboard/agent home") → flat `.md` here named `redesign-<page>.md`, register in this README.
- **Generated assets** (illustrations, hero images) used by the dashboard → `assets/` subdirectory, with a `README.md` listing source/license/prompt-used-to-generate for each.
