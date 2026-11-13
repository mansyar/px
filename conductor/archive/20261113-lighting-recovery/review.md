# Review: Lighting Recovery

- **Track:** `20261113-lighting-recovery`
- **Type:** `feature`
- **Branch:** `feat/20261113-lighting-recovery`
- **Range:** `a8e9db8..d385619`
- **Date:** 2026-11-13T20:10:00Z
- **Verdict:** `PASS WITH FINDINGS (override)`
- **Note:** no reviewer subagent is available on this host, so the review was carried
  out by the primary agent against the same brief, with every claim traceable to a
  command recorded in `verification/`.

## Summary

Every phase is implemented, verified and evidenced, and the codebase is green:
`pnpm verify` exits 0 with 858 tests. The track nevertheless **misses its own
acceptance gate**: mean 3.69 against 4.0, with lighting 3.07, palette 3.36 and
edge_language 3.07 all under their per-criterion targets, and 12 of 14 palette
passes still calling the ramps flat. The owner has explicitly overridden the five
blocking acceptance findings so the work can land with them recorded as open
criteria. Nothing here is a code defect: the delivered change is what the spec
asked for, and the measurement says it does not move the score beyond noise.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `pnpm test` (858 tests, 94 files) | pass | `verification/integrated.md` |
| coverage | not configured as a blocking workflow command | not run | — |
| lint | `pnpm lint` | pass | `verification/integrated.md` |
| typecheck | `pnpm typecheck` | pass | `verification/integrated.md` |
| build | `pnpm build` | pass | `verification/integrated.md` |
| aggregate | `pnpm verify` | pass (exit 0) | `verification/integrated.md` |
| assets | `pnpm vitest run test/art/assets.test.ts` | 28 passed | `verification/phase-1.md` |
| record | `pnpm vitest run test/art/rubric.test.ts` | 10 passed | `verification/phase-4.md` |

Volume: 19 files changed, 1506 insertions and 1366 deletions across the six
recipes, digests and design notes (`git diff --shortstat a8e9db8..HEAD`). Generated
digests and binary renders are excluded from the code review; the recipe diffs are
palette and grid content and were reviewed as data.

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1-T3 | six derived palettes; `assets.test.ts`; digest rebaseline | covered |
| FR-2 | P2.T1 | scene roof: one hue, ridge-to-eave ramp, one-rung plane offset | covered, score unchanged |
| FR-3 | P2.T2 | chest diagonal body ramp | covered |
| FR-4 | P2.T3 | humanoid and character torso ramps | covered |
| FR-5 | P2.T4 | potion surface line and depth steps | covered |
| FR-6 | P3.T1-T2 | edge convention on six assets; potion and small parts exempt | partial (F9, F10) |
| FR-7 | P3.T3 | 0.12 attempted, blocked by the silhouette floor, 0.06 kept | partial by design |
| FR-8 | P4.T1 | 14 passes, correct artifacts, verdict recomputed | covered |
| FR-9 | P1, P2, P3 | prop digest byte-identical | covered |
| FR-10 | all phases | no engine, test or threshold change | covered |
| NFR-1 | P1.T4, P2, P3 | digests re-baselined with a reason per asset | covered |
| NFR-2 | every phase | `pnpm verify` exit 0 each time | covered |
| NFR-3 | all phases | no dependency added | covered |
| NFR-4 | scoring | credentials by reference, never in repo or args | covered |
| NFR-5 | P4.T2 | `rubric-report.mjs` unchanged and read-only | covered |
| NFR-6 | P1-P4 | required parts, materials and anchors all pass | covered |
| AC-1 | P2 | lighting 3.07 vs 3.5 | **miss (F2)** |
| AC-2 | P1 | palette 3.36 vs 3.6 | **miss (F3)** |
| AC-3 | P3 | edge 3.07 vs 3.5 | **miss (F4)** |
| AC-4 | P3 | value 3.79 vs 3.7 | met |
| AC-5 | P4 | mean 3.69 vs 4.0 | **miss (F1)** |
| AC-6 | P2 | no scene lighting reason contains split/arbitrar | met |
| AC-7 | P1 | 12 of 14 palette passes mention flat/hue | **miss (F5)** |
| AC-8 | P1-P3 | six strict-clean renders, digests and notes | met |
| AC-9 | all | 28 + 10 tests, `pnpm verify` 0 | met |
| AC-10 | all | 0 changed prop files | met |

## Findings

### Critical

- None.

### High

- **F1 — AC-5 unmet: mean 3.69 against 4.0.**
  - **File:** `test/art/scores.json` (verdict block)
  - **What:** the track's own gate is missed.
  - **Why:** the track's stated purpose was to move the score to 4.0, and it did not.
  - **Fix:** none inside art scope; the next attempt should target the instrument or
    the scene's cast shadow rather than repaint.
  - **Requirement:** AC-5
  - **Test gap:** none — the record test already enforces the arithmetic.
- **F2 — AC-1 unmet: lighting 3.07 against 3.5.**
  - **File:** `test/art/scores.json`
  - **What:** flat-shading judgements persist on every asset.
  - **Why:** the untouched control also scored 3.00 for lighting, so the criterion is
    not responding to the changes.
  - **Fix:** re-examine the rubric's lighting anchor before further art iteration.
  - **Requirement:** AC-1
