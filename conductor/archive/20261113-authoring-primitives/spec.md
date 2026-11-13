# Authoring Primitives — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not renumber it. If a requirement is removed, mark it `Withdrawn` instead of deleting it.
>
> **Derived from a failure.** The previous track (`20261113-static-art-quality`) ended with AC-20 recorded as failed: seven assets scored blind on a six-criterion rubric, mean **3.79** against a 4.0 bar, four criteria below 3. The diagnosis in `conductor/archive/20261113-static-art-quality/verification/phase-7-scoring.md` and the fourteen passes in `test/art/scores.json` name three authoring-capability gaps, and this track exists to close them. Nothing here re-litigates that result; it makes it winnable.

## Overview

Add three authoring primitives to `px` — **per-part facing for plane shading**, a **path stroke that cleans its own steps**, and a **cluster-aware texture pass** — so that an agent can build form on a broad surface, draw a long edge without stairsteps, and lay texture that survives at 1×. Then re-author the same seven assets on the new surface and score them with the same instrument.

Success is measured against the artifact that failed, not against new claims about it.

## Problem / Motivation

The scoring run failed on the same three complaints in every round and both pass styles:

1. **Flat form on broad faces.** Every shading rule in `light` is edge-based — bevel reads silhouette-adjacent pixels, `ramp_fill` bands by occupied light-axis projection, AO and cast work at boundaries. A 32 px torso or a 256 px wall that faces the viewer has no edge to read, so it gets one flat tone. Three of the four failing assets fail `lighting` for this reason, with the rationales naming "symmetric vertical bands" and "the roof split down its centre" — the engine banding a surface that should be one plane.
2. **Stair-stepped edges.** `line` is Bresenham, `polygon` is scanline, and the `pixel_perfect` flag was withdrawn in the Phase 1 track because it removed corners Bresenham never emits. Nothing reasons about a **path**, so a 256 px diagonal edge carries a regular 1-2-1-2 staircase that reads as jagged at 1× and cannot be fixed by any sequence of existing ops.
3. **Texture that vanishes.** `dither_fill` is a 2 px lattice. At `large` the profile's own `minCluster` is 3 and `CLUSTER_THIN` correctly reports every dither pixel as a speck, so the engine's texture primitive is illegal at the scale where texture matters most.

Each gap is a missing capability, not missing effort: another revision round with the same ops lands in the same place, which is exactly what happened when the assets were revised mid-track and the scores did not move.

## Goals & Success Metrics

- **Reach the bar on the failed artifact set.** Re-author the same seven assets using only the new surface; two vision-model passes per asset on the same rubric; mean ≥ 4.0 with no criterion below 3.
  - Metric: `test/art/scores.json` records a passing verdict, and the integrity test recomputes it rather than trusting the record.
- **Make each gap's fix demonstrable in isolation.** Each primitive gets a before/after fixture pair showing the failure and the fix, so a failure at the rubric level can be traced to a primitive rather than argued about.
  - Metric: three fixture pairs, each pinning both sides, named in the evidence.
- **Do not regress determinism or compatibility.** The hero golden and every committed asset digest are unchanged except the seven re-authored ones, which are re-baselined deliberately and recorded.
  - Metric: byte-identical hero; every changed digest listed with its reason.

## Scope

**In Scope**

- `facing` on parts: `front` / `back` / `left` / `right` / `top` / `bottom`, or an explicit 3-vector, giving `light` a per-plane base tone from `dot(facing, light)`.
- `stroke`: polyline path with optional closure and optional smoothing through control points, width 1–2, self-cleaning (no L-turn double pixels, no repeating step runs at any length), deterministic.
- `texture`: a pass over a part emitting one of `stipple`, `hatch`, `grain`, `brick`, `mottle`, with marks at or above the profile's `minCluster` by construction and spacing derived from it.
- Feedback updated to match: lint must not report a legal texture as noise, and the debug sheet must make plane boundaries and mark spacing visible.
- The seven assets re-authored on the new surface, their digests re-baselined, their design notes updated with what changed and why.
- Rubric re-run with the recorded result, including a fresh verdict.

**Out of Scope**

- Animation, sprite sheets, tilemaps, GUI — still deferred.
- Translucent alpha, RNG, style transfer, network calls.
- Set-level composition or contact sheets across assets.
- Fixing derived-ramp hue crossing between materials (a known Low from the previous track): authors may declare explicit ramps where it matters.
- New rubric criteria, new scoring instruments, or lowering the bar.

## Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | A part may declare `facing`, either one of `front`, `back`, `left`, `right`, `top`, `bottom` or a 3-element unit vector. Omitting it leaves the part facing the viewer. | must |
| FR-2 | `light` gives each part a base tone chosen by `dot(facing, light)`: the most light-facing plane takes the family's `highlight`-ward tone, the least takes `shadow`-ward, and intermediate facings take intermediate steps where the ramp has them. | must |
| FR-3 | Plane shading is applied per part and is independent of `form`: `form` still refines silhouette and boundary pixels within each part, and `flat` still means "shade nothing" for a part without `facing`. | must |
| FR-4 | An unknown `facing` string, a non-unit vector, or a zero vector raises `E_FACING_UNKNOWN` / `E_BAD_PARAM` with a hint naming the legal forms. | must |
| FR-5 | `stroke` draws a polyline given `path: [[x, y], ...]`, with `closed` joining the last point to the first. Fewer than two points raises `E_BAD_PATH`. | must |
| FR-6 | `stroke` removes its own steps: no L-turn double pixels, and no run of equal-length steps that reads as a staircase, at any path length or angle. The rule is documented in code and pinned by fixtures on both sides. | must |
| FR-7 | `stroke` accepts `width` of 1 or 2 and `smooth: true`, which rounds the path through its interior points before rasterising; `smooth` must still produce one connected 1 px path with no gaps. | must |
| FR-8 | `stroke` accepts `color` and `part` like any geometry op, including `color: null` to erase along the path. | must |
| FR-9 | `texture` applies one of `stipple`, `hatch`, `grain`, `brick`, `mottle` over the pixels of a target part, using a `color` (or a ramp role) and a `density` in 1–3. | must |
| FR-10 | Every texture mark is at least `profile.minCluster` pixels and is separated from its neighbour by at least that distance, so no legal texture produces a `CLUSTER_THIN` finding at the profile in force. | must |
| FR-11 | `texture` is deterministic and position-stable: the same pattern over the same mask produces identical bytes on every run and on every OS, with no random source. | must |
| FR-12 | An unknown pattern name raises `E_PATTERN_UNKNOWN`; `density` outside 1–3 raises `E_BAD_PARAM`; a texture over an empty part is a no-op with `W_CLEANUP_NOOP`. | must |
| FR-13 | Lint must accept legal texture: `DITHER_NOISE` and `CLUSTER_THIN` must not fire on marks the `texture` pass produced, while still firing on `dither_fill` below the profile floor. | must |
| FR-14 | The debug sheet shows plane boundaries per part (a labelled edge where two facings meet) and makes texture mark spacing legible at the profile's zoom. | should |
| FR-15 | A recipe using `facing`, `stroke` or `texture` continues to round-trip through the canonical writer, and a recipe using none of them renders byte-identically to its pre-track bytes. | must |
| FR-16 | The seven assets are re-authored using the new primitives where they address the failing criterion, with their digests re-baselined and their design notes recording what changed. | must |
| FR-17 | The rubric is re-run on the same seven assets with two passes each, and the measured mean reaches at least 4.0 with no criterion below 3. | must |

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | Determinism is unchanged: identical recipes produce byte-identical PNGs across the CI matrix, and no new source of entropy enters the engine. |
| NFR-2 | Still exactly one runtime dependency. Path smoothing, pattern generation and any maths are hand-written. |
| NFR-3 | Coverage stays at or above 80% statements and branches over `src/core`, `src/lint` and the new pure modules. |
| NFR-4 | Responses stay bounded at 256×256: no unbounded coordinate lists, and a texture report states counts rather than enumerating every pixel. |
| NFR-5 | No network calls, no telemetry; the scoring script remains the only networked file and is imported by nothing. |
| NFR-6 | Node 24, ESM, strict TypeScript; no new build step. |
| NFR-7 | A 256×256 canvas with 2,000 ops, a full `light` pass and a `texture` pass renders in ≤500 ms median of five after warm-up. |

## Acceptance Criteria

| ID | Criterion | Verifies |
|---|---|---|
| AC-1 | A part with `facing: "right"` under a top-left light takes a darker base tone than the same part with no `facing`, on the same recipe. | FR-1, FR-2 |
| AC-2 | Two parts meeting at a plane boundary show distinct tones for the same material, where before they were identical. | FR-2 |
| AC-3 | `form: "flat"` with `facing` still plane-shades; `form: "flat"` without `facing` still shades nothing. | FR-3 |
| AC-4 | An unknown facing string exits non-zero with `E_FACING_UNKNOWN` and a hint listing the legal names. | FR-4 |
| AC-5 | A 256 px diagonal drawn with `stroke` contains no repeating 1-2-1-2 step pattern, while the same path drawn with `line` does — asserted as a byte difference, not a description. | FR-5, FR-6 |
| AC-6 | A closed `stroke` on a 64 px square seam joins with no missing pixel at the start point. | FR-5 |
| AC-7 | `stroke` with `smooth: true` over a right angle produces one connected path with no diagonal gap. | FR-7 |
| AC-8 | `stroke` with `color: null` erases along its path and leaves ownership cleared. | FR-8 |
| AC-9 | `texture` with each of the five patterns on the same part produces five distinct renders, all with zero `CLUSTER_THIN` findings at `large`. | FR-9, FR-10 |
| AC-10 | The same texture, rendered twice, is byte-identical; and rendered on an 8 px and a 256 px canvas at the same `density`, marks grow with the profile rather than staying fixed. | FR-11, FR-10 |
| AC-11 | `dither_fill` below the profile floor still raises `CLUSTER_THIN`, proving the rule was not weakened to make texture pass. | FR-13 |
| AC-12 | A pre-track recipe renders byte-identically, and a recipe using all three new primitives round-trips through the canonical writer unchanged. | FR-15 |
| AC-13 | `px diff` between a pre-primitive and post-primitive render of one re-authored asset reports a bounded changed region, not a whole-canvas rewrite. | FR-16 |
| AC-14 | The re-authored seven assets score a mean of at least 4.0 with no criterion below 3, across two passes each on the same rubric. `scores.json` records both passes with rationales and its verdict is recomputed by the integrity test rather than trusted. **This criterion can fail the track.** | FR-17 |
| AC-15 | A 256×256 canvas with 2,000 ops plus a `light` and a `texture` pass renders in ≤500 ms median of five after warm-up. | NFR-7 |
| AC-16 | Every new module is included in the coverage numerator and the gate is unchanged at 80%. | NFR-3 |

