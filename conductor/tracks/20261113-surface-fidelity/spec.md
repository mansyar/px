# Surface Fidelity — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

The authoring primitives merged in `20261113-authoring-primitives` gave agents
`facing`, `stroke` and `texture`. The seven assets then measured **3.90** against
a 4.0 bar, and the failures clustered in three places the engine cannot express:
two adjacent planes of one material are a lint error, lighting is a rim rather
than a form, and texture placement yields nothing on parts smaller than a lattice
cell. This track closes those capability gaps, adds the ramp and edge controls the
character and the wall need, and re-authors the scene and character on the result
— measured this time by an independent model instrument, not by the agent that
drew the art.

## Problem / Motivation

Three findings from the archived track's review are engine limitations, not art
mistakes:

1. `VALUE_COLLISION` compares each part's **material base tone**. Two `facing`
   planes of one material therefore collide by construction (0.022 apart against
   a 0.06 bar), and the scene's gable had to collapse to a single part with
   hand-set tones (`wood.base`/`wood.shadow`) instead of declaring two planes.
2. `auto_shade` is a one-pixel **rim**: a pixel with a transparent up/left
   neighbour takes `highlight`, one with a transparent down/right neighbour takes
   `shadow`. It cannot place an interior band, so `lighting` scored 3 on both
   passes for the humanoid and the sword.
3. `texture` places marks on a lattice derived from density, and its full-fit rule
   leaves **zero** marks on a 9×8 leg — the camo had to be hand-placed at 2×2,
   defeating the primitive.

Two more gaps showed up in the same place: ramps step through one hue, so
`palette_craft` sits at 3 wherever the palette has to carry the form; and `stroke`
has no corner or cap control, so the character's outline switches treatment
between legs and torso.

The measurement itself was the fifth problem. Eight of fourteen passes were agent
self-reviews (`basis: "mixed"`) because no model credential was configured. A
0.10 miss is exactly the size of that instrument bias, so the next track cannot
claim a 4.0 without an independent measurement.

## Goals & Success Metrics

- **Goal:** every engine limit named above is expressible in a recipe, and the
  seven assets clear the rubric on an independent instrument.
- **Metric:** mean of fourteen independent model passes **≥ 4.0**, no criterion
  below 3, `verdict.basis: "independent"`, verdict recomputed by
  `test/art/rubric.test.ts`; `pnpm verify` and the coverage gate green throughout.
- **Secondary metric:** the scene and character improve by at least one point on
  every criterion that scored 3 in the archived record.

## Scope

### In Scope

- An independent scoring instrument (Gemini's OpenAI-compatible endpoint reached
  through `scripts/rubric.mjs`), two passes per asset, model id recorded per pass.
- A baseline re-score of the seven assets before any art changes.
- Plane-aware value lint: adjacent same-material parts on different planes, and a
  one-pixel shared ridge between them.
- `form_shade`: light bands derived from the part's form, plus join occlusion.
- `texture` region fit: guaranteed legal marks on parts smaller than a lattice
  cell, and a warning when no legal mark fits.
- Ramp derivation with per-stop hue shift, and `stroke` corner/cap controls.
- Schema 1.2: new op options are version-gated; older recipes reject them.
- Re-authoring the scene wall and the character; re-lighting humanoid and sword.
- Re-baselined digests with a stated reason per asset.

### Out of Scope

- Any change to the seven assets' subjects, sizes or palettes beyond what the
  redraw needs.
