# Phase 3 Verification — Full Op Surface

- Track: `20261112-phase-1-static-sprite-engine`
- Phase: 3 — Full Op Surface
- Date: 2026-11-12
- Branch: `feat/20261112-phase-1-static-sprite-engine`
- Base commit: `2036dc5`
- Head commit: `3546fe1`

## Result

**Verified.** FR-6..FR-15, FR-24, AC-5..AC-13, AC-20, and AC-22 are met. Both gates exit 0:
`pnpm verify` and `pnpm vitest run --coverage`. The hero golden hash is unchanged.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Static | `pnpm typecheck` (`tsc --noEmit`) | 0 | Strict TS 7.0.2, no diagnostics |
| Static | `pnpm lint` (`biome check .`) | 0 | 78 files checked, 0 errors |
| Unit + integration + smoke + goldens | `pnpm test` (`vitest run`) | 0 | 27 files, 226 tests |
| Build | `pnpm build` (`tsc -p tsconfig.build.json`) | 0 | `dist/` emitted |
| Gate | `pnpm verify` | 0 | typecheck → lint → test → build |
| Gate | `pnpm vitest run --coverage` | 0 | 226 tests, coverage gate met |

Goldens: `test/goldens/fixtures/hero.sha256` is still
`8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb`, so Phase 3 added no bytes to
the existing rendered PNG.

## Acceptance criteria

| AC | Evidence | Result |
| --- | --- | --- |
| AC-5 — each geometry op produces its expected output | `test/unit/ops.test.ts` (set_pixels, rect, line incl. `removeCorners`), `test/ops/ellipse.test.ts` (outline, `fill`, odd/even diameters, 1×n and 1×1 degenerations, one write per pixel), `test/ops/polygon.test.ts` (square, triangle, adjacent squares sharing an edge with `maxWrites() === 1`, shared vertex) | Pass |
| AC-6 — flood_fill respects 4 vs 8 connectivity; dither patterns exact | `test/ops/flood-fill.test.ts` (wall stops 4-way, diagonal join needs 8-way, transparent region fills, slot-matched fill does not chain, OOB seed warns), `test/ops/dither.test.ts` (checker rows, bayer rows, absolute-coordinate phase across two rects, 8× bayer tiling, clipping) | Pass |
| AC-7 — ascii_blit stamps the legend exactly; uncovered char errors | `test/ops/ascii-blit.test.ts` (slot identity, `.` transparent unless defined, `E_BAD_GRID` row lengths, `E_UNKNOWN_GLYPH` with char and row/column, clipping) | Pass |
| AC-8 — mirror at odd and even pivots; no double write at a seam | `test/ops/mirror.test.ts` (half-pixel `2.5` maps 1→4, integer `3` maps 0→6 with a transparent seam, `maxWrites() === 1` at seam, no re-mirroring, y axis, bad pivot, off-canvas destination warns) | Pass |
| AC-9 — `color: null` clears only the targeted geometry; omitted colour errors | `test/ops/null-color.test.ts` (erase per op across rect/line/ellipse/polygon/dither/flood, transparent no-op, `E_MISSING_COLOR`, null preserved by the canonical writer) | Pass |
| AC-10 — auto_outline inner vs outer differ by exactly the border width | `test/ops/outline.test.ts` (outer ring grows the silhouette by one, 8-way fills ring corners, inner replaces the border without growth, shared vertex writes once, empty target no-op) | Pass |
| AC-11 — auto_shade changes only silhouette-adjacent pixels | `test/ops/shade.test.ts` (interior row untouched, rim roles per `light_dir`, flat family `E_NO_RAMP`, empty layer no-op) | Pass |
| AC-12 — ramp_fill with N bands yields N−1 role transitions along the light vector | `test/ops/ramp-fill.test.ts`: bands 2 and 3 assert exactly `bands − 1` transitions; `bands` outside 2..3 (0, 1, 4, 5, 6) is `E_BANDS_RANGE` with the three-roles hint, so every accepted band count meets the criterion (see Resolved deviations) | Pass |
| AC-13 — a post-pass in layer 2 naming layer 1 leaves layer 1 unchanged | `test/ops/target-layer.test.ts` (source count and rows unchanged, writes in the pass layer, default target is the own layer, same-layer read/write legal, unknown target `E_NO_SUCH_LAYER`) | Pass |
| AC-20 — editing an op by id succeeds after earlier ops are inserted | `test/ops/op-addressing.test.ts` (op shifted from index 1 to 2 by an inserted op, edited by id, `replaced: 2`, ids intact) | Pass |
| AC-22 — `pnpm verify` passes | Command table above; 78 files linted, 226 tests, build clean | Pass |

FR-24 coverage of the same phase: `test/ops/op-addressing.test.ts` also pins `E_DUPLICATE_OP_ID`,
ids surviving `serializeRecipe`, `op_index` returned by both `draw` and `edit`, addressing across
layers, and `E_NO_SUCH_OP` for a missing id and an out-of-range index.

## Coverage

Scope: `src/core/**` + `src/lint/**` (thresholds still 80, no ignore comments).

| Metric | Covered / Total | Percent | Gate |
| --- | --- | --- | --- |
| Statements | 1070 / 1141 | 93.77% | 80 — pass |
| Branches | 668 / 778 | 85.86% | 80 — pass |
| Functions | 169 / 170 | 99.41% | 80 — pass |
| Lines | 1020 / 1091 | 93.49% | 80 — pass |

Per area: `src/core` 97.23% statements / 91.48% branches; `src/core/ops` 95.90% / 88.04%;
`src/core/recipe` 87.63% / 80.19%; `src/lint` 98.41% / 91.66%.

## Task commits

