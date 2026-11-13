# Rubric View Comparison — Implementation Plan

- **Track:** `20261113-rubric-view-comparison`
- **Branch:** `feat/20261113-rubric-view-comparison`
- **Base:** `main` at `adf5c73`
- **Type:** feature · **Priority:** high

## Approach

Render the six views and freeze them by hash, build the scoring mode that computes
the decision itself, validate that mode without a credential, run once, and let the
document follow the measurement. The decision rule is implemented before the
numbers exist, so no threshold can be tuned to the result.

## Phase 1: Views and Pre-registration

- **Goal:** six artifacts, hashed and committed, before any scoring call.
- **Depends on:** none
- **Covers:** FR-1, AC-1
- **Touches:** `scripts/calibrate/views.mjs`,
  `conductor/tracks/20261113-rubric-view-comparison/verification/views/`
- **Verification:** `node scripts/calibrate/views.mjs` then
  `git diff --stat test/art` (empty)
- **Status:** verified

- [x] **P1.T1: Render 1×, 8× and debug for both assets** — covers: FR-1
- [x] **P1.T2: Write the artifact registry with hashes** — covers: FR-1
- [x] **P1.T3: Record the scoring plan** — covers: AC-1
  - [x] P1.T3.1: two repeats per artifact, 12 calls, decision thresholds stated in the registry.

## Phase 2: Scoring Mode and Decision

- **Goal:** score by hash and compute the verdict in code.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-3, FR-4, AC-2, AC-3, AC-4, AC-6
- **Touches:** `scripts/calibrate.mjs`
- **Verification:** smoke run with an unusable credential: unscored, record
  byte-identical, exit 1
- **Status:** verified

- [x] **P2.T1: Add `--views`** — covers: FR-2
- [x] **P2.T2: Verify the hash before each pass** — covers: FR-2
- [x] **P2.T3: Compute repeats, exclusions, Δ and the decision** — covers: FR-3, FR-4
- [x] **P2.T4: Write the report** — covers: FR-3

## Phase 3: Run and Record

- **Goal:** the twelve-call measurement and its verdict.
- **Depends on:** Phase 2
- **Covers:** FR-3, FR-4, AC-2, AC-3, AC-4
- **Touches:** `.conductor/evidence/views/`,
  `conductor/tracks/20261113-rubric-view-comparison/verification/views/`
- **Verification:** `git diff --exit-code test/art/scores.json`
- **Status:** verified

- [x] **P3.T1: Run once** — covers: AC-2
- [x] **P3.T2: Commit the report with the track** — covers: AC-3
- [x] **P3.T3: Record the decision verbatim, including blocking reasons** — covers: AC-4

## Phase 4: Rubric Outcome and Checks

- **Goal:** the method says what the measurement supports.
- **Depends on:** Phase 3
- **Covers:** FR-5, FR-6, AC-5, AC-7
- **Touches:** `docs/rubric.md`
- **Verification:** `pnpm verify`
- **Status:** verified

- [x] **P4.T1: Rewrite the Method artifact rule** — covers: FR-5
- [x] **P4.T2: Redefine pass A if 1× is accepted** — covers: FR-5
- [x] **P4.T3: Final checks** — covers: FR-6, AC-7

## Verification Strategy

Phases 1 and 2 spend nothing: the generator is deterministic and the scoring mode
is validated against an unusable credential. Phase 3 is the only networked phase,
at 12 calls. Phase 4 runs `pnpm verify`.

## Evidence

Artifacts and report go to `.conductor/evidence/views/` (gitignored); the committed
registry and report copy live under
`conductor/tracks/20261113-rubric-view-comparison/verification/views/`.

## Risks

- **A criterion may be unstable across repeats**, which excludes it and can leave
  the comparison `inconclusive`. That outcome keeps the current method.
- **The judge may treat 1× and 8× differently for reasons unrelated to art** — for
  example preferring sharper edges at 8×. That is exactly what the Δ measures.
- **12 calls is small.** The rule is deliberately tolerant of one step, so the
  decision is about systematic effects, not single scores.
