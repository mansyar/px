# Surface Fidelity — Implementation Plan

> **Branch:** `feat/20261113-surface-fidelity`
> **Base:** `main` @ `5cec2b37ca4a`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Independent Instrument and Baseline

- **Goal:** the seven assets carry fourteen independent model passes with the
  record instrument named, and the difference from the archived 3.90 is written down.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, NFR-2, NFR-5, NFR-8, AC-1, AC-2, AC-3
- **Touches:** `scripts/rubric.mjs`, `test/art/scores.json`, `test/art/rubric.test.ts`, `docs/rubric.md`
- **Verification:** `pnpm verify && pnpm vitest run test/art`
- **Status:** verified

- [x] **P1.T1: Pin the record instrument** — covers: FR-1
  - [x] **P1.T1.1:** Pin `gemini-3.5-flash-lite` as the record model (owner decision) and record it, with the two dry-run results that justify keeping it, in the phase evidence.
  - [x] **P1.T1.2:** Make `scripts/rubric.mjs` record `model` on every pass and assert in `test/art/rubric.test.ts` that a `vision-model` pass names its model; a pass from any other model id is a record error.
  - [x] **P1.T1.3:** Measure the instrument's own disagreement: score one asset's two views twice and record the per-criterion spread, so Phase 6 can tell noise from progress.
- [x] **P1.T2: Baseline re-score, before any art change** — covers: FR-2
  - [x] **P1.T2.1:** Score all seven assets twice each on `gemini-3.5-flash-lite`, pass A on the 8× view and pass B on the debug sheet, replacing the mixed record.
  - [x] **P1.T2.2:** Recompute the verdict and confirm `basis: "independent"`, the recomputed mean, and the listed failures are consistent.
- [x] **P1.T3: Calibration note against the archived result** — covers: FR-3
  - [x] **P1.T3.1:** Compare the independent baseline with the archived 3.90 per criterion and per asset; record the deltas and which instrument produced each number.
  - [x] **P1.T3.2:** Record whether the independent bar is stricter or looser, and therefore whether Phase 6's 4.0 target is comparable; if a below-floor score appears on unchanged art, name it as an instrument effect and keep it in the baseline rather than adjusting the bar.

**Result:** verified
**Checkpoint:** ca0bde5
**Evidence:** conductor/tracks/20261113-surface-fidelity/verification/phase-1.md

## Phase 2: Plane Ownership

- **Goal:** a recipe can declare two adjacent planes of one material without a lint
  false positive, and a real collision is still reported.
- **Depends on:** Phase 1
- **Covers:** FR-4, FR-5, FR-6, FR-7, AC-4, AC-5, AC-6
- **Touches:** `src/lint/**`, `src/core/parts.ts`, `test/lint/**`, `test/parts/**`
- **Verification:** `pnpm verify`
- **Status:** pending

- [ ] **P2.T1: Plane-aware value comparison** — covers: FR-4
  - [ ] **P2.T1.1:** Resolve each part's comparison tone from its `facing` plane before falling back to the material base tone.
  - [ ] **P2.T1.2:** Suppress `VALUE_COLLISION` for a 4-adjacent pair that shares a material but declares different planes whose resolved tones clear one step.
  - [ ] **P2.T1.3:** Keep reporting exactly one finding when the resolved tones collide, and name both parts.
- [ ] **P2.T2: Shared ridge tolerance** — covers: FR-5
  - [ ] **P2.T2.1:** Allow a one-pixel ridge between same-material plane parts to be written twice without a part-overwrite error.
  - [ ] **P2.T2.2:** Keep the error for a genuinely overlapping or different-material write, so the tolerance cannot hide a mistake.
- [ ] **P2.T3: Regression coverage** — covers: FR-6, FR-7
  - [ ] **P2.T3.1:** Fixtures for the four cases: clean plane pair, colliding plane pair, different material, real overwrite.
  - [ ] **P2.T3.2:** Make the finding text say the comparison was plane-resolved, and assert it.

## Phase 3: Form Lighting

- **Goal:** an agent can shade a mass with interior bands from its form, not just a rim.
- **Depends on:** Phase 2
- **Covers:** FR-8, FR-9, FR-10, NFR-1, NFR-4, AC-7, AC-8, AC-9
- **Touches:** `src/core/ops/form-shade.ts`, `src/core/ops/index.ts`, `src/core/recipe/{types,normalize}.ts`, `test/ops/**`, `test/recipe/**`, `test/benchmarks/**`
- **Verification:** `pnpm verify`
- **Status:** pending

- [ ] **P3.T1: Op surface and normalization** — covers: FR-8
  - [ ] **P3.T1.1:** Write the design note that picks between a new `form_shade` op and an `auto_shade` option, with the compatibility argument for the choice.
  - [ ] **P3.T1.2:** Implement the op with `part`, `light_dir`, `from`, `to` and an optional band width, validated in `normalize.ts` under schema 1.2.
  - [ ] **P3.T1.3:** Derive band widths from the part's thickness between `from` and `to` so the result depends on the form, not on canvas width.
- [ ] **P3.T2: Band placement and occlusion** — covers: FR-9
  - [ ] **P3.T2.1:** Place lit, mid and shadow bands using one direction and the plane from `facing`, deterministic across replays.
  - [ ] **P3.T2.2:** Darken one ramp step where the part meets a part behind it along the light direction, and prove idempotence on a re-run.
