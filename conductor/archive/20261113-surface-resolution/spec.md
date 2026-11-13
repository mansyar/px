# Surface Resolution — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

`20261113-surface-fidelity` re-scored the seven assets on the independent
instrument at **3.73** against a 4.0 bar. The per-criterion means locate the
shortfall precisely: `silhouette` 4.64 (authoring is sound), `cluster_discipline`
3.93, `value_separation` 3.79, `palette_craft` 3.50, `edge_language` 3.36,
`lighting` 3.14.

Three of those are engine ceilings, not drawing mistakes. `light` places one band
per occupied rank, so a wide shallow mass gets a single flat band. `auto_outline`
draws one uniform ink line and has no interior edge treatment. A four-tone ramp
gives no tone between `base` and `highlight`, so a plane cannot hold a second
step. This track closes all three, then re-authors against them and re-scores on
the same instrument.

## Problem / Motivation

The failing passes say the same three things in different words:

1. **Band placement.** "Some masses lack consistent internal highlights and
   shadows" (humanoid A/B), "shading on the liquid and cork is somewhat flat"
   (potion A). The scene's 197×110 wall drum is the extreme case: one band wide,
   it reads as flat fill and scored `lighting` 2 on pass A.
2. **Interior edge language.** "Inner details lack a clear, varied treatment"
   (potion A), "internal detail edges blur into the silhouette" (sword B). The
   outline is correct at the silhouette and absent inside it, because
   `auto_outline` only writes one role on one side of the outer boundary.
3. **Palette resolution.** `palette_craft` is the second-weakest criterion, and
   three assets still carry hand-written four-tone ramps whose `base` and
   `highlight` are a single synthesis step apart. `derive` from the previous
   track can emit 2–8 tones, but no role can point at tone 2 of 6, so extra tones
   are unreachable from an op.

A fourth gap showed up while authoring: `light` runs late and re-tones every
part, which forced the scene's gable to be painted *after* the pass to keep its
authored plane tones. That workaround is a rule now; it should be an option.

## Goals & Success Metrics

- **Goal:** every asset can express a lit form, an interior edge and a palette
  step without hand-placing pixels or reordering passes.
- **Metric:** the seven assets score mean **≥ 4.0** with no criterion below 3,
  `basis: "independent"`, on `gemini-3.5-flash-lite`, verdict recomputed by
  `test/art/rubric.test.ts`.
- **Secondary metric:** `lighting` and `edge_language` means each rise by ≥ 0.6
  over this track's baseline (3.14 and 3.36), so improvement is attributable to
  the criteria the engine work targets rather than to noise.

## Scope

### In Scope

- `light` band count and placement, per part and by thickness.
- `light` part selection, so authored tones survive the pass without reordering.
- An interior edge role for boundaries inside the silhouette.
- Ramp tones addressable by role, with more than four stops.
- Schema `"1.3"` gating the new options.
- Re-authoring the six assets below 4.0 and re-screening the scene's lighting.
- Re-baselined digests with a stated reason per changed asset.
- Fourteen fresh independent passes and a recomputed verdict.

### Out of Scope

