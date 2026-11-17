# Phase R1 evidence — Review Fixes

- Track: `20261117-gate-instrument-reconciliation`
- Phase: R1 (Review Fixes)
- Date: 2026-11-17
- Branch: `chore/20261117-gate-instrument-reconciliation`
- Base: `640e72e` (docs(conductor): record review round 1 and open Phase R1)
- Head: `ec4a43c` (docs(conductor): align the baseline retry provenance)
- Result: **verified** — both tasks are complete and committed; the primary ran both gates at the phase head with exit 0.

## Task and commit table

| Task | Finding / FR | Change | Commit |
| --- | --- | --- | --- |
| R1.T1 | F1 (Medium), FR-7 | Deleted the three stale `tiebreak` arrays from `test/art/scores.json` (potion/lighting, humanoid/silhouette + humanoid/lighting, chest/lighting) and added a guard in `test/art/rubric.test.ts` that resolves every remaining tiebreak's asset, both passes and named criterion, and asserts an absolute A/B score difference greater than one. | `22e6063` — `test(art): remove stale tiebreaks and pin their validity` |
| R1.T2 | F2 (Low), FR-10 | Replaced the disagreeing retry prose in `verification/baseline.md` and `verification/integrated.md` with one statement in both: "Three passes required a retry after transient 503/429 and fetch failures." | `ec4a43c` — `docs(conductor): align the baseline retry provenance` |

## Recomputed verdict (unchanged)

Recomputed from the scores actually recorded, and re-asserted by the passing integrity suite:

| Field | Value |
| --- | --- |
| Result | `fail` |
| Mean | 3.25 (against publishable threshold 3.5) |
| Minimum allowed | 3.0 |
| Below-floor scores | 22 |
| Failure entries | 22 (each matches a below-floor score exactly) |

**The score values themselves did not change.** No score, rationale, asset, model, view, instrument field, verdict number or failure entry was edited. The only record change was the deletion of three stale `tiebreak` metadata arrays; the guard test walks zero remaining tiebreaks, so it passes vacuously today and fails loudly if a two-point tiebreak reason is reintroduced. Each deleted reason claimed a two-point disagreement, but the actual A/B deltas were 0 or 1 (potion lighting 1 vs 1; humanoid silhouette 4 vs 4; humanoid lighting 4 vs 3; chest lighting 1 vs 1), consistent with `baseline.md`'s maximum absolute delta of 1.

## Commands table

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Static + unit + integration + smoke + determinism + build | `pnpm verify` | 0 | typecheck, lint (1 pre-existing warning in `test/recipe/version-1-2.test.ts`, unrelated to this phase), 119 test files / 1028 tests passed, build succeeded |
| Scoped coverage | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | 0 | Primary run at phase head: 116 files / 996 tests, statements 94.97%, branches 85.69%, functions 98.33%, lines 94.77%. Thresholds unchanged at 80. |

## Findings coverage

- **F1 / FR-7:** addressed by R1.T1. Stale tiebreaks removed; verdict recomputes to the same failing record; a validity guard now pins any future tiebreak to a real >1-point pass disagreement.
- **F2 / FR-10:** addressed by R1.T2. Both documents now state the same precise retry count and cause; no other claim, score, verdict, log or digest changed.

## Do-not-regress check

- No digest, manifest, lockfile, threshold, coverage budget, publishable gate, score or rationale touched.
- No new dependency, no coverage ignore comment, no widened exclude, no lowered threshold, no reopened 4.0 gate.
- No primary-owned file edited (`plan.md`, `metadata.json`, `tracks.md`, `conductor/index.md`, `review.md`, `pr.md`, `spec.md`).
- All edits stayed within the phase `Touches` paths; no deviations.

## Blockers for the primary

- Resolved: the executor's shell denied the scoped coverage command; the primary ran it at phase head `ec4a43c` with exit 0 and recorded the result above.

## Primary verification

| Check | Result |
| --- | --- |
| Tree before acceptance | only untracked `verification/phase-R1.md` |
| Commits since `640e72e` | 2 (`22e6063`, `ec4a43c`), 0 merges, all inside declared `Touches` |
| `git diff 640e72e..HEAD -- test/art/scores.json` | 30 deletions, all inside three `tiebreak` arrays; no score, rationale, verdict or failure entry changed |
| Record after fix | verdict `fail`, mean 3.25, threshold 3.5, floor 3.0, 22 failures, instrument `gemini-4-hydrogen`, `fallback_used: false`, 0 tiebreak blocks |
| New integrity guard | `test/art/rubric.test.ts:250-268` resolves each remaining tiebreak to its asset's A/B pass and asserts `delta > 1`; passes with zero tiebreaks |
| `pnpm verify` | exit 0, 119 files / 1028 tests |
| Scoped coverage | exit 0, 116 files / 996 tests, 94.97% / 85.69% / 98.33% / 94.77% at unchanged 80% thresholds |

## Notes

Evidence file was left uncommitted by the executor for the primary, as required. Both review findings are closed at the cause; the score record is unchanged apart from removing metadata that contradicted its own measurements.
