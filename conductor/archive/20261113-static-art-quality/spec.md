# Static Art Quality — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not renumber it. If a
> requirement is removed, mark it `Withdrawn` instead of deleting it.

## Overview

Phase 1 makes *legal* pixel art cheap: a deterministic engine that compiles declarative recipes to
byte-identical PNGs with symbolic feedback. This track raises the ceiling from legal to
production quality by giving the engine a scene vocabulary (parts with materials), a real lighting
pass, rules that know what scale they operate at, a palette that can be synthesised instead of
hand-picked, deterministic repair for what the linter names, and cheaper iteration for the agent.

Quality is proven by a blind rubric over seven assets, not asserted by the authors.

## Problem / Motivation

Dogfooding a 32×32 sword and a 48×48 chest produced sprites that are readable and correctly
anchored, and that still look flat. Four causes, each confirmed by reading the code and the
renders:

1. **The authoring vocabulary is coordinates, not parts.** Shading "the guard" means re-deriving
   `rect 9,21,14×2` by hand. Most of the authoring budget is arithmetic, not decisions, and every
   later pass pays the same cost again.
2. **The shading model is one rule deep.** `auto_shade` is a 1 px rim; `ramp_fill` projects three
   tones along a light axis. Neither can express contact shadows between parts, a bevel, cast
   shadow, specular clusters, or occlusion — so everything reads as a flat shape with an edge
   highlight.
3. **Feedback judges legality, not quality.** The linter catches orphan pixels and jaggy lines. It
   is silent about adjacent parts sharing a value, banding, pillow shading, dither used as noise,
   or a silhouette that dies on a dark background.
4. **Every rule is calibrated for 32 px.** `JAGGY_MAX_RUN = 3`, `ORPHAN_PIXEL` radius 2, three
   tones per material, an 8× debug panel — each is correct in one regime and wrong in others. A
   128 px sprite is therefore both under-checked and over-corrected, and a 256 px debug sheet is
   downsampled into uselessness by any vision model.

## Goals & Success Metrics

- **Production-readable output**
  - Metric: rubric mean ≥ 4.0/5 with no criterion below 3, across 7 scored assets.
- **Existing work undisturbed**
  - Metric: the hero golden and all four original benchmark recipes render byte-identically.
- **Parts pay for themselves**
  - Metric: each re-authored asset is authored in no more than its Phase 1 call count + 2.
- **Large canvases supported honestly**
  - Metric: 256×256 with 2,000 ops and a full lighting pass completes in ≤ 500 ms median of 5.
- **Determinism survives**
  - Metric: repeat renders identical; CI green on `ubuntu-latest` and `windows-latest`.

## Scope

### In Scope

- Recipe schema `1.1`: optional `parts` map, `part` on painting ops, derived masks, one owner per
  pixel, `z` affecting shading only.
- Materials resolving to palette families, with a closed gloss profile set: `matte`, `metal`,
  `gem`, `cloth`.
- A `light` post-pass: form (`flat`/`bevel`/`round`), ambient occlusion, cast shadow, rim
  (`none`/`edge`/`selective`), driven by gloss.
- Scale profiles (`tiny` ≤16, `small` 17–48, `medium` 49–128, `large` 129–256) as one data table
  governing lint thresholds, cluster minimums, dither eligibility, outline thickness, expected
  tones and debug zoom, plus an explicit override.
- Palette intelligence: OKLCH ramp synthesis of 3–6 steps with cool shadows and warm highlights,
  monotonicity, and material-level palette swap.
- Cleanup ops: `seal`, `strays`, `deband`, all reporting what changed.
- Seven art-direction lint codes with part attribution.
- Agent ergonomics: named coordinate references, `px diff`, per-part inspect histograms, adaptive
  debug zoom with per-part crops.
- Three new benchmarks (48×128 character, 64×64 mixed-material prop, 256×256 scene element) and
  four re-authored originals, scored by a rubric harness.
- An eighth MCP tool, `px_diff`, for surface parity with the CLI.

### Out of Scope

- Set consistency: contact sheets, cross-asset lint (baseline, outline thickness, palette, value
  histogram), shared templates — its own track.
