# Phase 7 — Rubric Scoring Run

**Track:** 20261113-static-art-quality
**Phase:** 7 (Benchmarks and Rubric) — scoring evidence for AC-20
**Date:** 2026-11-13
**Scored by:** primary agent, two passes per asset through the `agent-vision` tool
**Record:** `test/art/scores.json` · **Integrity check:** `test/art/rubric.test.ts`

## Result: AC-20 is not met

| Metric | Required | Measured |
|---|---|---|
| Mean across 14 passes | ≥ 4.0 | **3.79** |
| Any criterion below 3 | none | **4** (humanoid lighting 2; scene lighting 2, edge_language 2, cluster_discipline 2) |

Per asset (mean of its two passes):

| Asset | Size | Pass A | Pass B | Mean |
|---|---|---|---|---|
| potion | 16×16 | 4.17 | 4.33 | **4.25** |
| sword | 32×32 | 3.50 | 3.50 | **3.50** |
| humanoid | 32×32 | 3.17 | 3.50 | **3.34** |
| chest | 48×48 | 4.33 | 4.00 | **4.17** |
| character | 48×128 | 3.17 | 4.00 | **3.58** |
| prop | 64×64 | 4.33 | 4.33 | **4.33** |
| scene | 256×256 | 2.67 | 4.00 | **3.33** |

Four of seven assets clear 4.0 (potion, chest, prop, and chest's second pass); the four that do not are the four that were revised, which is itself informative: the revision round moved nothing measurable. The bar was **not** lowered, and no passing pass was selected over a failing one — every pass is recorded, including the ones that disagree with each other.

## Method defect found and corrected before scoring

The first run used the **raw 1× PNG** as pass 1. That is wrong, and measurably so: a 16×16 PNG handed to an image model is resampled by the viewer before the model sees it, so pass 1 was scoring the resampler. The model's own rationales said so — "blurry", "heavy compression/low-res artifacting" — while pass 2, reading the debug sheet's 8× panel, scored the same potion 4.33. The rubric's own anchors are defined at 1× *in panel B of the sheet*, not on a bare PNG.

Both passes now read a faithful nearest-neighbour view:

- **Pass A** — `scripts/upscale.mjs` produces a true 8× nearest-neighbour composite on `#808080` (`.conductor/evidence/art/<asset>.8x.png`), every 8×8 block one source pixel.
- **Pass B** — the engine's own debug sheet (8× panel with grid and rulers, 1× panel on `#808080`, silhouette, part crops).

`test/art/rubric.test.ts` enforces this: a non-debug `.png` artifact path must contain `8x`, so the invalid first run cannot creep back into the record.

## Instrument reliability

The spec assumed image-model scores are stable to roughly ±1 and that two passes plus a human tiebreak would settle disagreements. Observed:

- Within an asset, the two passes differ by up to **1.33** on the asset mean (scene: 2.67 vs 4.00) and by up to **3 points** on a single criterion (scene cluster_discipline 2 vs 4).
- Across the whole record the mean spread is **0.31** (3.79 ± about 0.15 if the two passes are treated as independent samples).

The practical consequence: this instrument cannot adjudicate a 0.2 gap against a 4.0 threshold. It can say "potion, chest and prop are clearly above the bar and scene is clearly the weakest", and it says that consistently. It cannot say whether `sword` is 3.9 or 4.1, and it disagreed with itself by 1.33 on the largest asset.

So AC-20 as written is decided — the mean is below 4.0 and four criteria sit below 3, which is unambiguous under either pass — but the track should not pretend the finer distinctions are measured. That is recorded here rather than argued away.

## What the failures are actually about

Every pass, both rounds, on the four weak assets, lands on the same three complaints:

1. **Flat form.** "Symmetric vertical bands", "flat or centered rather than one direction", "roof splits down its centre". The `light` pass shades the silhouette rim and can band a region along the light axis, but a broad front face has no form — the engine has no way to shade an interior plane facing the viewer, which is most of a 32 px torso and a 256 px wall.
2. **Stair-stepped edges.** "Chaotic single-pixel stair-stepping", "pixel stair-stepping is prominent", "detail lines compete with the silhouette". The op surface has `line`, `ellipse`, `polygon` and `mirror`, but no stroke that walks a path and cleans its own steps, and no per-edge pixel-art arc. At 256 px this is the dominant defect.
3. **Texture that cannot read.** "Camo speckling", "stone joints vanish at 1x", "grain invisible". Dithering is available but there is no texture primitive that survives the profile's own `minCluster` floor at large sizes.

Those are authoring-capability gaps, not authoring effort gaps. Another revision round with the same ops would produce the same scores, which is why this run stops here instead of grinding.

## Commands

```
node scripts/upscale.mjs .conductor/evidence/art/<asset>.png
node dist/cli.js render --file test/art/<asset>/<asset>.px.json --out .conductor/evidence/art/<asset>.png --debug --strict
pnpm vitest run test/art/rubric.test.ts
```

Artifacts are gitignored under `.conductor/evidence/art/`; `test/art/scores.json` is the committed record.
