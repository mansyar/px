# Phase 6 scoring evidence — authoritative design intent re-score (AC-14)

Track: `20261117-authoritative-design-intent`
Branch: `feat/20261117-authoritative-design-intent`
Date: 2026-11-17
Instrument: `agent-vision` model called by the primary, two independent passes per asset
Record: `test/art/scores.json` (schema 3)
Prior record: `test/art/scores-before-intent.json` (byte-for-byte copy of the pre-track record)

## Result: AC-14 is NOT met

- Mean **3.39** against the required **≥ 4.0**.
- Eight criterion scores are below the floor of 3, so the floor fails as well.
- `test/art/rubric.test.ts` recomputes the arithmetic and the verdict and passes; the
  record is honest rather than adjusted to clear the bar.
- No score was revised upward, no pass was selected over another, no bar was lowered,
  and the rubric, its anchors and its two-view method are unchanged.

## Per-asset means

| Asset | Pass A (8x) | Pass B (debug) | Mean |
|---|---|---|---|
| potion 16x16 | 3.33 | 4.00 | 3.67 |
| sword 32x32 | 3.00 | 3.33 | 3.17 |
| humanoid 32x32 | 2.67 | 3.33 | 3.00 |
| chest 48x48 | 2.83 | 3.67 | 3.25 |
| character 48x128 | 3.33 | 3.33 | 3.33 |
| prop 64x64 | 3.83 | 3.83 | 3.83 |
| scene 256x256 | 3.17 | 3.83 | 3.50 |

Overall 285 / 14 = 3.39. The pre-track record measured 3.69. The re-authored set is
therefore not measurably better; prop remains the strongest control and humanoid the
weakest.

## Criterion means

| Criterion | Mean |
|---|---|
| silhouette | 4.86 |
| cluster_discipline | 3.86 |
| value_separation | 3.21 |
| palette_craft | 3.21 |
| edge_language | 3.00 |
| lighting | 2.21 |

The three weakest criteria — lighting, value separation and palette craft — are exactly
the ones the intent layer was meant to move. The change in `design` data did not translate
into a measured art improvement on this instrument.

## Method

Pass A scored `.conductor/evidence/art-v2/<asset>.8x.png`, an exact eight-times
nearest-neighbour enlargement of the game-resolution PNG (verified byte-for-byte against
`scripts/upscale.mjs` for all seven assets). Pass B scored `.conductor/evidence/art-v2/<asset>.debug.png`,
the engine's own debug sheet with profile zoom, 1x panel, silhouette and part crops.
The raw 1x PNG was not offered as an artifact: earlier calibration proved a viewer resamples
it before a model sees it, so it measures the resampler rather than the art.

Both passes used the same prompt with the six fixed criteria and their 1/3/5 anchors from
`docs/rubric.md`. Pass B was scored without reference to pass A. Three assets produced a
disagreement greater than one point on a criterion; each is recorded as a `human` tiebreak
in `scores.json`, with a one-sentence reason. Per `docs/rubric.md` a tiebreak is metadata
for a reviewer; it does not replace either pass or change the arithmetic.

## Instrument caveat

The pre-track record was produced by `gemini-3.5-flash-lite` through `scripts/rubric.mjs`;
this record uses the `agent-vision` instrument. The two are not interchangeable. On the
`lighting` anchor in particular this run frequently read flat local colour as score 1 or
2, while the earlier instrument scored similar art 3. `docs/rubric.md` already records that
the same asset can move 1.33 on an asset mean between faithful views, so this run is not
evidence that the art got worse; it is evidence that the gate is not measurable to a 0.21
margin. That limitation is recorded rather than used to discard the run or reroll it.

## Failures below the floor

`potion/A/lighting=1`, `sword/A/lighting=1`, `sword/B/lighting=1`,
`humanoid/A/lighting=1`, `chest/A/value_separation=2`, `chest/A/lighting=1`,
`chest/A/palette_craft=2`, `scene/A/lighting=2`.

## Commands

```
pnpm vitest run test/art/rubric.test.ts
pnpm verify
```

Both exited 0 after the record was written. The record itself is the only place scores
change; no test, build or CI step can alter it.