- New texture patterns beyond the five that ship.
- Animation, layers beyond the existing schema, or a browser/preview surface.
- Weakening any lint threshold, coverage gate or rubric bar.
- Editing the archived track, its review, or its scores.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The scorer produces two independent passes per asset from a model instrument, and every `vision-model` pass records the model id it was scored with. | must |
| FR-2 | The seven assets are re-scored on the record instrument before any art change, and the record's verdict is recomputed from those passes with `basis: "independent"`. | must |
| FR-3 | The calibration difference between the independent baseline and the archived 3.90 is recorded, naming both instruments and the per-criterion deltas. | must |
| FR-4 | `VALUE_COLLISION` does not report two 4-adjacent parts that share a material but declare different `facing`, when their plane-resolved tones differ by at least one synthesis step. | must |
| FR-5 | A one-pixel shared ridge between two such plane parts is not a part-overwrite error, provided the later writer is the same material. | must |
| FR-6 | Two parts that share a material and a plane, or whose plane-resolved tones are closer than one step, still report `VALUE_COLLISION` exactly once. | must |
| FR-7 | The lint finding for a plane pair names both parts and states that the collision is plane-resolved, so an agent can tell it apart from a material collision. | should |
| FR-8 | A `form_shade` op places interior light and shadow bands across a part from its `facing` and its thickness, using one light direction, deterministically. | must |
| FR-9 | `form_shade` darkens the band where a part meets a part behind it along the light direction (join occlusion), by one ramp step. | should |
| FR-10 | `form_shade` raises `E_NO_RAMP` on a flat palette family, like `auto_shade`, and changes nothing else. | must |
| FR-11 | `texture` gains `fit: "region"`, which guarantees at least one mark of at least the profile minimum on a part smaller than one lattice cell, allowing partial marks at the edges. | must |
| FR-12 | When no legal mark fits, `texture` reports a warning naming the part and paints nothing, rather than silently succeeding with zero marks. | must |
| FR-13 | Existing `texture` recipes that do not set `fit` render byte-identical to before this track. | must |
| FR-14 | Ramp derivation produces N stops with a hue shift (shadows cool, highlights warm) and deterministic rounding, per material. | must |
| FR-15 | `stroke` gains `corner: "miter" \| "round" \| "bevel"` and `cap: "butt" \| "round"`; absent options reproduce the current bytes exactly. | must |
| FR-16 | New op names and options require recipe version `"1.2"`; a `1.1` or `1.0` recipe that uses them is rejected with a migration message. | must |
| FR-17 | The scene's wall is rebuilt from geometry — polygon courses, stroke joints, texture courses — replacing the ASCII masonry. | must |
| FR-18 | The character is rebuilt with 2×2 form shading and a deliberate outline treatment, replacing the 1 px dither. | must |
| FR-19 | The humanoid and the sword are re-lit with `form_shade`, and all four re-authored assets are re-scored on the independent instrument. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Determinism: identical input produces identical bytes; any digest change is deliberate, versioned and re-baselined with a reason. |
| NFR-2 | One runtime dependency stays the budget; the new instrument lives in `scripts/`, never in `src/`. |
| NFR-3 | Coverage gate stays at 80 for new code and is not lowered to fit a phase. |
| NFR-4 | Reports stay bounded: no op may add an unbounded field to `render`/`inspect` output. |
| NFR-5 | The engine and the test suite never make a network call; scoring stays in `scripts/rubric.mjs`. |
| NFR-6 | Node `>=24 <25`, ESM, strict TypeScript, no new build step. |
| NFR-7 | The 2,000-op / ≤256² performance budget is unchanged; a scene redraw may not regress the benchmark beyond the existing tolerance. |
| NFR-8 | No credential is ever written to the repository, an argument, a log or a fixture; the scorer reads one by reference or environment. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | The record carries two passes per asset, each `scorer: "vision-model"`, each naming its model id. | FR-1 |
| AC-2 | The baseline re-score records `basis: "independent"`, a recomputed mean and no unlisted failures. | FR-2 |
| AC-3 | A calibration note compares the independent baseline with the archived 3.90 per criterion. | FR-3 |
| AC-4 | A fixture with two facing planes of one material lints clean; the same fixture with one plane removed still reports `VALUE_COLLISION`. | FR-4 |
| AC-5 | A fixture with a one-pixel ridge between facing planes produces no part-overwrite error, and one that genuinely overwrites still does. | FR-5 |
| AC-6 | A plane pair whose resolved tones collide reports exactly one finding, naming both parts. | FR-6 |
| AC-7 | `form_shade` on a three-tone mass produces a lit band, a midtone and a shadow band in one direction, with the band widths derived from thickness. | FR-8 |
| AC-8 | A T-join between two parts gains one darker band along the join, and the op is idempotent on a second run of the same recipe. | FR-9 |
| AC-9 | `form_shade` on a flat family exits with `E_NO_RAMP` and leaves the canvas byte-identical. | FR-10 |
| AC-10 | A 9×8 leg with `fit: "region"` receives at least one camo mark at or above the cluster minimum. | FR-11 |
| AC-11 | A 3×2 part with `fit: "region"` reports a no-room warning and paints zero pixels. | FR-12 |
| AC-12 | The pre-track potion, sword, humanoid and chest digests are unchanged after the texture change. | FR-13 |
| AC-13 | Ramp derivation steps evenly and shifts hue across the stops; `stroke` with no new options renders byte-identically to the pre-track build. | FR-14, FR-15 |
| AC-14 | A `1.1` recipe using `form_shade` or `fit: "region"` is rejected with a version message naming `"1.2"`. | FR-16 |
| AC-15 | The seven assets score mean ≥ 4.0 with no criterion below 3, `basis: "independent"`, and the verdict is recomputed by the record test. | FR-17, FR-18, FR-19 |
| AC-16 | Every re-authored asset renders `--strict` clean and its digest is re-baselined with a written reason. | FR-17, FR-18, FR-19 |