- **F3 — AC-2 unmet: palette 3.36 against 3.6.**
  - **File:** `test/art/scores.json`
  - **What:** derived ramps did not change the critic's flat-ramp language.
  - **Why:** 12 of 14 passes still name flat or hue-less ramps.
  - **Fix:** raise ramp resolution only if the instrument responds; the control
    suggests it may not.
  - **Requirement:** AC-2
- **F4 — AC-3 unmet: edge_language 3.07 against 3.5.**
  - **File:** `test/art/scores.json`
  - **What:** the interior edge convention changed pixels but not the judgement.
  - **Why:** edge_language has now failed to move across four consecutive tracks.
  - **Fix:** stop treating edge_language as an art problem in this rubric.
  - **Requirement:** AC-3
- **F5 — AC-7 unmet: 12 of 14 palette passes mention flat or hue-less ramps.**
  - **File:** `test/art/scores.json`
  - **What:** the threshold was at most two assets; every asset including the control
    trips it.
  - **Why:** the criterion's own wording is saturated.
  - **Fix:** treat AC-7 as an instrument finding, not a drawing finding.
  - **Requirement:** AC-7

### Medium

- **F6 — one judgement under the record's minimum.**
  - **File:** `test/art/scores.json` (`verdict.failures[0]`)
  - **What:** humanoid pass B, cluster_discipline 1.
  - **Why:** the schema-3 record still carries `min_allowed: 3`; the owner gate is
    criterion-mean based, but the record keeps its own tripwire visible.
  - **Fix:** leave the judgement visible; do not suppress it.
  - **Requirement:** AC-5 (context)
- **F7 — the probe used the plain 8x for pass B.**
  - **File:** `conductor/tracks/20261113-lighting-recovery/verification/phase-2.md`
  - **What:** the four interim probe calls passed the 8x image for both passes, while
    the record defines pass B on the debug sheet.
  - **Why:** the probe numbers are not directly comparable to the final record.
  - **Fix:** recorded; Phase 4 uses the correct artifacts, so no re-probe is needed.
  - **Requirement:** FR-8 (probe only)
- **F8 — `verdict.note` was rewritten by hand.**
  - **File:** `test/art/scores.json`
  - **What:** the prose note was refreshed to describe this run.
  - **Why:** the stored note described the previous redraw and would have misled.
  - **Fix:** none; result, mean, failures and every pass score remain
    scorer-generated, and the edit is recorded in the Phase 4 evidence.
  - **Requirement:** NFR-1

### Low

- **F9 — FR-6 says "all seven", FR-9 keeps the prop untouched.**
  - **File:** `conductor/tracks/20261113-lighting-recovery/spec.md`
  - **Fix:** split the requirement into "the six edited assets" and state the control
    exemption.
- **F10 — two bases were adjusted for lint compliance.**
  - **File:** `test/art/potion/potion.px.json`, scene `roof_right` base
  - **What:** potion `cork` and scene `roof_right` bases were nudged to satisfy the
    silhouette floor and the adjacency ladder.
  - **Why:** legitimate lint compliance, but the palette change is not purely "derive
    from the old base".
  - **Fix:** recorded in the design notes; no action.
- **F11 — solver tooling is gitignored.**
  - **File:** `.conductor/redraw/*`
  - **What:** `derive_solve.py`, `adjacency.ts`, `shade.py` and `edge.py` are not in
    the repository.
  - **Why:** the palette fitting is not reproducible from a clone.
  - **Fix:** if the approach is kept, move the solver under `scripts/` in a future
    track.

## Overrides

- **F1 (AC-5)** — approved by the owner in this session on 2026-11-13: "Review, then
  PR with the misses recorded as open criteria." Scope: landing the track with AC-5
  open; the score and the miss are not altered.
- **F2 (AC-1)** — same approval, same date. Scope: AC-1 open, lighting 3.07.
- **F3 (AC-2)** — same approval, same date. Scope: AC-2 open, palette 3.36.
- **F4 (AC-3)** — same approval, same date. Scope: AC-3 open, edge 3.07.
- **F5 (AC-7)** — same approval, same date. Scope: AC-7 open, 12 of 14 passes.

## Plan compliance

All four phases have a Result, Checkpoint and Evidence, and every task is `[x]` with
a command behind it. No task was dropped. The final diff stays inside the union of
the phases' Touches (`test/art/**`), with no engine or test change. The only
unplanned artifacts are the gitignored solver scripts noted in F11.

## Out of scope

- The scene's cast shadow contradicts the roof's light direction; fixing it is a
  drawing change this track did not plan.
- The rubric's lighting anchor scores the untouched control at 3.00, the same as the
  edited assets; investigating that belongs to instrumentation work.
- Reproducible palette solving (F11) belongs to a separate tooling track.

## Debt

- AC-1, AC-2, AC-3, AC-5 and AC-7 are open and recorded as overridden acceptance
  criteria; they carry into the PR body.
- F11 is deferred: the solver scripts remain gitignored for this track.

## Doc sync

`none` — no command, contract or user-visible behaviour changed; the track edited
recipes, digests and design notes only.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS (override) | 0 | 5 | 3 | 3 | 0 |
