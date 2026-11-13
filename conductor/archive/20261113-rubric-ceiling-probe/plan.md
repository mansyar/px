# Rubric Ceiling Probe — Implementation Plan

- **Track:** `20261113-rubric-ceiling-probe`
- **Branch:** `feat/20261113-rubric-ceiling-probe`
- **Base:** `main` at `e854197`
- **Type:** feature · **Priority:** high

## Approach

Fix the nine candidates and their hashes before spending a single call, then build
only the plumbing needed to score them by hash, validate that plumbing without a
credential, and run the measurement once. The docs are written after the numbers
are in, and a null result is published as the finding.

## Phase 1: Candidates and Pre-registration

- **Goal:** nine candidate recipes, rendered and hashed, committed before any
  scoring call.
- **Depends on:** none
- **Covers:** FR-1, FR-2, AC-1
- **Touches:** `scripts/calibrate/ceiling.mjs`,
  `conductor/tracks/20261113-rubric-ceiling-probe/verification/ceiling/`
- **Verification:** `node scripts/calibrate/ceiling.mjs` then
  `git diff --stat test/art` (empty)
- **Status:** verified

- [x] **P1.T1: Define the nine candidates** — covers: FR-1
  - [x] P1.T1.1: lighting — `warm-cool`, `dither-band`, `engine-deband`
  - [x] P1.T1.2: edge language — `selective`, `hue-shift`, `hierarchy`
  - [x] P1.T1.3: palette craft — `hue-ramp`, `accent`, `nonlinear`
- [x] **P1.T2: Emit recipes from the chest base** — covers: FR-1
- [x] **P1.T3: Render 8× and debug artifacts** — covers: FR-2
- [x] **P1.T4: Write and commit the hash registry** — covers: AC-1
  - [x] P1.T4.1: `verification/ceiling/candidates.json` with name, intent, treatment and sha256 per recipe.

## Phase 2: Probe Mode

- **Goal:** a `--probes` mode that scores registered candidates by hash and cannot
  score anything else.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-4, FR-5, FR-6, AC-2, AC-6
- **Touches:** `scripts/calibrate.mjs`
- **Verification:** a smoke run with an unusable credential marks every pass
  `unscored`, exits non-zero, and leaves the record byte-identical
- **Status:** verified

- [x] **P2.T1: Add `--probes`** — covers: FR-3
- [x] **P2.T2: Verify each recipe hash before its call** — covers: FR-6
  - [x] P2.T2.1: a tampered recipe aborts before any call (hash 4a63417b vs 88a0c263).
- [x] **P2.T3: Write the probe report** — covers: FR-4, FR-5
  - [x] P2.T3.1: per-candidate passes and rationales; per-criterion verdict.
- [x] **P2.T4: Validate without spending a call** — covers: AC-6

## Phase 3: Run and Record

- **Goal:** the 18-call measurement, reported in full.
- **Depends on:** Phase 2
- **Covers:** FR-4, FR-5, AC-2, AC-3, AC-4
- **Touches:** `.conductor/evidence/ceiling/`,
  `conductor/tracks/20261113-rubric-ceiling-probe/verification/ceiling/`
- **Verification:** `git diff --exit-code test/art/scores.json`
- **Status:** verified — palette craft reached the ceiling, lighting and edge language did not

- [x] **P3.T1: Run the probe once** — covers: AC-2
  - [x] P3.T1.1: 18 calls, plus a two-call re-score for one lost reply.
- [x] **P3.T2: Commit the report with the track** — covers: AC-3
- [x] **P3.T3: Apply the decision rule** — covers: AC-4
  - [x] P3.T3.1: no candidate revised or dropped after scoring; all nine reported.

## Phase 4: Docs and Checks

- **Goal:** the rubric says what the judge rewarded.
- **Depends on:** Phase 3
- **Covers:** FR-7, FR-8, AC-5, AC-7, AC-8
- **Touches:** `docs/rubric.md`
- **Verification:** `pnpm verify`
- **Status:** verified

- [x] **P4.T1: Add the Ceiling probes section** — covers: FR-7
- [x] **P4.T2: State the null result or the winning treatments verbatim** — covers: AC-5
  - [x] P4.T2.1: `palette_craft` target raised 3.0 → 4.0 on the demonstrated anchor; the vector still sums to 23.0.
- [x] **P4.T3: Final checks** — covers: AC-7, AC-8

## Phase R1: Review Fixes

- **Goal:** Resolve review findings F1, F2, F3.
- **Depends on:** Phase 4
- **Covers:** F1, F2, F3
- **Touches:** `scripts/calibrate.mjs`, `scripts/calibrate/ceiling.mjs`,
  `conductor/tracks/20261113-rubric-ceiling-probe/verification/ceiling/`
- **Verification:** `pnpm verify`; 9/9 recipe hashes match; no backslash paths in
  the committed JSON
- **Status:** verified

- [x] **R1.T1: Normalise committed paths to POSIX** — covers: F1
- [x] **R1.T2: Record which candidates a merged report re-scored** — covers: F2
- [x] **R1.T3: Fail clearly when artifacts are not registered** — covers: F3

## Verification Strategy

Phases 1 and 2 spend no calls: the generator is deterministic and the probe mode is
validated with an unusable credential. Phase 3 is the only networked phase, at 18
calls. Phase 4 runs `pnpm verify`.

## Evidence

Candidate artifacts and the probe report go to `.conductor/evidence/ceiling/`
(gitignored), with the committed copies and the hash registry under
`conductor/tracks/20261113-rubric-ceiling-probe/verification/ceiling/`.

## Risks

- **A candidate may be mathematically incapable of 4** (for example, a dither that
  bands at 1×). That is a legitimate outcome and is reported as one.
- **The judge's ±1 swing** may put a candidate at 4 on one pass and 3 on the other;
  the threshold is both passes, stated in advance.
- **Retries may consume budget**; a pass that cannot be scored is recorded as
  unscored rather than pushed past four attempts.
