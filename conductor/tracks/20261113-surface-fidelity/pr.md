## Summary

Closes the three authoring gaps left by `20261113-authoring-primitives` and
re-authors the assets that were failing on them:

- **Plane-aware value lint**: two facing planes of one material no longer collide;
  the comparison uses the tone a plane actually paints.
- **`E_NO_RAMP` contract** pinned by tests for every light form.
- **`texture fit: "region"`**: a part smaller than one lattice period gets one
  legal mark, without clipping.
- **Hue-shifted ramp derivation**: `{ "derive": { "base", "stops" } }` steps
  lightness evenly and rotates hue warm-to-cool.
- **`stroke` `corner` / `cap`** with defaults that reproduce the pre-track bytes.
- **Schema 1.2** gating `fit`, derived palettes and the stroke options.
- **Art**: scene gable split into facing planes plus a ridge, wall masonry replaced
  by texture courses, character/humanoid/sword re-lit with round form bands.

## Score — the bar is not met

Fourteen independent `gemini-3.5-flash-lite` passes: **3.73** against 4.0, with
`scene` pass A `lighting` 2. One asset (`humanoid`) improved its lighting from 2 to
3; the scene did not move.

## Verification

- `pnpm verify` exit 0 (typecheck, biome, tests, build)
- `pnpm vitest run test/art/assets.test.ts` — 28 passed, digests rebaselined with reasons
- `pnpm vitest run test/art/rubric.test.ts` — 10 passed, verdict recomputed

## Review

`review.md` — **changes requested**: H1 (AC-15 unmet), M1 (wall silhouette still
ASCII), M2 (two phase tasks reduced in scope), L1 (two visible scene defects).
Merge decision is left to the owner.

🤖 Generated with [Codebuff](https://codebuff.com)
