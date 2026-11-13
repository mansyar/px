# Surface Resolution — Implementation Plan

> **Method:** TDD, one phase at a time. Each phase lists its tasks, its verification
> command, and its acceptance criteria. A phase is verified only when every task
> and every listed AC passes; the checkpoint is a commit whose message is
> `feat:`/`fix:` for the work and `conductor(plan):` for the state.

## Overview

Five phases: two on `light` (bands, then part selection), one on interior edges,
one on palette tones plus the schema gate, then re-authoring and an independent
re-score. The engine work is additive: with no new options every existing digest
must stay byte-identical, which is the guard that keeps the re-score attributable
to the art that actually changes.

**Baseline:** mean 3.73, `lighting` 3.14, `edge_language` 3.36, no asset above
4.08, one criterion below 3 (`scene` A `lighting` 2).

## Phase 1: Band Count and Placement

- **Goal:** a wide mass can carry more than one interior band.
- **Depends on:** nothing (first phase)
- **Covers:** FR-1, FR-2, AC-1, AC-2
- **Touches:** `src/core/ops/light.ts`, `src/core/recipe/{types,normalize}.ts`, `test/ops/**`
- **Verification:** `pnpm verify`
- **Status:** in_progress

- [ ] **P1.T1: Band derivation**
  - [ ] **P1.T1.1:** `bands: 2|3|4` and `band_scale: "thickness" | "uniform"` on `light`, defaulting to today's single band.
  - [ ] **P1.T1.2:** Widths derived from the part's extent along the light axis; clamp when the count exceeds thickness; collapse duplicates.
  - [ ] **P1.T1.3:** Assert `bands: 1` and absent are byte-identical across all seven assets.
- [ ] **P1.T2: Tests**
  - [ ] **P1.T2.1:** 40×8 mass yields three distinct bands in one direction.
  - [ ] **P1.T2.2:** 3 px and 40 px masses both honor the count with proportional widths.
  - [ ] **P1.T2.3:** 1 px stroke-mass degrades to one band with no error.

## Phase 2: Part Selection

- **Goal:** an authored tone survives the light pass without reordering ops.
- **Depends on:** Phase 1
- **Covers:** FR-3, AC-3, AC-4
- **Touches:** `src/core/ops/light.ts`, `src/core/recipe/normalize.ts`, `test/ops/**`
- **Verification:** `pnpm verify`
- **Status:** pending

- [ ] **P2.T1: `parts` and `skip`**
  - [ ] **P2.T1.1:** Allow-list and deny-list, mutually exclusive, resolved against declared parts at normalize time.
  - [ ] **P2.T1.2:** Undeclared part name is `E_BAD_VERSION`-class caller error with the part named; both lists together is `E_BAD_PARAM`.
  - [ ] **P2.T1.3:** Test that a skipped part keeps its tone while neighbours move, and that no `skip` means today's bytes.
- [ ] **P2.T2: Scene idiom**
  - [ ] **P2.T2.1:** Re-run the scene's gable with `skip` instead of post-light ordering and confirm the same pixels; record which idiom the design file should keep.

## Phase 3: Interior Edge Role

- **Goal:** boundaries inside the silhouette get an edge, and the outline is one
  deliberate treatment rather than one line plus nothing.
- **Depends on:** Phase 2
- **Covers:** FR-4, FR-5, AC-5
- **Touches:** `src/core/ops/outline.ts` (or `auto_outline`), `src/core/recipe/normalize.ts`, `test/ops/**`
- **Verification:** `pnpm verify`
- **Status:** pending

- [ ] **P3.T1: Boundary walk**
  - [ ] **P3.T1.1:** `inner` role written on the inside of a boundary between two parts, once per boundary.
  - [ ] **P3.T1.2:** Never on a silhouette pixel, never over a ridge part's own tone, no `W_PART_OVERWRITE`.
  - [ ] **P3.T1.3:** Test two adjacent materials gain one inner edge while the outer outline is unchanged; same-role boundaries draw nothing.
