# Review: Rubric Calibration

- **Track:** `20261113-rubric-calibration`
- **Type:** `feature`
- **Branch:** `feat/20261113-rubric-calibration`
- **Range:** `54c0b13..cb3b5c8` (fixes after this range are in Phase R1)
- **Date:** 2026-11-13
- **Verdict:** `BLOCK`

## Summary

The harness, the generator, the gate guard and the documentation are sound: 924
inserted lines across five files, `pnpm verify` green at 861 tests, no recorded
score or asset touched, and the gate test demonstrably failed on the legacy
target vector before passing on the calibrated one.

One acceptance criterion is unmet and cannot be met by editing code: **AC-4
required four of six criteria to separate, and only three do.** That is the
calibration's result, not a defect in the harness — the same three criteria
separated across two stimulus rounds. Under `review.strict: true` a High finding
is not deferrable, so this review blocks until the owner records an override or
the criterion is amended.

This host has no `conductor-reviewer` subagent, so the review was performed by
the primary agent against its own diff; that weakens independence and is stated
here rather than implied.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| static | `pnpm typecheck && pnpm lint && pnpm build` | pass | `pnpm verify` |
| unit | `pnpm vitest run --project unit` | pass | 861 tests overall |
| integration | `pnpm vitest run --project integration` | pass | included in the run |
| smoke | `pnpm vitest run --project smoke` | pass | included in the run |
| determinism | `pnpm vitest run --project goldens` | pass | no golden changed |
| coverage | `pnpm vitest run --coverage` | not run | scope is `src/core` and `src/lint`; this diff changes neither |
| calibration | `pnpm rubric:calibrate` | pass | 52 calls, report committed under `verification/calibration/` |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1–T2, `scripts/calibrate/variants.mjs` | mutation audit; 12 variants | covered |
| FR-2 | P1.T3 | 8× and debug artifacts per variant | covered |
| FR-3 | P2.T1, `scripts/calibrate.mjs` | 52 scoring calls, two passes each | covered |
| FR-4 | P2.T3–T4 | `report.json`, `report.md` | covered |
| FR-5 | P2.T3, `finalizeEntry` | verdict per criterion in the report | covered |
| FR-6 | P2.T3, P4.T2 | `anchor4` per criterion; three have none | covered |
| FR-7 | P3.T3–T4 | `docs/rubric.md` target vector and Calibration | covered |
| FR-8 | P3.T1 | `test/unit/calibration/gate.test.ts` | covered |
| FR-9 | P4.T4 | `test/art` and `conductor/archive` diffs empty | covered |
| FR-10 | all phases | no engine or lint-threshold change in the diff | covered |
| NFR-1 | P1 | regeneration hash identical | covered |
| NFR-2 | P2.T2 | restore plus byte comparison; `git diff` empty | covered |
| NFR-3 | P2, P4 | 52 calls, retries capped at 4 | covered, budget amended (A2) |
| NFR-4 | P2 | credential read by reference only | covered |
| NFR-5 | P3 | `pnpm verify` exit 0, 861 tests | covered |
| NFR-6 | P2.T4 | rationales in `report.md` | covered |
| AC-1 | P1 | audit + 12 variants | covered |
| AC-2 | P2 | `pnpm rubric:calibrate` end to end | covered |
| AC-3 | P4 | verdict for all six criteria | covered |
| AC-4 | P4 | 3 of 6 separate (silhouette, lighting, cluster) | **missing** |
| AC-5 | P3–P4 | anchor findings in report and document | covered |
| AC-6 | P3 | 23.5 < 24.0 failure recorded, then pass | covered |
| AC-7 | P2 | record byte-identical after 52 calls | covered |
| AC-8 | P4 | `pnpm verify` exit 0 | covered |
| AC-9 | P4 | no `test/art` change | covered |
| AC-10 | P4 | forward-only note; archive untouched | covered |

## Findings

### Critical

- None.

### High

