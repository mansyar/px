# Phase 1 — Variant Generator: verification

**Date:** 2026-11-13
**Covers:** FR-1, FR-2, AC-1
**Command:** `node scripts/calibrate/variants.mjs`

## Result: verified

Twelve deterministic variants under `.conductor/evidence/calibration/variants/`,
one `low` and one `high` per criterion, each rendered to a 1× PNG, an 8×
nearest-neighbour upscale and a debug sheet. The generator is a committed Node
script with no dependencies, no randomness and no clock reads.

`git status --porcelain test/art` returned no entries: no variant was written into
the recorded assets.

## Mutation audit

| criterion | low variant | audited difference from base |
| --- | --- | --- |
| `silhouette` | solid rounded blob | geometry replaced (op count 5 → 2, parts pruned to body); 840 cells retoned |
| `value_separation` | flat tones, one shared lightness | four palette bases moved to lightness 0.437 with hue kept; 921 cells to a single tone |
| `lighting` | flat tones, no direction | 921 cells to the family base tone |
| `edge_language` | no outline treatment | auto-outline op removed (5 → 4); 239 outline cells retoned to base |
| `cluster_discipline` | confetti | every seventh painted cell flipped to an alternating extreme tone; 130 cells |
| `palette_craft` | grey | four family bases replaced by their luminance; no grid change |

The `high` side is the base recipe for five criteria and the hand-shaded ramp for
`lighting`, so the pair isolates the property under test.

## Judgement checks (visual, at 8×)

- `silhouette/low` reads as an unidentifiable brown slab, which is the anchor-1
  description.
- `value_separation/low` keeps distinct hues but a single lightness: the lid,
  body, bands and lock merge in greyscale.
- `lighting/low` and `lighting/high` differ only in the presence of a directional
  ramp.
- `edge_language/low` keeps the interior tones and loses every outline.
- `cluster_discipline/low` shows isolated single pixels inside the masses.
- `palette_craft/low` is grey through and through.

## Defects found and fixed during the phase

1. The engine rejects a declared part that owns no pixels (`E_EMPTY_PART`), so the
   blob variant now prunes the parts it replaces.
2. The edge variant initially reduced the legend while leaving interior glyphs in
   the grid (`E_UNKNOWN_GLYPH`); it now rewrites only outline tones and keeps the
   ramp.
3. The cluster variant overwrote legends for the same reason; the chest legends
   already define `t0..t4`.
4. The first `value_separation` variant was too legible — per-family flattening
   left the lid, body and lock far apart in luminance. It was replaced by the
   shared-lightness collapse above.

## Notes

- `scripts/` is outside the Biome include list, so the generator is not linted;
  `pnpm typecheck` does not see it either. It is plain ESM with no dependencies.
- Renders use non-strict mode: variants intentionally violate lint contracts (a
  blob has no interior detail, a grey palette has one hue), so `--strict` would
  reject the artifacts the calibration needs.
