# Integrated verification — Authoring Primitives

**Branch:** `feat/20261113-authoring-primitives` · **Range:** `f0850a2..HEAD`
**Date:** 2026-11-13 · **Result:** all configured layers pass; AC-14 remains unmet by
measurement and is carried by an owner override (see `review.md`).

## Layers

| Layer | Command | Exit | Result | Evidence |
| --- | --- | --- | --- | --- |
| static — typecheck | `pnpm exec tsc --noEmit` (inside `pnpm verify`) | 0 | pass | `.conductor/evidence/int-verify.log` |
| static — lint | `pnpm biome check .` (inside `pnpm verify`) | 0 | pass, 172 files | `.conductor/evidence/int-verify.log` |
| unit + integration + benchmarks | `pnpm test` (inside `pnpm verify`) | 0 | 88 files / 830 tests | `.conductor/evidence/int-verify.log` |
| build | `pnpm exec tsc -p tsconfig.build.json` (inside `pnpm verify`) | 0 | pass | `.conductor/evidence/int-verify.log` |
| coverage | `pnpm vitest run --coverage` | 0 | 95.79 / 87.21 / 98.33 / 95.60, gate 80 | `.conductor/evidence/int-cov.log` |
| determinism — art renders | `render --strict` × 7 assets | 0 each | no warnings, no error or warning findings | `.conductor/evidence/art/*.png` |
| art records | `pnpm vitest run test/art test/feedback` | 0 | 128 tests | run output |

## What the layers show together

- The three primitives and the sheet surface pass through the same gate the rest of the
  engine uses, with the coverage gate untouched and no new runtime dependency.
- Every committed asset renders `--strict` clean, and the record-integrity tests recompute
  the art verdict from the fourteen passes rather than trusting it.
- `pnpm verify` remains fast and safe; coverage is still a separate phase-acceptance step,
  as `workflow.md` configures it.

## Known gaps carried out of integration

- **AC-14:** mean 3.90 against 4.0, no criterion below 3. Measured, recorded, overridden by
  the owner for merge, and handed to a follow-up track.
- Eight of fourteen art passes are agent self-reviews (`basis: "mixed"`); an independent
  record needs a scoring run with `PX_RUBRIC_API_KEY`.
