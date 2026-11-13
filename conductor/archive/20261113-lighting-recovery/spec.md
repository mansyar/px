# Lighting Recovery — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

The 2026-11-13 redraw replaced six assets with geometry-first drawings. Structure
improved sharply — `cluster_discipline` 3.93 → 4.57, `silhouette` 4.64 → 4.86 —
and the independent score fell to **3.69**, because hand-painted three-tone ramps
are flatter than the `light` and `derive` passes they replaced.

The scorer's reasoning, now readable through `pnpm rubric:report`, names the
shortfall in its own words across 40 of 84 judgements at or below 3:

| Cause | Mentions | Criteria it lands in |
| --- | --- | --- |
| Flat or absent directional shading | 12 | `lighting` 12/14 passes ≤ 3 |
| Interior detail edges indistinguishable from the silhouette | 12 | `edge_language` 11/14 |
| Ramps lack hue shift / step unevenly | 10 | `palette_craft` 11/14 |
| Adjacent values merge | 10 | `value_separation` 6/14 |
| Roof "split arbitrarily down the middle" | 3 | `lighting` (scene only) |

None of these is an engine gap: `derive` produces hue-shifted ramps, `light`
produces directional shading, and both merged in PRs #4 and #5. This track is art
re-authoring against measured targets, with the instrument's own complaints as the
work list.

## Problem / Motivation

Three tracks have now tried to close a rubric miss by extending the engine. Two
closed real capability gaps and moved the mean by 0.02 between them. The redraw
demonstrated the opposite error: better geometry with worse shading also nets to
roughly zero. The missing ingredient is not capability but **using the existing
surface well**, and the record finally identifies exactly where.

Two properties of the measurement shape the work:

1. **Noise.** The untouched lantern moved 4.25 → 3.92 between two identical
   scorings. A 0.33 single-asset drift makes per-asset deltas below that
   meaningless, so this track judges criterion means and checks its claims against
   the control.
2. **The floor trips on one judgement.** The previous gate required no single
   criterion below 3 across 84 judgements; a single `lighting 1` on the chest
   vetoed a whole track. The owner has approved measuring the floor on criterion
   means instead.

## Goals & Success Metrics

- **Goal:** every asset reads as lit by one light source, with interior detail
  edges and hue-shifted ramps, without adding an engine feature.
- **Metric:** mean **≥ 4.0** with **no criterion mean below 3.5**, on
  `gemini-3.5-flash-lite`, 14 passes, verdict recomputed by
  `test/art/rubric.test.ts`.
- **Attribution metric:** `lighting` ≥ 3.5, `palette_craft` ≥ 3.6,
  `edge_language` ≥ 3.5, `value_separation` ≥ 3.7.
- **Control metric:** the `prop` digest is unchanged and its score movement is
  reported as the noise for this run.

## Scope

### In Scope

- Hue-shifted derived ramps on the six redrawn assets, geometry unchanged.
- A single-direction lighting pass on the scene roof, replacing the ridge split.
- Directional shading on the chest front face, the humanoid and character torso,
  and the potion liquid.
- One interior detail-edge convention, applied per material across all seven
  assets.
- Adjacent-material luminance steps raised to at least 0.12 where the silhouette
  floor allows.
- 14 fresh independent passes, a recomputed verdict, and the reasoning archived.
- Re-baselined digests with a written reason per changed asset.

### Out of Scope

- The `prop`: it stays byte-identical as the noise control.
- Any engine change — no new op, no option default change, no lint rule change.
- Any lint threshold, coverage gate, or rubric bar change beyond the gate the
  owner approved for this track.
