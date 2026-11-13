# Phase 2 — Part Selection

- **Track:** `20261113-surface-resolution` — Surface Resolution
- **Phase:** 2 — Part Selection
- **Date:** 2026-11-13
- **Branch:** `feat/20261113-surface-resolution`
- **Base:** `e4e7c3f` (Phase 1 accepted)

## Result

**verified** — `light` takes `parts` or `skip`, they are mutually exclusive, an
undeclared name errors, and the scene's gable can now state its exemption instead
of relying on op ordering.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit | `pnpm vitest run test/ops/light-parts.test.ts` | 0 | 4 tests |
| scene | `render --strict` on the skip variant | 0 | sha identical to the committed scene |
| full verify | `pnpm verify` | 0 | typecheck, biome, tests, build |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-3 | a part in `skip` keeps its tone while neighbours are shaded | `light-parts.test.ts`: the skipped region resolves to a single slot, the painted one to several; `parts` mirrors it | met |
| AC-4 | `parts` and `skip` together are rejected | `E_BAD_PARAM` naming both | met |

## Phase 2's own task: which idiom the scene keeps

The scene's gable painted its planes **after** `light` to keep authored tones.
The same recipe with the roof ops **before** `light` and `skip:
["roof_left", "roof_right", "ridge"]` renders to the **identical digest**
(`eef604f8…`), which means the two idioms are equivalent for this art.

The scene now uses `skip`, because it says *why* in the op rather than in the op
order: the gable keeps its tones because the pass is told to leave it alone. The
digest and every other pixel are unchanged, so nothing is re-baselined.

## What changed

- `LightOp.parts` / `LightOp.skip` with `OP_PARAM_ORDER` entries; a non-empty list
  of strings, deduplicated, one list at a time.
- `applyLight` gains a `shaded(owner)` gate applied to plane shading, bevel, round
  bands, AO, rim and gloss. Cast shadow deliberately ignores selection: it shades
  the surface it lands on and its caster is a separate argument.
- Declared-part validation lives in the version gate pass, so `skip: ["ghost"]`
  fails with the part named and the declared list quoted.

## Not done in this phase

- Schema gating for `parts` / `skip` — Phase 4's `"1.3"`.
