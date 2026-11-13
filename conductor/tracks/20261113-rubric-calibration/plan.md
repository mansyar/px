# Rubric Calibration — Implementation Plan

- **Track:** `20261113-rubric-calibration`
- **Branch:** `feat/20261113-rubric-calibration`
- **Base:** `main` at `54c0b13`
- **Type:** feature · **Priority:** high

## Approach

Build everything that can be checked without spending model calls first — the
variant generator, the record-safe harness, the arithmetic test — then run the one
24-call measurement and record what it says. The docs are rewritten before the run
so the results land in a section that already exists, and the gate is never
adjusted by this track.

## Phase 1: Variant Generator

- **Goal:** deterministic low/high recipe pairs for all six criteria that differ
  from the base asset only in the property under test.
- **Depends on:** none
- **Covers:** FR-1, FR-2, AC-1
- **Touches:** `scripts/calibrate/variants.mjs`, `.conductor/evidence/calibration/`
- **Verification:** `node scripts/calibrate/variants.mjs` then
  `git diff --stat test/art` (must be empty)
- **Status:** verified

- [x] **P1.T1: Define the six criterion mutations** — covers: FR-1
  - [x] P1.T1.1: silhouette: solid bounding blob (low) vs the drawn shape (high)
  - [x] P1.T1.2: value separation: one tone per family, all bases at one lightness (low) vs distinct bases (high)
  - [x] P1.T1.3: lighting: flat fill (low) vs directional ramp (high)
  - [x] P1.T1.4: edge language: outline tones and auto-outline removed (low) vs the edge convention (high)
  - [x] P1.T1.5: cluster discipline: scattered single pixels (low) vs clean masses (high)
  - [x] P1.T1.6: palette craft: one desaturated hue (low) vs derived warm/cool ramps (high)
- [x] **P1.T2: Emit variant recipes** — covers: FR-1
- [x] **P1.T3: Render variants to 8× and debug artifacts** — covers: FR-2
- [x] **P1.T4: Mutation audit** — covers: AC-1
  - [x] P1.T4.1: Record per variant which ops and grid cells differ from the base.

## Phase 2: Harness and Report

- **Goal:** score every variant twice, keep the real record untouched, and produce
  a report with per-criterion verdicts.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-4, FR-5, AC-2, AC-7
- **Touches:** `scripts/calibrate.mjs`, `package.json`
- **Verification:** `pnpm rubric:calibrate` then
  `git diff --exit-code test/art/scores.json`
- **Status:** verified

- [x] **P2.T1: Score each variant twice** — covers: FR-3
- [x] **P2.T2: Guard the record** — covers: AC-7
  - [x] P2.T2.1: `try/finally` restore plus byte comparison; non-zero exit on mismatch.
- [x] **P2.T3: Compute verdicts and anchors** — covers: FR-4, FR-5, FR-6
  - [x] P2.T3.1: separation and the scale ceiling reported as independent facts (spec A1).
- [x] **P2.T4: Write the report and the command** — covers: AC-2
  - [x] P2.T4.1: `report.json`, `report.md`, and the `rubric:calibrate` script entry.
  - [x] P2.T4.2: `--recompute`, `--merge` and `--only` so a lost reply costs one criterion, not a round.

## Phase 3: Gate Arithmetic and Docs

- **Goal:** the documented targets reach the gate, and a test proves the check
  guards it.
- **Depends on:** Phase 2
- **Covers:** FR-7, FR-8, AC-5, AC-6
- **Touches:** `docs/rubric.md`, `test/calibration/gate.test.ts`
- **Verification:** `pnpm vitest run test/unit/calibration/gate.test.ts`, `pnpm verify`
- **Status:** verified

- [x] **P3.T1: Add the gate arithmetic test** — covers: FR-8
- [x] **P3.T2: Prove it fails, then rewrite the targets** — covers: AC-6
  - [x] P3.T2.1: Run against the legacy table and record the failure (23.5 < 24.0).
  - [ ] P3.T2.2: **Superseded.** The calibrated ceiling is 3.67, so no honest
        target vector sums to 24.0; the table instead declares the gate
        `unreachable` with dated evidence, and the test accepts that only when
        the arithmetic is genuinely short (spec decision rule, amendment A2).
- [x] **P3.T3: Rewrite AC-20 and add the forward-only note** — covers: FR-7, FR-9
- [x] **P3.T4: Add the Calibration section** — covers: FR-7
  - [x] P3.T4.1: Variants, model, pass method, thresholds, v1 round, result table and anchor findings.

## Phase 4: Run and Record

- **Goal:** the measured results, recorded verbatim, with the decision rule applied.
- **Depends on:** Phase 3
- **Covers:** FR-6, FR-9, AC-3, AC-4, AC-5, AC-8, AC-9, AC-10
- **Touches:** `docs/rubric.md` (results only), `.conductor/evidence/calibration/`
- **Verification:** `pnpm verify`, `git diff --stat test/art` empty,
  `git diff --stat conductor/archive` empty
- **Status:** verified — **AC-4 missed: 3 of 6 criteria separate, not 4**

- [x] **P4.T1: Run the full calibration** — covers: FR-6
  - [x] P4.T1.1: two rounds of 24 calls plus a 4-call edge re-score; rejected replies recorded (6 in the second round).
- [x] **P4.T2: Record the results** — covers: AC-5
- [x] **P4.T3: Apply the decision rule** — covers: AC-4
  - [x] P4.T3.1: lighting, edge language and palette craft are recorded as having no 4-anchor; the gate is unchanged and the decision is handed to the owner.
- [x] **P4.T4: Final checks** — covers: AC-8, AC-9, AC-10

## Phase R1: Review Fixes

- **Goal:** Resolve review findings F2, F3, F5, F6, F7.
- **Depends on:** Phase 4
- **Covers:** F2, F3, F5, F6, F7
- **Touches:** `docs/rubric.md`, `scripts/calibrate/variants.mjs`,
  `conductor/tracks/20261113-rubric-calibration/verification/calibration/`
- **Verification:** `node scripts/calibrate/variants.mjs` (artifacts byte-identical),
  `pnpm verify`
- **Status:** verified

- [x] **R1.T1: Commit the calibration report and cite a path that exists** — covers: F2
- [x] **R1.T2: State the stimulus confound** — covers: F3
- [x] **R1.T3: Remove the deprecated `spawnSync` shell usage** — covers: F5
- [x] **R1.T4: Fix the garbled sentence** — covers: F6

## Verification Strategy

Each phase runs its own command, then `pnpm verify` at acceptance. The model is
called only in Phase 4, so a defect in the generator or the harness costs no
credits.

## Evidence

Phase reports go to `conductor/tracks/20261113-rubric-calibration/verification/`.
Variant recipes, renders and the calibration report go to
`.conductor/evidence/calibration/`, which is gitignored; the committed summary
lives in `docs/rubric.md`.

## Risks

- **A criterion may not be synthesizable** on a single base asset; it is declared
  `unsupported` rather than faked, and counts honestly against four-of-six.
- **An interrupted run can leave the record dirty**; the harness restores in a
  `finally` and refuses to start if the record is not clean.
- **The 24-call budget may be consumed by retries**; the report records unscored
  criteria instead of exceeding it silently.