- [ ] **P3.T3: Errors, flat palettes and cost** — covers: FR-10
  - [ ] **P3.T3.1:** Raise `E_NO_RAMP` on a flat family and leave the canvas byte-identical on that path.
  - [ ] **P3.T3.2:** Add the op to the benchmark and confirm the 2,000-op budget is unaffected.

## Phase 4: Texture on Small Parts

- **Goal:** a part smaller than a lattice cell still receives legal texture instead of
  silently nothing.
- **Depends on:** Phase 3
- **Covers:** FR-11, FR-12, FR-13, AC-10, AC-11, AC-12
- **Touches:** `src/core/ops/texture.ts`, `src/core/recipe/{types,normalize}.ts`, `test/texture/**`
- **Verification:** `pnpm verify`
- **Status:** pending

- [ ] **P4.T1: Region fit** — covers: FR-11
  - [ ] **P4.T1.1:** Add `fit: "region"` alongside the existing default, with a documented rule for where the lattice starts and how a partial mark is clipped.
  - [ ] **P4.T1.2:** Guarantee at least one mark at or above the cluster minimum on a part smaller than one cell, with the 9×8 leg as the fixture.
  - [ ] **P4.T1.3:** Keep pattern choice and gap behaviour identical to the current implementation for parts that already fit a cell.
- [ ] **P4.T2: No-room warning** — covers: FR-12
  - [ ] **P4.T2.1:** Report a warning naming the part when no legal mark fits, and paint zero pixels rather than raising.
  - [ ] **P4.T2.2:** Assert the warning appears once, not per scanned cell.
- [ ] **P4.T3: Compatibility** — covers: FR-13
  - [ ] **P4.T3.1:** Confirm the pre-track potion, sword, humanoid and chest digests are unchanged.

## Phase 5: Ramps and Edge Language

- **Goal:** ramps carry form with a hue shift, and strokes can close a shape without
  switching treatment.
- **Depends on:** Phase 4
- **Covers:** FR-14, FR-15, FR-16, AC-13, AC-14
- **Touches:** `src/core/palette.ts`, `src/core/ops/ramp.ts`, `src/core/ops/stroke.ts`, `src/core/recipe/{types,normalize}.ts`, `test/ops/**`, `test/recipe/**`
- **Verification:** `pnpm verify`
- **Status:** pending

- [ ] **P5.T1: Hue-shifted ramp derivation** — covers: FR-14
  - [ ] **P5.T1.1:** Derive N stops from a base colour with cool shadows and warm highlights, deterministic rounding, per material.
  - [ ] **P5.T1.2:** Keep existing explicit ramp families byte-identical; derivation is additive.
  - [ ] **P5.T1.3:** Assert the step is even and the hue actually shifts, not just the value.
- [ ] **P5.T2: Stroke corners and caps** — covers: FR-15
  - [ ] **P5.T2.1:** Add `corner` and `cap` with defaults that reproduce today's bytes; assert byte equality for a recipe that omits both.
  - [ ] **P5.T2.2:** Fixture the character's leg-to-torso join to show the outline no longer switches treatment there.
- [ ] **P5.T3: Schema 1.2 gate** — covers: FR-16
  - [ ] **P5.T3.1:** Accept the new options only under version `"1.2"`, and reject them under `1.1`/`1.0` with a message naming the version.
  - [ ] **P5.T3.2:** Record the version decision in `tech-stack.md` and add the migration test.

## Phase 6: Re-authoring and Independent Score

- **Goal:** the scene and character are rebuilt on the new surface, humanoid and sword
  are re-lit, and the seven assets clear 4.0 on the independent instrument.
- **Depends on:** Phase 5
- **Covers:** FR-17, FR-18, FR-19, NFR-1, NFR-7, AC-15, AC-16
- **Touches:** `test/art/**`, `docs/rubric.md`
- **Verification:** `pnpm verify && pnpm vitest run test/art && node scripts/rubric.mjs --asset <name> ...` (see tasks)
- **Status:** pending

- [ ] **P6.T1: Scene wall on geometry** — covers: FR-17
  - [ ] **P6.T1.1:** Replace the ASCII masonry with polygon courses, stroke joints and a texture course, keeping the roof, well and apron.
  - [ ] **P6.T1.2:** Split the gable into two facing planes now that Phase 2 allows it, or record why not.
  - [ ] **P6.T1.3:** Render `--strict` clean, re-baseline the digest with a reason, and re-run the thin-cluster count against the archived 222.
- [ ] **P6.T2: Character rebuild** — covers: FR-18
  - [ ] **P6.T2.1:** Replace the 1 px dither with 2×2 form shading on the body masses.
  - [ ] **P6.T2.2:** Give the outline one treatment using Phase 5's corner and cap controls, and note the rule in the design file.
- [ ] **P6.T3: Humanoid and sword lighting** — covers: FR-19
  - [ ] **P6.T3.1:** Re-light both with `form_shade`, replacing the hand-placed shadow bands.
  - [ ] **P6.T3.2:** Re-run the four benchmark digests that must not change and record the two that do.
- [ ] **P6.T4: Independent re-score** — covers: FR-19, AC-15
  - [ ] **P6.T4.1:** Score all seven assets twice on the Phase 1 instrument, with the same views as the baseline.
  - [ ] **P6.T4.2:** Recompute the verdict in `scores.json` and confirm `mean ≥ 4.0`, no score below 3, `basis: "independent"`.
  - [ ] **P6.T4.3:** If the bar is missed, record the failing criteria and stop — do not lower the bar or re-score to fit.