- Animation, sprite-sheet packing, onion skinning.
- Tilemaps and auto-tiling.
- A graphical editor.
- Translucent alpha (`alpha_mode: "translucent"` remains rejected).
- Any RNG, style transfer, learned heuristics, or network call.
- Engine exports beyond the existing Godot 4 and generic blocks.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Recipes carry `version: "1.1"`. The `parts` map is optional. Recipes declaring `1.0` load and render byte-identically. | must |
| FR-2 | Any painting op may carry `part`. An undeclared name raises `E_PART_UNKNOWN` naming the declared parts. | must |
| FR-3 | Part masks are derived from painted pixels on replay: the last op to paint a pixel owns it, and `z` affects occlusion shading only, never which pixels exist. | must |
| FR-4 | A declared part that is never painted raises `E_EMPTY_PART`. A pixel taken over from another part raises `W_PART_OVERWRITE` (info). | must |
| FR-5 | A part's `material` must resolve to a palette family providing `shadow`, `base`, `highlight` and `outline`. A missing role keeps the existing `E_NO_RAMP` with its `--derive-ramps` hint. | must |
| FR-6 | Each material declares a gloss profile from a closed set: `matte`, `metal`, `gem`, `cloth`. An unknown profile raises `E_GLOSS_UNKNOWN`. | must |
| FR-7 | A `light` post-pass accepts `angle` (`top-left`, `top-right`, `bottom-left`, `bottom-right`), `form` (`flat`, `bevel`, `round`), `ao`, `cast` (part name or null), and `rim` (`none`, `edge`, `selective`). | must |
| FR-8 | Ambient occlusion darkens a pixel by one ramp step where it meets a part with a higher `z`, never across transparency, and clamps at canvas edges. | must |
| FR-9 | A cast shadow offsets along the light vector by 1–4 px, uses the casting family's `shadow` role, clips at the canvas, and never overwrites a higher-`z` owner. | must |
| FR-10 | Rim highlights the light-facing boundary and shadows the opposite boundary of each part, leaving interiors untouched. `selective` defers to the neighbouring family's `outline`. | must |
| FR-11 | Gloss rules are deterministic per profile: `metal` emits a hard diagonal specular with no diffuse banding; `gem` a bright core and emissive rim; `cloth` a dithered falloff; `matte` plain stepped bands. | must |
| FR-12 | A scale profile is derived from canvas size — `tiny` ≤16, `small` 17–48, `medium` 49–128, `large` 129–256 — and may be overridden explicitly in the recipe. | must |
| FR-13 | The profile governs lint thresholds, minimum cluster size, dither eligibility, outline thickness and debug zoom, all held in one data table. *(Amended in review round 2: "expected tone count" was withdrawn — a tone budget is a rubric judgement, not an engine threshold, and a field nothing consumed invited the reader to believe it was enforced. Recorded in `docs/art-profiles.md`.)* | must |
| FR-14 | A profile override that contradicts the canvas size raises `W_PROFILE_MISMATCH` (warning). | must |
| FR-15 | `synthesize` expands a base colour into N ramp steps (3–6) with documented hue-shift rules, and is canonicalised into the recipe on write so recipes remain explicit. | must |
| FR-16 | Synthesis operates in OKLCH with no dependency: shadows rotate toward cool, highlights toward warm, chroma is clamped, and a zero-chroma input shifts luminance only. | must |
| FR-17 | A step count outside 3–6 raises `E_RAMP_STEPS_RANGE`. | must |
| FR-18 | `--swap from=to` remaps at material level in render, export and preview, leaving the recipe untouched. Incompatible tone counts raise `E_SWAP_INCOMPATIBLE`. | must |
| FR-19 | Seven new lint codes: `VALUE_COLLISION` (warning), `BANDING` (info), `PILLOW_SHADE` (warning), `DITHER_NOISE` (info), `CLUSTER_THIN` (info), `RAMP_NONMONOTONIC` (warning), `SILHOUETTE_LOSS` (warning, evaluated per background). | must |
| FR-20 | Findings name the part when the offending pixels belong to one. The original four codes keep their severities. | must |
| FR-21 | `seal` closes gaps of ≤1 px, `strays` removes clusters below the profile minimum, and `deband` breaks equal-width parallel runs. Each reports what changed; a no-op raises `W_CLEANUP_NOOP`. | must |
| FR-22 | Coordinates may be `{"ref": "part.top|bottom|left|right|center|edge|anchor", "dx", "dy"}`, resolved deterministically, with an unknown part raising `E_PART_UNKNOWN`. | should |
| FR-23 | `px diff` compares the current render against a prior PNG or recipe hash and reports changed pixel count, bounding box and a per-part breakdown. | should |
| FR-24 | `inspect` returns per-part bounds, pixel count, and tone and value histograms; the debug sheet zooms by profile and adds per-part crops. | must |
| FR-25 | A rubric harness scores seven assets through two independent image-model passes with human tiebreak, recording scores and rationale per criterion. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Renders are byte-identical across repeated runs and across the Windows and Linux CI matrix. |
| NFR-2 | Exactly one runtime dependency remains: `@modelcontextprotocol/sdk`. OKLCH maths and cleanup passes are hand-written. |
| NFR-3 | Coverage stays ≥80% statements and branches over `src/core` and `src/lint`, with `src/palettes` and any new pure module added to the gate. |
| NFR-4 | Responses stay bounded at 256×256: inspect and diff cap their payloads, and the debug sheet never emits an unbounded panel. |
| NFR-5 | No network calls, no telemetry, no data leaves the machine. |
| NFR-6 | Node 24, ESM only, strict TypeScript. |
| NFR-7 | 256×256 with 2,000 ops and a full `light` pass completes in ≤500 ms median of five runs after warm-up. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | A 1.0 recipe renders byte-identically after the schema change, hero golden included. | FR-1 |
| AC-2 | An op naming an undeclared part fails with `E_PART_UNKNOWN` listing declared names. | FR-2 |
| AC-3 | Replaying a parts recipe twice yields identical masks and identical PNG bytes. | FR-3 |
| AC-4 | A declared-but-unpainted part errors, and taking over another part's pixel emits one info warning. | FR-4 |
| AC-5 | A material whose family lacks `highlight` still fails with `E_NO_RAMP` and the `--derive-ramps` hint. | FR-5 |
| AC-6 | All four gloss profiles are accepted, and an unknown one is rejected with `E_GLOSS_UNKNOWN`. | FR-6 |
| AC-7 | AO darkens exactly the boundary pixels adjacent to a higher-`z` part by one ramp step. | FR-8 |
| AC-8 | A cast shadow with a 2 px offset matches the expected offset pixels and clips at the canvas edge. | FR-9 |
| AC-9 | `rim: "selective"` uses the neighbour's `outline` colour where families differ. | FR-10 |
| AC-10 | A metal part renders a diagonal specular and no diffuse banding along the shadow side. | FR-11 |
| AC-11 | The derived profile is `tiny` at 16, `small` at 48, `medium` at 128 and `large` at 256. | FR-12 |
| AC-12 | The same shape produces different `CLUSTER_THIN` and dither outcomes under `tiny` and `large`. | FR-13 |
| AC-13 | A synthesised 5-step ramp has strictly monotonic luminance and shadows cooler than the base. | FR-15, FR-16 |
| AC-14 | `--swap` changes the rendered palette while the recipe file is unchanged. | FR-18 |
| AC-15 | Dither on a 3-tone ramp raises `DITHER_NOISE`; on a 5-step ramp it does not. | FR-19 |
| AC-16 | Two adjacent parts within one ramp step raise `VALUE_COLLISION` naming both parts. | FR-19, FR-20 |
| AC-17 | `seal` closes a 1 px gap and reports the coordinates it changed. | FR-21 |
| AC-18 | A named ref resolves to exactly the pixels its explicit coordinates would. | FR-22 |
| AC-19 | `diff` after a one-pixel edit reports exactly one changed pixel and its coordinate. | FR-23 |
| AC-20 | The rubric harness reports a mean ≥4.0 with no criterion below 3 across all seven assets. | FR-25 |

