# Phase 5 — Re-authoring and Independent Score

- **Track:** `20261113-surface-resolution` — Surface Resolution
- **Phase:** 5 — Re-authoring and Independent Score
- **Date:** 2026-11-13
- **Branch:** `feat/20261113-surface-resolution`
- **Base:** `7c33905` (Phase 4 accepted)

## Result

**failed — the bar was not met.** Mean **3.71** against 4.0, with one criterion
below 3 (`scene` pass A, `cluster_discipline` 2). Per P5.T3.3 the failure is
recorded and the bar is unchanged.

## What was applied

| Asset | Change |
| --- | --- |
| potion, sword, humanoid, character | `light bands: 3` on the round form; `auto_outline seam` where two parts meet |
| chest, prop | `auto_outline seam` |
| scene | `skip` gable retained; version bumped to 1.3 (bands added then reverted, see below) |

All seven recipes moved to `"1.3"`, all render `--strict` clean, and every digest
was re-baselined with the sha of the committed render. `assets.test.ts` passes 28.

## Score, per asset

| Asset | Mean | Lowest criterion |
| --- | --- | --- |
| prop | **4.25** | lighting 3 |
| sword | **4.00** | lighting 3, edge 3 |
| potion | 3.83 | lighting, edge, palette 3 |
| chest | 3.75 | lighting, palette, edge 3 |
| character | 3.75 | lighting, edge, palette 3 |
| humanoid | 3.33 | five criteria at 3 |
| scene | **3.08** | cluster_discipline **2** |

Overall 3.71. Against the previous track's 3.73 this is a wash — inside the ±1
per-criterion instrument noise the calibration recorded.

## What the new controls did and did not do

- **`bands: 3`** changed pixels on the four assets that use `form: "round"`, and
  sword and prop now pass their own means. It did not lift `lighting` anywhere to
  4: the criterion still reads "some masses lack consistent highlights".
- **`seam`** is applied on five assets. It fired where two parts meet, but the
  instrument's `edge_language` stayed at 3 on every asset that had it; the
  complaint is about interior detail *inside* a part, which a boundary role
  cannot address.
- **Scene lighting was not fixed.** Setting `form: "round"` on the scene raised
  `PILLOW_SHADE` on the wall (shadow dominating all four edges), so it was
  reverted; the scene keeps `bevel` and its `lighting` remains 3 with
  `cluster_discipline` falling to 2 on pass A.

## Honest conclusion

The three engine gaps were real and are now closed, but closing them did not move
the score. The remaining shortfall is not "the engine cannot express a band" — it
is that the art does not use the new controls well, and the scene in particular is
unlit. That is an authoring problem this phase did not solve, and pretending the
engine work was the whole answer would be the wrong lesson to record.

## Follow-up candidates

1. Scene lighting authored with `skip` on the wall plus explicit tones, rather
   than asking `round` to band a 197×110 mass.
2. Humanoid: five criteria at 3 — the narrowest asset, where bands have least
   room.
3. Reconsider the instrument's plain 8x view for 256 px assets: the debug sheet
   scores the same art higher on both tracks.
