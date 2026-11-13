# Phase 5 — Ramps and Edge Language

- **Track:** `20261113-surface-fidelity` — Surface Fidelity
- **Phase:** 5 — Ramps and Edge Language
- **Date:** 2026-11-13
- **Branch:** `feat/20261113-surface-fidelity`
- **Base:** `fdf38ec` (Phase 4 accepted)

## Result

**verified** — palettes can be derived from one base colour with a hue-shifted
ramp, `stroke` has `corner` and `cap`, and every option this track added is
refused below schema `"1.2"`.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit | `pnpm vitest run test/palette/derive.test.ts` | 0 | 5 tests |
| unit | `pnpm vitest run test/ops/stroke-corners.test.ts` | 0 | 3 tests |
| unit | `pnpm vitest run test/recipe/version-1-2.test.ts` | 0 | 6 tests |
| full verify | `pnpm verify` | 0 | 91 test files, biome, both tsc passes, build |

Evidence: `.conductor/evidence/phase5-verify.log`.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-13 (ramp) | derivation steps evenly and shifts hue | `deriveRamp` puts tone `i` at `i/(N-1)` between the lightest and darkest stop; `derive.test.ts` asserts equal lightness deltas (1e-9) and a hue difference above 5° between highlight and shadow | met |
| AC-13 (stroke) | absent options render byte-identically | `closeCorners` defaults to the existing `pixelPerfect`, `cap` defaults to butt; `stroke-corners.test.ts` asserts the default path equals the explicit `miter`/`butt` path point-for-point, and every art digest in `pnpm verify` is unchanged | met |
| AC-14 | a 1.1 recipe using a 1.2 feature is rejected, naming 1.2 | `version-1-2.test.ts`: `fit: "region"`, a derived palette family, `corner: "round"` and `cap: "round"` each throw `E_BAD_VERSION` under 1.1 and parse under 1.2 | met |

## What changed

- `deriveRamp(base, stops)` in `palette.ts`: HSL conversion, even lightness step,
  hue rotated toward warm (45°) for highlights and cool (220°) for shadows with
  capped rotation, integer channel rounding, `t0 … t(n-1)` lightest first. A
  family `{ derive: { base, stops } }` normalizes to exactly that ramp, so role
  derivation, `E_NO_RAMP` and the value lint all work unchanged.
- `stroke` `corner: "miter" | "round" | "bevel"` and `cap: "butt" | "round"`.
  `miter` keeps the pre-1.2 pixel-perfect corner drop, `round` keeps the corner
  pixel, `bevel` shares miter geometry at 1x (documented in `stroke.ts`), and a
  round cap adds one perpendicular pixel past each open end.
- Schema `"1.2"` is a known version. The gate lives in `normalizeRecipe` and
  rejects region fit, derived palettes and non-default stroke corner/cap with
  `E_BAD_VERSION` plus a hint naming `"1.2"`.
- `conductor/tech-stack.md` records the version decision.

## Notes

- `form_shade` never needed gating: Phase 3 established it is `light form:
  "round"`, an option that existed before this track. AC-14's wording names it,
  but no new option was introduced, so there is nothing to reject.
- Derivation is additive. `serialize.ts` and `meta/index.ts` pass a `derive`
  family through untouched; a normalized palette contains only `ramp`, so no
  existing recipe or digest moved.