| Task | Commit |
| --- | --- |
| P3.T1 ellipse, polygon | `8dd9d6f` (engine), `8a2e910` (tests) |
| P3.T2 flood_fill, dither_fill | `8dd9d6f`, `fdea019` |
| P3.T3 ascii_blit, mirror | `8dd9d6f`, `0eba89d` |
| P3.T4 null colour | `8dd9d6f`, `f421d11` |
| P3.T5 target_layer | `8dd9d6f`, `bf1e858` |
| P3.T6 auto_outline | `8dd9d6f`, `58a0ee8` |
| P3.T7 auto_shade | `8dd9d6f`, `1c48c54` |
| P3.T8 ramp_fill, E_NO_RAMP | `8dd9d6f`, `f0cf54d`, `3546fe1` |
| P3.T9 replace_slot | `8dd9d6f`, `5492710` |
| P3.T10 ids, edit by id/index, op_index map | `7ff7208`, `12fb8bd` |

## Evidence paths

- `src/core/recipe/types.ts`, `src/core/recipe/normalize.ts`, `src/core/recipe/serialize.ts`,
  `src/core/recipe/validate.ts`, `src/core/recipe/parse.ts`
- `src/core/ops/ellipse.ts`, `polygon.ts`, `fills.ts`, `ascii-blit.ts`, `mirror.ts`, `outline.ts`,
  `shade.ts`, `ramp.ts`, `replace-slot.ts`, `pass.ts`, `index.ts`
- `src/core/compile.ts`, `src/core/palette.ts`, `src/core/errors.ts`
- `src/cli/args.ts`, `src/cli/commands.ts`, `src/cli/main.ts`
- `test/ops/helpers.ts`, `test/ops/ellipse.test.ts`, `test/ops/polygon.test.ts`,
  `test/ops/flood-fill.test.ts`, `test/ops/dither.test.ts`, `test/ops/ascii-blit.test.ts`,
  `test/ops/mirror.test.ts`, `test/ops/null-color.test.ts`, `test/ops/target-layer.test.ts`,
  `test/ops/outline.test.ts`, `test/ops/shade.test.ts`, `test/ops/ramp-fill.test.ts`,
  `test/ops/replace-slot.test.ts`, `test/ops/op-addressing.test.ts`

## Deviations

| File | Reason |
| --- | --- |
| `vitest.config.ts` | Added `test/ops/**/*.test.ts` to the unit project include so the new suite is collected. Pre-approved in the phase brief; no threshold or exclude changed. |
| commit granularity | The ten ops' engine work landed in `8dd9d6f` and each task's tests in its own commit. The op union, parser, canonical writer, validator, and dispatch switch are one shared edit surface; splitting them per op would have required non-compiling intermediate commits. Every task from T1..T10 still has its own `test(ops)` commit. |

### Resolved

| Item | Resolution |
| --- | --- |
| AC-12 vs the pinned "middle slice is base" rule | Restricting the domain, not weakening the criterion: `bands` accepts only 2..3, a new `E_BANDS_RANGE` rejects anything else with a hint explaining that three shading roles cap the transitions at two, and the saturation path was deleted. `3546fe1` carries the fix; AC-12 now holds across the entire accepted domain. |

## Notes

- Pinned decisions hold: every op receives the active layer's slot grid and an immutable snapshot
  of the read source, then writes through the clipped writer, so an op never reads its own output.
- Ellipse is the integer midpoint scan with per-row paired spans, so `fill` and outline agree and a
  pixel is written once. Polygon samples pixel centres at `y + 0.5` on half-open `[min, max)` edges
  (documented on `polygonSpans`); adjacent polygons and shared vertices do not double-paint.
- `color: null` is resolved behind a `'color' in op` presence check at parse time, never a falsy
  test. An omitted colour is `E_MISSING_COLOR`; null is kept distinct through `serializeRecipe`.
- Flood fill matches on resolved slot inside the active layer, not RGBA. Dither patterns are keyed
  to absolute canvas coordinates.
- Mirror computes the whole destination set from the snapshot and writes each destination pixel
  once; a seam pixel is skipped, and a source is never re-mirrored.
- Post-passes read `target_layer` (default own layer) and always write their own layer; reading and
  writing the same layer is legal because the read side is a snapshot.
- `auto_shade` is rim-only: a pixel whose up/left neighbour is transparent takes `highlight`, a
  pixel whose down/right neighbour is transparent takes `shadow`, interior pixels are never
  modified, and a family lacking the role is skipped. Flat families raise `E_NO_RAMP` whose hint
  names `--derive-ramps` (that flag remains Phase 4 work).
- **AC-12 resolved:** the first pass of this phase flagged a tension between the pinned
  "any middle slice is `base`" rule and AC-12 for N ≥ 4, and saturated silently. The primary's
  ruling resolved it by restricting the legal domain instead of weakening the criterion: `bands`
  is 2 or 3, a family's three shading roles cap the transitions at two, and any other count is
  `E_BANDS_RANGE` whose hint states that reason. The saturation path was removed outright, so
  AC-12 holds for every recipe the parser accepts rather than for a subset of band counts.
- `E_BANDS_RANGE` and `E_NO_RAMP` stay distinct: the former is an impossible band count on an
  otherwise valid family, the latter is a family that lacks the shading role the op needs. Tests
  pin both independently.
- `polygonSpans` normalises `Math.ceil(left - 0.5)` with `+ 0` so `-0` never leaks into a span.
- `P3.T8` `E_NO_RAMP` is raised by `auto_shade` and `ramp_fill` only where the role is required;
  `auto_outline` with `selective: true` falls back to `color` when the neighbour family has no
  `outline` role.
- No new dependencies, no threshold lowered, no coverage ignore comment added.
