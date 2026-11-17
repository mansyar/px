# Gate and Instrument Reconciliation — Implementation Plan

> **Branch:** chore/20261117-gate-instrument-reconciliation
> **Base:** main @ 0fd23f7

> Phase states are `pending`, `in_progress`, `verified`, `failed`, `blocked`. The primary agent owns this file; phase executors report but do not edit it.

## Phase 1: Gate Contract and Provenance

- **Goal:** Make the publishable tier binding in documentation and tests, and freeze both existing score records as immutable provenance before a new baseline is written.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-11, NFR-4, NFR-5, AC-1, AC-2, AC-3, AC-12
- **Touches:** `docs/rubric.md`, `test/unit/calibration/gate.test.ts`, `test/art/scores-agent-vision.json`, `test/art/rubric.test.ts`
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** in_progress

- [ ] **P1.T1: Bind the publishable gate in documentation** — covers: FR-1, FR-11, AC-1
  - [ ] **P1.T1.1:** Add a dated decision to `docs/rubric.md` making mean ≥ 3.5 / floor ≥ 3.0 the shipping gate and stating that the 4.0 exceptional tier is unreachable and not a track-failing criterion.
  - [ ] **P1.T1.2:** State that future track acceptance criteria must use the publishable gate; do not edit archived specs.
- [ ] **P1.T2: Enforce the gate contract in tests** — covers: FR-2, NFR-5, AC-2
  - [ ] **P1.T2.1:** Extend `test/unit/calibration/gate.test.ts` to assert that `scores.json`'s `threshold_mean` and `min_allowed` match the documented publishable tier.
  - [ ] **P1.T2.2:** Keep the existing check that the exceptional tier is explicitly unreachable with dated evidence; fail loudly if the target table cannot be parsed.
- [ ] **P1.T3: Freeze prior score records as provenance** — covers: FR-3, AC-3
  - [ ] **P1.T3.1:** Copy the pre-track `test/art/scores.json` byte-for-byte to `test/art/scores-agent-vision.json`.
  - [ ] **P1.T3.2:** Verify `test/art/scores-before-intent.json` is unchanged and no digest fixture moves.

## Phase 2: Frozen Instrument and Baseline

- **Goal:** Produce one honest baseline with a frozen instrument, a recorded model, faithful views, and a verdict recomputed from the scores actually written.
- **Depends on:** Phase 1
- **Covers:** FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, FR-10, NFR-2, NFR-5, NFR-6, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11
- **Touches:** `scripts/rubric.mjs`, `test/art/scores.json`, `test/art/rubric.test.ts`, `test/art/assets-v2.test.ts`, `conductor/tracks/20261117-gate-instrument-reconciliation/verification/**`, `.conductor/evidence/art/**`
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** pending

- [ ] **P2.T1: Record the instrument in the schema-3 score record** — covers: FR-4, NFR-5, AC-4
  - [ ] **P2.T1.1:** Extend `scripts/rubric.mjs` and `test/art/rubric.test.ts` with an explicit `instrument` object: script, model, optional fallback model, views, asset set, date, and gate decision.
  - [ ] **P2.T1.2:** Assert every vision pass names the model actually used and that no credential value is written into the repository.
- [ ] **P2.T2: Score the seven v2 assets with two faithful views** — covers: FR-5, FR-6, FR-7, FR-9, AC-5, AC-6, AC-7
  - [ ] **P2.T2.1:** Render/verify `.8x.png` pass-A and `.debug.png` pass-B artifacts for potion, sword, humanoid, chest, character, prop and scene; raw 1× PNGs remain refused.
  - [ ] **P2.T2.2:** Run `scripts/rubric.mjs` first with `gemini-4-hydrogen`; on one malformed or failed attempt, fall back once to `gemini-3.5-flash-lite` and record why.
  - [ ] **P2.T2.3:** Let the existing record logic recompute the verdict and failure list; do not hand-edit a score or remove a below-floor finding.
- [ ] **P2.T3: Publish the baseline evidence** — covers: FR-8, FR-10, AC-8, AC-11
  - [ ] **P2.T3.1:** Write `verification/baseline.md` with the gate decision, instrument, model used or fallback, per-asset means, per-criterion means, instrument-spread caveat, provenance paths and honest verdict.
  - [ ] **P2.T3.2:** State explicitly whether the publishable gate was met; if not, name the failing criteria and assets without changing the bar.

## Phase 3: Verification and No-Regression

- **Goal:** Prove that the reconciliation changed the contract and the measurement, not the engine or its deterministic output.
- **Depends on:** Phase 2
- **Covers:** FR-8, FR-12, NFR-1, NFR-2, NFR-3, NFR-4, NFR-6, AC-8, AC-9, AC-10, AC-12
- **Touches:** `test/**`, `scripts/**`, `conductor/tracks/20261117-gate-instrument-reconciliation/verification/**`
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** pending

- [ ] **P3.T1: Audit digests, dependency and network boundaries** — covers: FR-8, FR-12, NFR-1, NFR-2, NFR-6, AC-8, AC-9, AC-10
  - [ ] **P3.T1.1:** Verify the hero, four v1 benchmark, seven v1 art, and seven v2 art digests are unchanged.
  - [ ] **P3.T1.2:** Verify `package.json` and `pnpm-lock.yaml` are unchanged with exactly one production dependency, and that only `scripts/rubric.mjs` has network access.
- [ ] **P3.T2: Run integrated verification and record the result** — covers: NFR-3, NFR-4, AC-12
  - [ ] **P3.T2.1:** Run both required gates and confirm no coverage threshold, exclude list, or ignore comment changed.
  - [ ] **P3.T2.2:** Write `verification/integrated.md` with the final gate results, checkpoint table, and the honest pass/fail statement.
