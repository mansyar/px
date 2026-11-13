# Phase 1 — Band Count and Placement

- **Track:** `20261113-surface-resolution` — Surface Resolution
- **Phase:** 1 — Band Count and Placement
- **Date:** 2026-11-13
- **Branch:** `feat/20261113-surface-resolution`
- **Base:** `66c4acc` (track scaffold)

## Result

**verified** — `light` takes `bands: 2|3|4` and `band_scale: "thickness" | "uniform"`, and omitting both reproduces the pre-track bytes.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit | `pnpm vitest run test/ops/light-bands.test.ts` | 0 | 6 tests |
| full verify | `pnpm verify` | 0 | typecheck, biome, tests, build |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | 40×8 mass with `bands: 3` shows three interior bands; absent equals today | `light-bands.test.ts`: three distinct slots; flattened arrays identical between absent and `bands: 3` | met |
| AC-2 | masses of different thickness honor the count with derived widths | 40×8 gets three bands; a thin mass degrades instead of erroring; `uniform` differs from `thickness` on a 10-wide mass | met |
| AC-4 (partial) | `band_scale` without `bands` is rejected | `E_BAD_PARAM` naming `band_scale` | met |

## What changed

- `LightOp.bands` / `LightOp.bandScale` and `OP_PARAM_ORDER.light` entries; normalization accepts integers 2–4 and the two scale names, refuses anything else with `E_BAD_PARAM`.
- `roundBands` reads `options.bands ?? 3` and `bandScale`. `thickness` keeps the historical formula, so the default path is unchanged; `uniform` uses a fixed pixel width `floor(occupiedCount / bands)`, which is why a 17-rank mass bands at 5/10 rather than 6/12.

## Deviation recorded

`bandRole` only knows three roles (`highlight`, `base`, `shadow`), so **`bands: 4` currently paints the two middle bands in the same `base` slot** — three visible tones, not four. The test pins this rather than hiding it. Phase 4's tone-valued ramp roles are what make a fourth tone addressable, and AC-1 asks for three, so the phase claim is honest for 3 bands and explicit about 4.

## Not done in this phase

- Schema gating: `bands` is accepted under any version until Phase 4 adds `"1.3"`.
- Part selection (`skip` / `parts`) is Phase 2.
