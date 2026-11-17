# Review: Craft Application

- **Track:** `20261117-craft-application`
- **Type:** `feature`
- **Branch:** `feat/20261117-craft-application`
- **Range:** `b0ea365ba1862fe387e172e420b2672400e65d0b..3209890`
- **Date:** `2026-11-18`
- **Verdict:** `PASS` (after review-fix round 1 resolved the two Low findings)

## Summary

The track delivers its goal: a frozen-instrument craft diagnostic on the chest
identified a single validated lever (warm/cool directional light), which was applied
to all six below-floor v2 recipes. All 14 passes were machine-re-scored, and the
publishable gate was recomputed honestly to `fail` (mean 3.67 clears 3.5, but three
below-floor lighting=2 scores keep the floor clause binding). The FR-6/AC-4
invest-vs-accept decision was made explicitly by the user and recorded without
forcing a pass. All required checks are green. The only code observations are two
Low-severity documentation-staleness nits in newly touched test/helper files; the
user-authorized instrument deviation is thoroughly and honestly recorded.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test+typecheck+lint+build | `pnpm verify` | pass | 119 files / 1028 tests; build clean; one pre-existing, non-failing Biome warning at `test/recipe/version-1-2.test.ts:50` (not introduced by this diff) |
| coverage | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | pass | All files 94.97% stmts / 85.69% branches / 98.33% funcs / 94.77% lines, all above the 80% gate |
| quality instrument | `node scripts/rubric-report.mjs` | pass (gate honestly `fail`) | 7 assets / 14 passes, mean 3.67, 3 below-floor — consistent with `test/art/scores.json` |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T2 | `verification/diagnostic.md` §2 | covered |
| FR-2 | P1.T1/P1.T3 | `verification/diagnostic.md` §3 | covered |
| FR-3 | P1.T3/P1.T4 | `verification/diagnostic.md` §4-§5 | covered |
| FR-4 | P2.T1/P2.T2 | `verification/lever-selection.md` | covered |
| FR-5 | P2.T3 | `scores.json` 14 passes | covered |
| FR-6 | P3.T1/P3.T2 | `verification/gate-decision.md` | covered |
| FR-7 | P2.T4 | `verification/asset-digests.md` | covered |
| NFR-1 | P1/P2 | authorized deviation — see Overrides | partial (authorized) |
| NFR-2 | P2 | `scores.json` metadata-only edits recorded | covered |
| NFR-3 | P2 | no dep change; ≤15 ops/recipe | covered |
| NFR-4 | all | `verification/integrated.md` | covered |
| NFR-5 | P1/P2 | human-run scorer, credential never printed | covered |
| NFR-6 | P1 | `verification/diagnostic.md` + generator | covered |
| AC-1 | P1 | `verification/diagnostic.md` | covered |
| AC-2 | P2.T1 | `verification/lever-selection.md` | covered |
| AC-3 | P2.T3 | `scores.json` | covered |
| AC-4 | P3.T2 | `verification/gate-decision.md` | covered |
| AC-5 | P2.T4 | `verification/asset-digests.md` | covered |
| AC-6 | all | `pnpm verify` + scoped coverage | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- <none>

### Low

- **F1 — stale test title after instrument guard change**
  - **File:** `test/art/rubric.test.ts:201`
  - **What:** the test title `records the frozen instrument and every required field` still says "frozen" while the block now asserts `instrument.model === 'gemini-3.5-flash-lite'` and `fallback_used === true`.
  - **Why:** a test name no longer describes what it verifies; a reader scanning a failure would look for a frozen-instrument regression this test does not check. Accuracy nit only; the assertion is correct and consistent with `scores.json`.
  - **Fix:** rename the title to `records the instrument of record and every required field`. No assertion change.
  - **Requirement:** NFR-1
  - **Test gap:** none

- **F2 — stale generator header comment**
  - **File:** `test/art/diagnostic/chest/make-candidates.mjs:4-5`
  - **What:** the header claims the script reads "the authored baseline and hue-ramp candidate", but it only reads `chest-H` (the hue-ramp candidate); the baseline is never read.
  - **Why:** documentary inaccuracy in the new helper misleads a reader about its inputs. The generator logic itself is correct and deterministic.
  - **Fix:** change the comment to state it reads the hue-ramp candidate `chest-H` and derives the light (L), edge (E) and combined (C) recipes.
  - **Requirement:** NFR-6
  - **Test gap:** none

## Overrides

- **Instrument of record switch (NFR-1 / spec Out-of-Scope) — explicitly authorized by the user, 2026-11-18.** After `gemini-4-hydrogen` hit its free-tier daily quota (429 `RESOURCE_EXHAUSTED`, 20/day, ~18 h reset) mid-campaign, the user chose "New instrument of record": re-score all 14 passes on `gemini-3.5-flash-lite` and honestly rewrite `scores.json` metadata plus the `rubric.test.ts` guards. Scores are explicitly not comparable to the 3.25 baseline. Recorded in `scores.json` note, `tech-stack.md` dated note, `integration.md`, `gate-decision.md` and `phase-2.md`. This is not a finding to reverse; it is a recorded, user-directed deviation.

## Plan compliance

All three phases have `Result`, `Checkpoint` and `Evidence` and are marked verified;
all 10 tasks are `[x]` and were implemented. Checkpoints: P1 `fa0e530`, P2 `2b6a7d8`,
P3 `d5b2da7`. The final code diff stays within the phases' declared `Touches`, plus
the reported authorized deviations (instrument guard in `rubric.test.ts`, prop
re-authoring per FR-4, deriveRamp re-materialization). The quality goal is honestly
unmet but recorded through the FR-6/AC-4 accept path; no pass was forced.

## Out of scope

- Restoring the publishable gate to `pass` would require re-scoring humanoid (FR-7
  byte-identity protected) on a quota-recovered frozen instrument; that belongs to a
  future track, not this one.
- The 3.25 baseline and 3.67 re-score are different instruments and must not be
  presented as a like-for-like delta.

## Debt

- `verification/asset-digests.md:41` contains a point-in-time statement ("score file
  untouched") captured before P2.T3.3; later verification docs correctly record the
  scorer regeneration. Conductor prose, no code impact — clarity follow-up only.
- Spec NFR-1 / Out-of-Scope still name `gemini-4-hydrogen` only; the spec is frozen by
  convention, so the authorized switch is recorded in evidence and tech-stack rather
  than by editing the spec.

## Doc sync

`updated` — tech-stack dated note records the instrument switch; `metadata.doc_sync`
and this review line updated after review-fix round 1. No product/guideline changes.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 2 | 2 (F1, F2 in Phase R1) |
| 2 | PASS (re-review) | 0 | 0 | 0 | 0 | — |

Round 1 findings F1 (stale title at `rubric.test.ts:201`) and F2 (stale header at
`make-candidates.mjs:4-5`) were resolved by comment/title-only changes in Phase R1
(checkpoint `35057b2`), verified with `pnpm verify` exit 0. Re-review confirms both
resolved; no new findings; final verdict PASS.