## Edge Cases

- A plane part one pixel wide: plane-resolved comparison must still run, and a
  missing `facing` falls back to material-tone comparison.
- A ridge where the later writer is a *different* material: keep the overwrite
  error; the same-material tolerance must not mask a real mistake.
- A texture region smaller than one mark: warning, not an error, and the render
  stays valid.
- `form_shade` on a part with no interior pixels (a 1 px stroke): no bands, no
  error, deterministic no-op reported in the op count.
- A ramp with two stops: no midtone; `form_shade` must degrade to two bands rather
  than error.
- A model reply that fails validation: the scorer exits 1 and writes nothing, so a
  failed call cannot corrupt a pass.
- A different Gemini model than the calibrated one: the record must be re-scored
  in full rather than mixing instruments silently.

## Dependencies

- **Tracks:** `20261113-authoring-primitives` — required; merged as `b3af7b3`, an
  ancestor of this branch's base.
- **External:** a Gemini API key reachable through
  `PX_RUBRIC_CREDENTIALS=~/.config/opencode/opencode.json` (present, verified with
  a dry run on `gemini-3.5-flash-lite`). No credential is copied into the
  repository.

## Open Questions & Assumptions

- **Assumption:** the record instrument is a frontier Gemini model (pro tier),
  chosen in Phase 1 by comparing it with `flash-lite` on two assets. The choice is
  recorded with the model id in every pass, so a later reader can see it.
- **Assumption:** an instrument change mid-track requires re-scoring all fourteen
  passes, not only the changed assets; mixing models in one verdict is treated as
  the same error as mixing self-review.
- **Assumption:** plane-aware lint is a behavior change to the lint rule only, not
  to the recipe format, so it needs no schema bump; the new op options do, hence
  `"1.2"`.
- **Question:** whether `form_shade` should reuse `auto_shade`'s name with a
  `bands` option instead of a new op. Deferred to Phase 3's design note; the
  requirement is the behavior, not the name.

## References

- `conductor/archive/20261113-authoring-primitives/review.md` — F1, the out-of-scope
  engine findings, and the override that merged 3.90.
- `conductor/archive/20261113-authoring-primitives/verification/phase-6.md` — the
  per-asset scores behind F1.
- `docs/rubric.md` — criteria, anchors, and the two scoring paths.
- `src/lint/value.ts`, `src/core/ops/shade.ts`, `src/core/ops/texture.ts`,
  `src/core/ops/stroke.ts` — the code each engine requirement names.
