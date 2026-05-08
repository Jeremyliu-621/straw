# Overnight elevation loop — wakeup summary

**Started:** 2026-05-08, late night
**Worktree:** `C:/Users/jerem/code2026/personal-projects/mop-elevate`
**Branch:** `feat/overnight-elevate-2026-05-08`
**Cron:** `83703d10` — fires every 2h at :07 (session-only, dies if Claude session ends; auto-expires in 7 days)

## How to read what happened while you slept

```sh
cd C:/Users/jerem/code2026/personal-projects/mop-elevate
git log --oneline master ^c84c47a   # all elevation commits since last pre-sleep state
cat tasks/HANDOFF.md | head -60      # iteration log
```

Each iteration writes a section in `tasks/HANDOFF.md > Iteration log`.
Each shipped fix is one commit on master with author `Jeremy Liu`.

## Iteration 1 (foreground, before sleep) — compete-side journey

Customer subagent registered fresh, hit `/.well-known/agent.json`,
walked the docs, registered, got an api_key, set a wallet, found a
task, submitted — and stalled at the eval pipeline. The eval-worker
gap is known infra-not-deployed, out of scope.

**Three other bugs the customer hit were code-fixable and shipped (`1a23823` on master):**

1. SSE submission stream's `terminal` event fired the moment status
   reached `completed`, even with `evaluated: false`. Every
   `wait_for_submission` SDK helper was returning a row with
   `scores: null`. Added `isSubmissionFullyTerminal()` that respects
   the two-field contract.
2. `GET /api/v1/tasks` returned long-expired tasks. The doc claim
   "filtered automatically" was a lie. Added `.gt("deadline", now)`.
3. Wallet endpoints (`/wallet`, `/wallet/verify/*`) were missing from
   `/api/docs`. Customer agent had to discover the `payout_method`
   enum from an INVALID_BODY response. Added all four with full
   request shapes and error codes.

## Loop policy

- Each iteration spawns a fresh "naive agent customer" subagent.
- It rotates through facets — `tasks/HANDOFF.md > Mission rotation`.
- Top finding gets fixed; the rest go back into the rotation tail.
- `npm run build` is the hard gate before push. Compile + bundle
  must pass; env-validation step in build can be skipped (Vercel has
  the env in prod).
- Master only fast-forwards on green. Broken commits stay on the
  feat branch and are documented in HANDOFF.
- Never publishes to npm (your 2FA), never schema-migrates, never
  force-pushes.

## Things I left for you to decide / do

- **Eval worker / Hetzner.** This is the real bottleneck — submissions
  pile up in `running` because there's no consumer. The loop won't
  fix this autonomously per the rotation. When you wake up, the
  question is whether to provision Hetzner now or keep living on the
  half-loop.
- **mop and mop-overnight worktrees haven't pulled master.** Run
  `git pull --ff-only origin master` in each when convenient.
- **Vercel deploys all night.** If a deploy errors, that iteration's
  log entry will say so; check the most recent failure with
  `vercel ls --yes | head -3`.
- **Worktree node_modules.** I had to `npm install` in the new
  worktree (~1min, 809 packages). Don't worry about it — disk only.

## Kill switches

```sh
# stop the cron mid-night:
# (in this Claude session) /cron-list, then CronDelete on 83703d10

# revert all overnight commits and bail:
cd C:/Users/jerem/code2026/personal-projects/mop
git fetch origin master
git reset --hard c84c47a       # last commit before the loop
git push --force-with-lease origin master   # only if you want to undo
```
