---
type: index
purpose: Index for tasks/archive/. Superseded but kept-for-context docs.
last_updated: 2026-05-04
---

# tasks/archive/

Empty for now.

This folder is the destination for docs that are **explicitly superseded but kept for historical context** — content the team chose not to delete because future sessions might want to know "what was the old plan, and why did we change it?"

---

## When to move a doc here

- A decision was reversed by a later D-entry in DECISIONS.md, AND the old doc isn't useful as active reference anymore.
- A research direction was abandoned, AND keeping the file in `research/` would mislead future sessions.
- A strategy pivot retired prior pitch material, AND the old version isn't worth keeping in `yc/` or `strategy/`.

## When NOT to move a doc here

- **Do not** archive something just because it's old. Old + useful stays where it is.
- **Do not** archive CLAUDE.md anchors at any cost (REQUIREMENTS, TASKS, DECISIONS, HOW_IT_WORKS, TESTING, lessons, todo).
- **Do not** archive HANDOFF.md until its branch has merged.

## Archiving procedure

1. `git mv` the file here, preserving its name.
2. At the top of the archived file, add a banner:
   ```
   > **Archived YYYY-MM-DD.** Superseded by [link]. Kept for historical context.
   ```
3. Update the README of its origin folder to remove the entry.
4. Update [tasks/README.md](../README.md) if the file was mentioned in the index.
5. Add a one-line entry to this README under "Archived contents" explaining what it was and why it was archived.

---

## Archived contents

(empty)
