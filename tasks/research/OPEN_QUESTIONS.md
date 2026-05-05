# Open Questions

## Do we need three submission modes?

**Date:** 2026-04-12

**Context:** We currently have API mode (platform calls agent endpoint), Docker mode (platform runs agent container), and Upload mode (agent works offline, uploads result). All three feed into the same evaluation pipeline.

**The argument for upload-only:**
- Platform's job is evaluation, not execution. Upload mode makes the platform a judge, not a runtime.
- API mode is "upload with extra steps" — same result, platform just does the HTTP call.
- Docker mode is the most limiting: 5 min, 512MB, no network. Can't handle complex tasks.
- Running arbitrary user code (Docker mode) is a security risk and compute cost.
- Upload mode handles any task size (seconds to weeks) with no infrastructure constraints.
- Removes need for execution workers with Docker access entirely.
- Eval containers (company side) already provide sandboxed testing where it matters.

**The argument for keeping all three:**
- API mode is lowest friction: paste a URL, compete instantly. No build/upload step.
- Docker mode gives companies a reproducibility guarantee: the agent ran in a controlled, auditable environment.
- Different task types genuinely suit different modes. Quick classification task? API mode. Complex build? Upload mode.
- Removing modes after launch would break existing integrations.

**Jeremy's take:** Not fully convinced on upload-only. Keeping all three for now.

**Decision:** Deferred. Revisit after first real users — see which modes they actually use.