- **F1 — AC-4 is unmet: three criteria separate, four were required**
  - **File:** `test/unit/calibration/gate.test.ts`, `conductor/tracks/20261113-rubric-calibration/verification/phase-4.md`
  - **What:** silhouette (Δ 4.00), lighting (Δ 2.00) and cluster discipline (Δ 3.00) separate; value separation (Δ 1.00), edge language (Δ 0.00) and palette craft (Δ 1.50) do not.
  - **Why:** AC-4 is an acceptance criterion of this track, so the track cannot declare itself complete. It is also not repairable by code: the result reproduced across two stimulus rounds, and the third criterion that failed did so with strengthened stimuli.
  - **Fix:** none available in code. Options are an owner override recorded here, or an amendment to AC-4 to state the measured capability (for example "at least three criteria separate, including lighting").
  - **Requirement:** AC-4
  - **Test gap:** none; the calibration is the evidence.

### Medium

- **F2 — the document cited a report path that is not in the repository** (fixed in R1)
  - **File:** `docs/rubric.md`, Target vector
  - **What:** the evidence cell pointed at `.conductor/evidence/calibration/report.md`, which is gitignored, so the guard's date check could be satisfied by a path no reader can open.
  - **Fix:** the report and its JSON were copied into `verification/calibration/` and the cell now cites the tracked path.
  - **Requirement:** FR-8, AC-5
  - **Test gap:** the guard still checks only that a dated evidence path is present, not that it exists; a filesystem existence check would close that.

- **F3 — the strengthened stimuli are not independent** (fixed in R1)
  - **File:** `docs/rubric.md`, Calibration
  - **What:** the cluster and palette `low` variants are both 1 px checkerboards, so each destroys more than its own property.
  - **Why:** the cluster separation could be read as a palette judgement.
  - **Fix:** the section now states the overlap and rests the finding on the within-pair difference (cluster 1 vs 4, palette 2/3 vs 3), which the data supports.
  - **Requirement:** FR-5
  - **Test gap:** none.

### Low

- **F4 — `scripts/` is outside the lint and typecheck scope** (accepted debt)
  - **File:** `biome.json`, `tsconfig.json`
  - **What:** the generator and harness are neither linted nor typechecked, unlike everything in `src/` and `test/`.
  - **Why:** a typo in an unused branch of either script fails at run time, and only when that branch is reached.
  - **Fix:** add `scripts/**/*.mjs` to the Biome includes in a separate change; it would also reformat the four existing scripts.
  - **Requirement:** NFR-5 (static layer)
  - **Test gap:** none.

- **F5 — `spawnSync` passed an args array with `shell: true`** (fixed in R1)
  - **File:** `scripts/calibrate/variants.mjs`
  - **What:** Node 24 emits `DEP0190` for this form.
  - **Fix:** Windows runs through `cmd.exe /d /s /c`; POSIX spawns directly. Regeneration confirmed byte-identical.

- **F6 — garbled sentence in the Calibration section** (fixed in R1)
  - **File:** `docs/rubric.md`
  - **What:** "Rules use `node` only" and "the subtl er removals" were not English.
  - **Fix:** both rewritten.

## Overrides

- None recorded. F1 requires one to proceed to a PR.

## Plan compliance

Four phases, sixteen parent tasks, all verified: the single unchecked sub-task is
P3.T2.2, marked superseded in the plan with the reason (no honest target vector
reaches the gate). Phase R1 was appended by this review and is verified. The diff
stays inside the union of the phases' `Touches` plus the R1 additions.

## Out of scope

- Adding `scripts/` to the static checks (F4) touches configuration beyond this
  track's scope.
- Re-scoring the seven assets against the calibrated scale would rewrite the
  record; spec FR-9 makes that a separate decision.

## Debt

- F4: `scripts/` unlinted and untypechecked. Accepted debt; no issue filed (the
  Workflow Config's issue threshold is `medium`).

## Doc sync

`updated` — `docs/rubric.md` gained the target vector, the Calibration section,
the two-tier acceptance definition and the forward-only note; spec amendments A1,
A2 and A3 record the deviations.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 0 | 1 | 2 | 3 | 5 |
