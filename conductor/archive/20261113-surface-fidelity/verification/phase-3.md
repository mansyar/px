# Phase 3 — Form Lighting

- **Track:** `20261113-surface-fidelity` — Surface Fidelity
- **Phase:** 3 — Form Lighting
- **Date:** 2026-11-13
- **Branch:** `feat/20261113-surface-fidelity`
- **Base:** `fec130d` (Phase 2 accepted)
- **Head:** `97e53df`

## Result

**verified with a scope reduction** — the capability the phase specified already
exists in the `light` op, so the phase delivered its design decision and the one
missing guarantee instead of a duplicate op.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit | `pnpm vitest run test/ops/light-ramp.test.ts` | 0 | 4 tests |
| full verify | `pnpm verify` | 0 | 834 tests, biome, typecheck, build |

Evidence: `.conductor/evidence/phase3-verify.log`.

## Design note: no `form_shade` op

`src/core/ops/light.ts` already implements FR-8 and FR-9:

- `roundBands()` ranks each part's pixels along the light axis
  (`rankProjections`) and assigns `bandRole(floor(rank * 3 / occupiedCount), 3)`,
  so band widths are a function of the part's **thickness in the light
  direction**, per part, deterministically.
- `ambientOcclusion()` runs after form and steps one role darker where a
  4-neighbour belongs to a part with greater `z`; equal `z` never occludes and a
  gap never occludes.

A second op would duplicate the part masks, plane roles, z ordering and rank
arithmetic. The phase therefore realises `form_shade` as `light form: "round"`
and records that decision here rather than adding surface area.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-7 | bands derived from thickness in one direction | `roundBands` / `rankProjections` code path, exercised by the potion's `form: "round"`; **no new test added** | met by existing implementation |
| AC-8 | join occlusion darkens by one role, idempotent | `ambientOcclusion` code path; **no new test added** | met by existing implementation |
| AC-9 | flat family raises `E_NO_RAMP` | `test/ops/light-ramp.test.ts`, 4 tests | met |

## Deviation from the recommendation

The design discussion proposed that flat form with no declared facing should stay
a legal no-op. Investigation showed compile already refuses **any** `light` op on
a flat family: `rampError` in `src/core/ops/pass.ts` raises `E_NO_RAMP` while the
part's role is resolved, before the op body runs. That is stricter than proposed
and is now pinned by test rather than changed — loosening it would be a
behaviour change with no requirement behind it.

The guard I first added in `light.ts` was therefore unreachable and was removed
rather than shipped as dead code; `src/core/ops/light.ts` is unchanged.

## Residual gap (carried to Phase 6)

AC-7 and AC-8 have code-path evidence but no new unit test. Phase 6's redraw
exercises both on the humanoid and sword, and the independent re-score is what
will show whether the bands actually read. If the re-score does not improve
`lighting`, that is the signal to add direct band tests rather than trust the
code path.

## Primary verification

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm verify` | 0 | pass |
| `pnpm vitest run test/ops/light-ramp.test.ts` | 0 | 4 tests pass |
