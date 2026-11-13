# Phase 1 — Derived Ramps

- **Track:** 20261113-lighting-recovery
- **Phase:** 1 — Derived Ramps
- **Date:** 2026-11-13
- **Branch:** feat/20261113-lighting-recovery
- **Base:** 6e6fc63
- **Head:** 40fac77
- **Result:** verified

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static | `pnpm exec tsx src/cli.ts render --file test/art/<asset>/<asset>.px.json --out .conductor/evidence/art/<asset>.png --strict` (six assets) | 0 | no error or warning finding on any asset |
| unit | `pnpm vitest run test/art/assets.test.ts` | 0 | 28 passed |
| full | `pnpm verify` | 0 | typecheck, lint, 858 tests, build |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-2 | `palette_craft` mean ≥ 3.6 | scoring is Phase 4 (FR-8); not measured here | pending |
| AC-7 | at most two assets' palette reasons mention flat ramps | scoring is Phase 4 | pending |
| AC-8 | every changed asset renders `--strict` clean with a re-baselined digest and reason | six strict renders exit 0; six `.sha256` rewritten; `## Derived ramps` in every design note | satisfied |
| AC-9 | 28 asset tests, 10 rubric tests, `pnpm verify` exit 0 | 28 passed; `pnpm verify` 0 | satisfied |
| AC-10 | prop digest unchanged | `git diff --name-only test/art/prop` → 0 files | satisfied |

## What changed

- Six recipes: every family except `ink` is now
  `{"derive": {"base": ..., "stops": 5}}`; the element list is gone from the
  recipe, so the ramp is one colour plus the engine's hue-shifted expansion.
- Legends address derived tones: `highlight` → `t0`, `base` → `t2`, `shadow` →
  `t3`, `outline` → `t4`. The painted shadow deliberately sits one step above the
  outline tone: giving both the darkest tone tripped `PILLOW_SHADE` on `brew`
  (shadow dominant on three sides).
- Bases fitted with `.conductor/redraw/derive_solve.py` against adjacency rebuilt
  from the compiled canvas (`.conductor/redraw/adjacency.ts`). The redraw-time
  snapshot was stale — it listed 9 humanoid pairs where the current geometry has
  13 — so fitting to it left collisions the lint then rejected.
- Minimum adjacent gap after fitting: potion 0.570, sword 0.072, humanoid 0.063,
  chest 0.072, character 0.065, scene 0.072.

## Deviations

- **Adjacency snapshot rebuilt.** `.conductor/redraw/adj/*.json` was regenerated
  from the compiled canvas rather than reused; the old file was fitted to a
  different geometry and its 0.06 constraints no longer held. Tooling only, no
  engine or test change.
- **`metadata.progress.tasks_total` corrected from 15 to 17.** The plan contains
  17 top-level tasks (4 + 5 + 4 + 4); the scaffold undercounted. The recount is
  recorded here rather than silently adjusted.
- **`cork` base retuned** in the potion palette: its derived middle tone landed at
  1.99:1 against the backdrop, one hundredth under the 2.00:1 floor for that
  profile.

## Notes

Geometry is byte-identical in every recipe: only `palette` families and legend
slot names changed. The drawn pixels do differ, as they must, and every digest is
re-baselined with the reason above recorded in the asset's own design note.