- New texture patterns, new op names where an option will do.
- Changing any lint threshold, the coverage gate, or the rubric bar.
- Reworking the plane-aware value lint or the texture fit shipped last track.
- Editing archived tracks, their reviews, or their scores.
- Animation, extra layers, or any browser surface.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | `light` gains `bands` (2–4) with `band_scale: "thickness" \| "uniform"`, so a wide mass can carry more than one interior band along the light axis. | must |
| FR-2 | `bands` absent reproduces the pre-track bytes exactly; every existing asset digest is unchanged by the option alone. | must |
| FR-3 | `light` gains `parts` (an allow-list) and `skip` (a deny-list), mutually exclusive, so authored tones on a named part survive the pass. | must |
| FR-4 | `auto_outline` gains `inner`, a role written on the inside of boundaries between two parts, distinct from the silhouette outline. | must |
| FR-5 | An inner edge is drawn once per boundary, never over a silhouette pixel, and never creates a part-overwrite warning. | must |
| FR-6 | A ramp role may address a tone (`base: "t2"`), and a family may declare 2–8 tones; explicit hex roles keep working unchanged. | must |
| FR-7 | `VALUE_COLLISION` and `E_NO_RAMP` behave exactly as before on palettes that use only hex roles. | must |
| FR-8 | New options require recipe version `"1.3"`; a `1.2` document that uses one is rejected with a message naming `"1.3"`. | must |
| FR-9 | Six assets scoring below 4.0 are re-authored to use the new surface controls, and the scene's lighting is reworked. | must |
| FR-10 | All seven assets are re-scored twice on the independent instrument and the verdict is recomputed. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Determinism: identical input produces identical bytes; every digest change is deliberate, versioned and re-baselined with a reason. |
| NFR-2 | No new runtime dependency; the engine and test suite make no network call. |
| NFR-3 | Coverage gate stays at 80 and is not lowered to fit a phase. |
| NFR-4 | The 2,000-op / ≤256² performance budget is unchanged; band work stays linear in painted pixels. |
| NFR-5 | Node `>=24 <25`, ESM, strict TypeScript, no new build step. |
| NFR-6 | Reports stay bounded: no unbounded field is added to `render`/`inspect` output. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | A 40×8 mass lit with `bands: 3` shows three distinct interior bands in one direction, and `bands: 1` matches today's output byte for byte. | FR-1, FR-2 |
| AC-2 | `bands` on 3 px-thick and 40 px-thick masses both produce the requested count, with widths derived from thickness rather than fixed. | FR-1 |
| AC-3 | A part named in `skip` keeps its authored tone while its neighbours are shaded; the same recipe without `skip` changes it. | FR-3 |
| AC-4 | `parts` and `skip` together are rejected as `E_BAD_PARAM`, not silently resolved. | FR-3 |
| AC-5 | Two adjacent parts of different materials gain one interior edge role on their shared boundary, while the outer silhouette outline is unchanged. | FR-4, FR-5 |
| AC-6 | A six-tone derived ramp with `base: "t3"` resolves that slot, and a four-tone hex ramp renders byte-identically to the pre-track build. | FR-6, FR-7 |
| AC-7 | A `1.2` recipe using `bands`, `skip` or an inner edge is rejected with a version message naming `"1.3"`. | FR-8 |
| AC-8 | The seven assets score mean ≥ 4.0, no criterion below 3, `basis: "independent"`, recomputed by the record test. | FR-9, FR-10 |
| AC-9 | `lighting` and `edge_language` means each rise by at least 0.6 against 3.14 and 3.36. | FR-1, FR-4, FR-9 |
| AC-10 | Every changed asset renders `--strict` clean and its digest is re-baselined with a written reason. | FR-9 |

## Edge Cases

- A part one pixel thick: `bands` must degrade to one band, not error.
- A 2 px mass where the band count exceeds the thickness: clamp, do not sample
  outside the part.
- `skip` naming an undeclared part: error naming the part, not a silent no-op.
- An inner boundary where both sides resolve to the same role: draw nothing.
- An inner boundary meeting a one-pixel ridge part: the ridge keeps its tone; the
  inner edge may not overwrite it.
- A ramp with roles and tones mixed where a role points at a tone that does not
  exist: error naming both.
- Two bands landing on the same row because the part is thinner than the count:
  collapse to one band rather than stack two roles on one pixel.

## Dependencies

- **Tracks:** `20261113-surface-fidelity` — required for plane-aware value lint,
  `form: "round"` light and schema 1.2. That track is **not merged** (Phase 6
  failed on the score), so this track branches from its head rather than `main`.
- **External:** `gemini-3.5-flash-lite` through
  `PX_RUBRIC_CREDENTIALS=~/.config/opencode/opencode.json`. No credential is
  copied into the repository, an argument, or a log.

## Open Questions & Assumptions

- **Assumption:** `bands` is an option on `light`, not a new op. The engine has
  one shading pass; a second op would have to re-derive what the first knows.
- **Assumption:** `inner` is a role on `auto_outline` rather than a separate
  `inner_outline` op, because it shares the boundary walk and the ownership rules.
- **Question:** whether a role pointing at a tone should be resolved at
  normalize time (rewriting the ramp) or at compile time (leaving the recipe
  symbolic). Normalize is simpler; compile keeps the authored intent visible.
- **Risk:** raising `lighting` and `edge_language` by 0.6 each lifts the mean by
  roughly 0.2 — enough to pass only if the other criteria hold at today's levels.
  Phase 4 must choose edits that do not cost `cluster_discipline` or
  `value_separation`.
