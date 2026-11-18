# Publishable Gate Close — Implementation Plan

> **Branch:** `feat/20261118-gate-close-flash-lite`
> **Base:** `main` @ `8de763543d60fa2b92e5799dd5cbd6f288932342`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Re-author the two target recipes and re-render faithful artifacts

- **Goal:** `humanoid` and `scene` v2 recipes are re-authored to lift the three below-floor lighting scores, and both render `--strict` clean to new committed digests with faithful A/B artifacts.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-6, NFR-3, NFR-4, AC-1, AC-2, AC-3, AC-6, AC-7
- **Touches:** `test/art/v2/humanoid/**`, `test/art/v2/scene/**`, `conductor/tracks/20261118-gate-close-flash-lite/verification/recipe-changes.md`, `.conductor/evidence/**` (gitignored)
- **Verification:** `pnpm verify` (typecheck + lint + test + build); faithful render SHA-256 comparison (render twice, compare to committed sidecar)
- **Status:** verified

- [x] **P1.T1: Re-author `humanoid` with the validated lever** — covers: FR-1
  - [x] **P1.T1.1:** Apply warm/cool hue-stepped 5-stop ramps and one top-left `light` op before `auto_outline` (no `harmonize`), using only existing registered ops.
  - [x] **P1.T1.2:** Preserve the declared design-block invariants (`light = top-left`, hero `torso`, value plan, materials, edges, hierarchy) checked by `assets-v2.test.ts`.
  - [x] **P1.T1.3:** Render `--strict` clean, update `.sha256` sidecar and transcript, confirm a stable digest across two renders.
- [x] **P1.T2: Re-author `scene` gable for one consistent light direction** — covers: FR-2
  - [x] **P1.T2.1:** Unify the two roof planes so they read as a single top-left light source (remove the conflicting-shadow split) without relying on a second light.
  - [x] **P1.T2.2:** Preserve declared design-block invariants and keep all twelve parts in the hierarchy.
  - [x] **P1.T2.3:** Render `--strict` clean, update `.sha256` sidecar and transcript, confirm a stable digest across two renders.
- [x] **P1.T3: Verify byte-identity of the five unchanged assets** — covers: FR-6
  - [x] **P1.T3.1:** Digest-compare `potion`, `sword`, `chest`, `character`, `prop` v2 recipes, sidecars, and score records against the pre-track state.
  - [x] **P1.T3.2:** Record the comparison and the explicit humanoid byte-identity waiver in `verification/recipe-changes.md`.

**Result:** verified
**Checkpoint:** 051ada7
**Evidence:** conductor/tracks/20261118-gate-close-flash-lite/verification/phase-1.md

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261118-gate-close-flash-lite/verification/phase-1.md
-->

## Phase 2: Re-score the four affected passes and recompute the verdict

- **Goal:** the four affected passes (`humanoid` A/B, `scene` A/B) are machine-re-scored on `gemini-3.5-flash-lite`, and the verdict is recomputed by the scorer with all per-pass fields machine-written.
- **Depends on:** Phase 1
- **Covers:** FR-4, NFR-1, NFR-2, NFR-5, AC-4
- **Touches:** `test/art/scores.json`, `conductor/tracks/20261118-gate-close-flash-lite/verification/rescore.md`, `.conductor/evidence/**` (gitignored)
- **Verification:** `node scripts/rubric-report.mjs` (read-only report, primary-run); `pnpm verify`
- **Status:** verified

- [x] **P2.T1: Generate faithful A/B artifacts for the two changed assets** — covers: FR-4
  - [x] **P2.T1.1:** Render pass A (exact 8× nearest-neighbour on `#808080`) and pass B (engine debug sheet) from the updated recipes into `.conductor/evidence/`.
  - [x] **P2.T1.2:** Confirm the artifacts are `--strict` clean and record their digests in `verification/rescore.md`.
- [x] **P2.T2: Re-score the four passes with the instrument of record** — covers: FR-4
  - [x] **P2.T2.1:** Run `scripts/rubric.mjs` with `--model gemini-3.5-flash-lite --replace` for `humanoid` A/B and `scene` A/B (primary-run, credential from env, never printed).
  - [x] **P2.T2.2:** Retry 503/429/non-JSON replies with backoff; never switch instruments or hand-write scores.
  - [x] **P2.T2.3:** Verify the scorer wrote all model/note fields and recomputed the verdict.
- [x] **P2.T3: Confirm no score fabrication** — covers: NFR-2
  - [x] **P2.T3.1:** Diff the ten unaffected passes against the pre-track record and confirm they are byte-identical.

**Result:** verified (gate not passed — honest fail recorded for Phase 3 decision)
**Checkpoint:** c78f022
**Evidence:** conductor/tracks/20261118-gate-close-flash-lite/verification/phase-2.md
**Squash:** skipped — range `1190aca..HEAD` contains primary commit `c78f022` not reported by the subagent; task commits retained.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261118-gate-close-flash-lite/verification/phase-2.md
-->

## Phase 3: Record the honest gate decision

- **Goal:** the final recomputed verdict and the publishable/accept decision are documented with evidence, including deviations and non-comparability notes.
- **Depends on:** Phase 2
- **Covers:** FR-5, NFR-6, AC-5
- **Touches:** `conductor/tracks/20261118-gate-close-flash-lite/verification/gate-decision.md`
- **Verification:** `node scripts/rubric-report.mjs` (primary-run) confirms the recorded verdict matches `scores.json`; `pnpm verify`
- **Status:** pending

- [ ] **P3.T1: Record the recomputed verdict and decision** — covers: FR-5
  - [ ] **P3.T1.1:** Document mean, threshold, floor, failures, and final `pass`/`fail` status from the scorer output.
  - [ ] **P3.T1.2:** State the decision: publishable pass, or an explicit invest/accept decision on an honest fail with remaining floor failures listed. No pass is forced.
- [ ] **P3.T2: Record deviations and non-comparability** — covers: NFR-6
  - [ ] **P3.T2.1:** Note the humanoid byte-identity waiver, the flash-lite instrument of record, and that scores are not comparable to the 3.25 frozen baseline.
  - [ ] **P3.T2.2:** Record exact scoring commands, artifact digests, and evidence paths for reproducibility.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261118-gate-close-flash-lite/verification/phase-3.md
-->

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 3
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
