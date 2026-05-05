---
type: index
purpose: Index for tasks/ops/. Scaling, audits, agent session logs.
last_updated: 2026-05-04
---

# tasks/ops/

Operational reference: scale ceilings, security audits, and the chronological logs of overnight agent sessions. **Read these on demand** when the work touches deployment, scaling, or schema/permission changes.

For deployment instructions, see [DEPLOY.md](../../DEPLOY.md) at repo root. For decisions that came out of scale work, see DECISIONS.md (D13, D35).

---

## Scale planning

| File | What's in it | Status |
|---|---|---|
| [SCALE.md](SCALE.md) | Current scale ceilings — concurrency caps, build-check security ceiling on `execSync`, etc. The "what breaks at 100x" doc. | Active reference. |
| [SCALE_PASS_PLAN.md](SCALE_PASS_PLAN.md) | The plan to lift those ceilings. Pre-Phase 19 thinking; partly superseded by D13 (cheap-stack-now) + D35 (Hetzner) + Phase 19 (platform-native end-state). | Partial — historical banner inside. |

## Security + audits

| File | What's in it | Status |
|---|---|---|
| [SERVICE_ROLE_AUDIT.md](SERVICE_ROLE_AUDIT.md) | RLS policies + service-role usage audit. Where the platform layer enforces what the data layer would also enforce. | Active reference for any RLS-touching change. |

## Session logs (chronological agent work)

| File | What's in it | Status |
|---|---|---|
| [OVERNIGHT_LOG.md](OVERNIGHT_LOG.md) | Block-by-block ledger for `feat/collab-philosophy` overnight session. Pairs with [HANDOFF.md](../HANDOFF.md). | Branch-specific. |
| [overnight-log.md](overnight-log.md) | Earlier overnight session log. | Historical. |
| [overnight-log-scale-pass.md](overnight-log-scale-pass.md) | Scale-pass overnight session log. | Historical. |
| [WAKE_UP.md](WAKE_UP.md) | Session-briefing artifact from 2026-04-12. **Stale** — see banner at the top of the file pointing at the current eval architecture (D30). | Stale, kept for context. |

---

## Conventions

- **Don't edit historical logs.** Append-only is the rule. If a finding in an old log got superseded, flag the supersession in DECISIONS.md or the relevant new doc, not by rewriting history.
- Scale numbers decay. When you cite a ceiling (e.g., "the eval worker chokes at 100 concurrent submissions"), include the date you measured it.
- Audit findings should reference exact file:line locations, not vibes. See [lessons.md](../lessons.md) for why.