- New assets, new subjects, animation, extra layers, or a browser surface.
- Editing archived tracks, their reviews, or their scores.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | The six redrawn assets use hue-shifted derived ramps (cool shadows, warm highlights) through the existing `derive` palette feature; geometry is unchanged. | must |
| FR-2 | The scene's roof is lit by one direction: a single gradient continues across both planes, with plane orientation expressed as a value offset rather than a hard seam at the ridge. | must |
| FR-3 | The chest's front face carries a directional gradient (lit upper-left, shadowed lower-right) rather than two horizontal lines on a flat fill. | must |
| FR-4 | The humanoid's and character's torso masses carry directional form shading rather than flat fields. | must |
| FR-5 | The potion's liquid shows depth: a bright surface line and at least two steps below it. | must |
| FR-6 | One interior detail-edge convention is applied across all seven assets: a darker line along the underside and right of each raised detail, a lighter one on top, applied per material. | must |
| FR-7 | Adjacent materials are separated by at least 0.12 luminance where the silhouette contrast floor allows it. | must |
| FR-8 | All seven assets are re-scored (two passes each) on `gemini-3.5-flash-lite`, the verdict is recomputed, and the per-criterion reasoning is archived through `scripts/rubric-report.mjs`. | must |
| FR-9 | The `prop` recipe and digest are not modified. | must |
| FR-10 | The track adds no engine feature, changes no lint threshold, and changes no rubric bar beyond the gate approved for this track. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Determinism: identical input produces identical bytes; every digest change is deliberate, versioned and re-baselined with a written reason. |
| NFR-2 | `pnpm verify` passes at every phase acceptance (typecheck, lint, tests, build). |
| NFR-3 | No new runtime or development dependency; the scorer stays in `scripts/` and is never imported by the engine or the suite. |
| NFR-4 | No credential is written to the repository, an argument, a log or a fixture; the scorer reads it by reference through `PX_RUBRIC_CREDENTIALS`. |
| NFR-5 | `scripts/rubric-report.mjs` stays read-only: it reads the record and writes nothing. |
| NFR-6 | The asset test's required parts, materials and anchors keep passing without weakening the test. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `lighting` mean ≥ 3.5 (from 2.79). | FR-2, FR-3, FR-4, FR-5 |
| AC-2 | `palette_craft` mean ≥ 3.6 (from 3.21). | FR-1 |
| AC-3 | `edge_language` mean ≥ 3.5 (from 3.14). | FR-6 |
| AC-4 | `value_separation` mean ≥ 3.7 (from 3.57). | FR-7 |
| AC-5 | Overall mean ≥ 4.0 and no criterion mean below 3.5, recomputed by the record test. | FR-8 |
| AC-6 | No `lighting` reason recorded for the scene contains "split" or "arbitrar". | FR-2 |
| AC-7 | At most two assets' `palette_craft` reasons mention flat or hue-less ramps (down from seven). | FR-1 |
| AC-8 | Every changed asset renders `--strict` clean and its digest is re-baselined with a written reason. | FR-1 … FR-7 |
| AC-9 | `test/art/assets.test.ts` passes 28, `test/art/rubric.test.ts` passes 10, and `pnpm verify` exits 0. | NFR-2, NFR-6 |
| AC-10 | The `prop` digest is byte-identical to the redraw, and its score movement is recorded as this run's noise. | FR-9 |

## Edge Cases

- A palette family with fewer than four tones: `derive` must still step evenly, or
  the family keeps its explicit roles and the reason is recorded.
- An asset whose base tone is forced bright by the 1.5:1 silhouette floor: the
  0.12 adjacency target yields to the floor, and the asset records which pair it
  could not separate.
- The chest's gold lock against its brass bands: the pair may be reached through
  role choice rather than base tone.
- A model reply that is not JSON: the scorer exits non-zero and writes nothing, so
  a failed call cannot leave a partial pass; retry at most four times.
- A criterion that moves less than 0.33: reported as inside noise, never claimed
  as progress.
- The interim probe overwrites two passes in `scores.json`; Phase 4 rewrites all
  fourteen, so a half-probed record is never read as final.

## Dependencies

- **Tracks:** none outstanding. `derive` and `light` merged in PRs #4 and #5;
  `scripts/rubric.mjs` and `scripts/rubric-report.mjs` merged in #6.
- **External:** `gemini-3.5-flash-lite` through
  `PX_RUBRIC_CREDENTIALS=~/.config/opencode/opencode.json`, read by reference.

## Open Questions & Assumptions

- **Decision (owner, 2026-11-13):** the gate for this track is **mean ≥ 4.0 with
  no criterion mean below 3.5**, replacing the single-pass floor. Rationale: 84
  judgements with a measured 0.33 single-asset drift make a one-judgement veto
  statistically fragile. The 4.0 ambition and the 3.5 floor are both explicit;
  this is not a lowered bar, and earlier tracks are not re-judged by it.
- **Decision (owner, 2026-11-13):** art only — no engine work of any kind.
- **Decision (owner, 2026-11-13):** one 4-pass interim probe after lighting, one
  full 14-pass re-score at the end.
- **Decision (owner, 2026-11-13):** the `prop` stays untouched as the control.
- **Decision (owner, 2026-11-13):** on a miss, record the failure and stop art
  iteration rather than continuing inside this track.
- **Assumption:** the interior detail-edge convention is a drawing habit rather
  than an engine feature; it is applied per material in the recipes, and no new op
  is introduced.

## Amendments

- None.

## References

- `test/art/scores.json` — the current record (mean 3.69) and the `why` strings
  this spec's problem statement counts.
- `conductor/archive/20261113-surface-resolution/verification/phase-5.md` — why
  `seam` and `bands` did not move the score.
- `docs/rubric.md` — criteria, anchors, and the two scoring paths.
- `docs/art-profiles.md`, `docs/lint-thresholds.md` — the contrast and cluster
  floors the palette work must satisfy.