## Edge Cases

- `facing` on a part with no `light` op: no effect, no warning — facing is a property the light pass reads.
- Two parts with the same `facing` and the same material render identically; the primitive gives form between planes, not within one.
- `stroke` path with two identical consecutive points: deduplicated, and a path reduced below two points raises `E_BAD_PATH`.
- `stroke` path entirely outside the canvas: clipped with one `W_OUT_OF_BOUNDS`, no error.
- `stroke` width 2 on a 1 px-wide target: the width is honoured and the overhang clipped, warning once.
- `smooth: true` on a path with only two points: no smoothing possible, draws the straight segment without error.
- `texture` over a part smaller than one mark: no-op with `W_CLEANUP_NOOP`, not an error.
- `texture` on a part whose material lacks the requested role: `E_NO_RAMP` with the existing hint machinery, not a silent skip.
- `texture` and `dither_fill` over the same pixels: `DITHER_NOISE` may fire, because a 2 px lattice under the floor is still noise regardless of what else was painted there.
- `facing` given as a vector with length 0: `E_BAD_PARAM` naming the zero vector.
- Re-authored asset that scores lower than its previous version: recorded, not reverted silently; the design note must say what regressed.

## Dependencies

- **Tracks:** `20261113-static-art-quality` — merged (`pr_state: merged`, merge commit `6dce02c` is an ancestor of the base). Satisfied.
- **External:** none. The scoring script is human-run and outside the build.

## Open Questions & Assumptions

- **Assumption:** three near-identical failures across assets means the primitive, not the authoring effort, so closing the primitives moves the score. **This assumption is load-bearing and unproven.** AC-14 makes it a hard criterion, so if the re-scored mean stays below 4.0 the track fails and records which criterion held it back — the bar is not lowered, and no pass is chosen over a failing one. That risk is accepted deliberately at planning time rather than discovered at the end.
- **Note on instrument noise:** the same asset was judged 2.67 and 4.00 by two pass styles on the same build, up to 1.33 apart on an asset mean, while the gap to close is 0.21. Two passes per asset and a fourteen-pass mean are the mitigation, not a guarantee; a borderline result should be read as "indistinguishable from the bar" and reported that way rather than as a clean pass.
- **Assumption:** `minCluster` and the texture spacing are the same number. If a pattern needs a different spacing than the cluster floor, the profile gains a `textureSpacing` field rather than the pattern hard-coding one.
- **Assumption:** the scoring instrument's noise (observed up to 1.33 on an asset mean) is tolerable because the target is a mean over fourteen passes, and the failure is 0.21 below the bar rather than 0.02.
- **Resolved during definition:** plane shading is per-part `facing`, not inferred normals or sub-regions — it reuses the concept the author already has and stays deterministic. The stroke is a path op, not a curve primitive or a revived corner flag. Texture is a named-pattern library, not seeded noise, because the engine has no entropy source and should not gain one.

## References

- `conductor/archive/20261113-static-art-quality/verification/phase-7-scoring.md` — the diagnosis and the measured result.
- `conductor/archive/20261113-static-art-quality/verification/integrated.md` — what the previous track shipped and where it stopped.
- `test/art/scores.json` — the fourteen recorded passes.
- `docs/rubric.md` — the six criteria, anchors, method and record shape.
- `docs/art-profiles.md` — profile boundaries and thresholds.

## Amendments

- **2026-11-13 — scoring path for FR-17 and AC-14.** The model instrument needed
  `PX_RUBRIC_API_KEY`, which was not configured, so eight of the fourteen passes were
  produced by the implementing agent under the `agent` path documented in
  `docs/rubric.md` (owner-approved), each labelled `scorer: "agent"` with
  `self_review: true`. The verdict therefore records `basis: "mixed"` and a caveat naming
  the self-scored assets, and it measures 3.90, not 4.0. Requirement IDs are unchanged and
  the bar was not lowered; an independent record still needs a scoring run with the key.
  A follow-up track owns the art work that AC-14 exposes.