- [ ] **P3.T2: Bounded output**
  - [ ] **P3.T2.1:** The op reports a count, not a per-pixel list, so `render` output stays bounded (NFR-6).

## Phase 4: Palette Tones and Schema 1.3

- **Goal:** a role can point at a tone, and a ramp can carry more than four steps.
- **Depends on:** Phase 3
- **Covers:** FR-6, FR-7, FR-8, AC-6, AC-7
- **Touches:** `src/core/palette.ts`, `src/core/recipe/{types,normalize}.ts`, `test/palette/**`, `test/recipe/**`, `conductor/tech-stack.md`
- **Verification:** `pnpm verify`
- **Status:** pending

- [ ] **P4.T1: Tone-valued roles**
  - [ ] **P4.T1.1:** `base: "t3"` resolves to that tone's slot; mixed role/tone ramps normalize deterministically.
  - [ ] **P4.T1.2:** A role naming a missing tone errors with both names.
  - [ ] **P4.T1.3:** Explicit hex-only ramps are byte-identical and keep today's `VALUE_COLLISION` and `E_NO_RAMP` behaviour.
- [ ] **P4.T2: Schema 1.3**
  - [ ] **P4.T2.1:** Accept `"1.3"`; reject `bands`, `band_scale`, `parts`, `skip`, `inner` and tone-valued roles under `1.2` with a message naming `"1.3"`.
  - [ ] **P4.T2.2:** Record the version decision in `conductor/tech-stack.md` and add the migration test.

## Phase 5: Re-authoring and Independent Score

- **Goal:** the six sub-4.0 assets use the new surface, and the record says so.
- **Depends on:** Phase 4
- **Covers:** FR-9, FR-10, AC-8, AC-9, AC-10
- **Touches:** `test/art/**`, `test/art/scores.json`, `docs/rubric.md` if the view guidance changes
- **Verification:** `pnpm verify && pnpm vitest run test/art` plus fourteen scorer runs
- **Status:** pending

- [ ] **P5.T1: Scene lighting**
  - [ ] **P5.T1.1:** Give the wall drum and apron real bands with `bands: 3`; restore a lit rim on the mouth; remove the stray pixel and the wall-side rectangle recorded in the last track's review.
  - [ ] **P5.T1.2:** Reach `lighting` ≥ 3 on both views, then re-baseline with a reason.
- [ ] **P5.T2: Six assets**
  - [ ] **P5.T2.1:** Adopt tone-valued ramps where `base`/`highlight` are one step apart (potion, sword, humanoid, chest, character, prop).
  - [ ] **P5.T2.2:** Add `inner` edges where detail currently blurs into the silhouette; re-baseline each digest with a reason.
- [ ] **P5.T3: Re-score**
  - [ ] **P5.T3.1:** Fourteen independent passes on `gemini-3.5-flash-lite`, same views as the baseline, artifacts regenerated from the committed recipes.
  - [ ] **P5.T3.2:** Recompute the verdict; confirm mean ≥ 4.0, no criterion below 3, `basis: "independent"`.
  - [ ] **P5.T3.3:** If the bar is missed, record the failing criteria and stop — do not lower the bar, re-score to fit, or mix instruments.

## Verification

- Each phase: `pnpm verify` plus its own task tests.
- AC-1–AC-7: unit tests named in their phases.
- AC-8, AC-9: `test/art/rubric.test.ts` recomputing the verdict from `scores.json`.
- AC-10: `render --strict` plus the digest test for every changed asset.

## Risks

- **Band cost:** more bands means more per-pixel work; keep it linear and re-run
  the benchmark (NFR-4).
- **Score attribution:** raising `lighting` while `value_separation` falls is not
  progress; Phase 5 checks both, and AC-9 names the two criteria that must move.
- **Instrument noise:** ±1 point per criterion per the last track's calibration.
  A 0.6 mean rise on two criteria is above that, but the final mean is the bar.
