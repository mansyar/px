## Summary

This track closes three accepted engineering-debt items without changing product behavior: all seven `scripts/**/*.mjs` files are now under Biome with zero findings and no weakened rules, 12 stale runtime-state files were removed while the active run file was retained, and a dated live note in `conductor/tech-stack.md` reconciles archived point-in-time prose. The published quality gate and all 215 archived files are byte-identical.

## Track

- **ID:** `20261119-engineering-debt-sweep`
- **Type:** chore
- **Spec:** [`conductor/archive/20261119-engineering-debt-sweep/spec.md`](conductor/archive/20261119-engineering-debt-sweep/spec.md)
- **Plan:** [`conductor/archive/20261119-engineering-debt-sweep/plan.md`](conductor/archive/20261119-engineering-debt-sweep/plan.md)
- **Review:** [`conductor/archive/20261119-engineering-debt-sweep/review.md`](conductor/archive/20261119-engineering-debt-sweep/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Bring scripts/ under Biome | Cover every script with Biome and fix findings without weakening rules | verified | `a49c3276b634e4dc190df8f6cd29d47bc1dcc37c` | Seven scripts, not four; all fixed; no suppressions or deps |
| 2: Runtime-state and live-doc hygiene | Remove stale run files and reconcile archived prose with a dated live note | verified | `af2c362c4bf40554276a5c726bd0404db04cec50` | 12 stale run files removed; archive compare 215/215; squash skipped for primary docs commit |
| 3: Closeout decision and integrated record | Record the honest debt-sweep closeout with final checks | verified | `ec1968ea1acdb5a3bb952d479955d992495e757f` | `DEBT SWEEP CLOSED`; residual accepted debt listed |
| R1: Review Fixes | Resolve the single Low plan-presentation finding | verified | `73eba3c8cf68df684dfde1100aa257f03570f7d8` | Phase 2/3 acceptance blocks made live text in plan.md |

## Requirements

- [x] `FR-1` — seven scripts under Biome, findings fixed without weakening rules
- [x] `FR-2` — stale run-state files removed, active file retained
- [x] `FR-3` — dated live clarification added to `conductor/tech-stack.md`
- [x] `FR-4` — `scores.json` and all archives byte-identical
- [x] `FR-5` — exact commands, counts and digests recorded in evidence
- [x] `NFR-1` — no dependencies added, no suppression or rule weakened
- [x] `NFR-2` — `pnpm verify` and scoped coverage green
- [x] `NFR-3` — change scope limited to allowed files
- [x] `NFR-4` — archives frozen (215/215, 0 mismatches)
- [x] `NFR-5` — active run file never removed
- [x] `AC-1` — `pnpm exec biome check scripts/` exit 0
- [x] `AC-2` — verify and coverage gates green
- [x] `AC-3` — 12 stale run files removed; active file retained
- [x] `AC-4` — dated note present; archives byte-identical
- [x] `AC-5` — scores hash unchanged; diff scope clean
- [x] `AC-6` — closeout and integrated evidence committed

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| static | `pnpm verify` | pass (119 files / 1028 tests; build clean) | `conductor/archive/20261119-engineering-debt-sweep/verification/integrated.md` |
| lint | `pnpm exec biome check scripts/` | pass (7 files, 0 errors) | `verification/scripts-coverage.md` |
| coverage | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | pass (95.02 / 85.72 / 98.33 / 94.82%) | `verification/integrated.md` |
| determinism | `pnpm vitest run --project goldens` | pass | `verification/integrated.md` |
| gate | `node scripts/rubric-report.mjs` | pass (mean 3.82) | `verification/debt-sweep.md` |
| integrity | archive compare + `scores.json` hash | pass (215/215; unchanged) | `verification/state-hygiene.md` |

## Review

- **Verdict:** `PASS` (after review-fix round 1)
- **Rounds:** 2 (round 1 PASS WITH FINDINGS, round 2 PASS)
- **Fixed:** 1 Low finding (F1)
- **Accepted/deferred:** 0 — see `review.md`

## Deviations and risks

- Brief baseline said four scripts; Biome glob covers seven. All seven were fixed and the deviation recorded.
- Full `checkJs` typing remains accepted debt (158 baseline errors); not attempted in this scope.
- Pre-existing out-of-scope Biome warning at `test/recipe/version-1-2.test.ts:50` was left untouched.
- Archived point-in-time prose is preserved; a dated live note marks it historical. All 215 archive files were re-hashed unchanged.
- Phase 2 squash was skipped because a primary-owned docs commit was in range; task commits retained.
- R1 fix was executed by the primary because `plan.md` is primary-owned and forbidden to phase subagents.

## Follow-ups

- none

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>

# Squash commits
git revert --no-edit a49c3276b634e4dc190df8f6cd29d47bc1dcc37c
git revert --no-edit ec1968ea1acdb5a3bb952d479955d992495e757f
git revert --no-edit 73eba3c8cf68df684dfde1100aa257f03570f7d8
```

Restoring stale run-state files would reintroduce the cleaned runtime debt; no product data migration is needed.