## Edge Cases

- `light` on a recipe with no parts: the whole layer is treated as one implicit part, documented.
- Painting a part's pixels outside the canvas: clipped with the existing `W_OUT_OF_BOUNDS`.
- Two parts at equal `z` overlapping: declaration order decides shading precedence, deterministically.
- AO at a canvas edge: clamped, never wraps.
- A cast shadow whose offset leaves the canvas: clipped, with a single warning per op.
- `synthesize` with 2 or 7 steps: `E_RAMP_STEPS_RANGE`.
- A fully desaturated input colour: hue unchanged, luminance steps only, no hue-shift claim.
- `--swap` onto a family with fewer steps than the source: `E_SWAP_INCOMPATIBLE`.
- `diff` between recipes of different canvas sizes: `E_DIFF_SIZE`.
- Named ref against an undeclared part: `E_PART_UNKNOWN`.
- Cleanup on an empty layer: no-op with `W_CLEANUP_NOOP`.
- A profile override inconsistent with canvas size: warning, not an error, because the caller may
  have a reason.

## Dependencies

- **Tracks:** none. Phase 1 is merged and archived.
- **External:** none. The GitHub remote exists for CI only; this track is not published.

## Open Questions & Assumptions

- **Assumption:** rubric criteria are silhouette at 1×, value separation, lighting consistency,
  edge language, cluster discipline and palette craft, each scored 1–5.
- **Assumption:** profile boundaries (16/48/128/256) and every threshold number live in one data
  table tuned during the benchmark phase and documented in `docs/art-profiles.md`.
- **Assumption:** image-model scores are stable to roughly ±1, which is why two passes are used and
  disagreements go to the human.
- **Assumption:** 500 ms is achievable at 256×256 because parts add bookkeeping and a bounded pass
  rather than per-pixel work in the inner loop.
- **Open:** none blocking. If the rubric cannot reach 4.0 at `large`, the honest response is to
  record which criterion failed rather than to lower the bar.

## References

- `conductor/product.md`, `conductor/product-guidelines.md`, `conductor/tech-stack.md`,
  `conductor/workflow.md`.
- Phase 1 specification and review: `conductor/archive/20261112-phase-1-static-sprite-engine/`.
- `docs/lint-thresholds.md` — the current 32 px-calibrated thresholds this track generalises.
