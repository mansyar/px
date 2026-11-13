# Surface Fidelity — Review

- **Track:** `20261113-surface-fidelity`
- **Branch:** `feat/20261113-surface-fidelity` → `main`
- **Reviewer:** single-agent review (no separate reviewer subagent available)
- **Round:** 1
- **Verdict:** **changes requested** — five phases verified, phase 6 failed its bar

## Summary

Phases 1–5 verified: independent baseline (3.69), plane-aware value lint,
`E_NO_RAMP` contract, `texture fit: "region"`, hue-shifted ramp derivation, stroke
`corner`/`cap`, and schema 1.2. Phase 6 re-authored the scene gable and wall, re-lit
three assets, and re-scored at **3.73** against 4.0. The bar is unmet and is not
lowered.

## Findings

### High

**H1 — AC-15 not met.** Fourteen independent passes at 3.73; `scene` pass A
records `lighting` 2, so the below-3 floor is also missed. Evidence:
`verification/phase-6.md`, `test/art/scores.json`.

### Medium

**M1 — FR-17 is partially met.** The wall's mortar, rim and column-shadow blits were
replaced by part-clipped texture courses, but the wall silhouette is still a single
ASCII blit. "Rebuilt from geometry — polygon courses" is not what shipped, and
`verification/phase-6.md` says so.

**M2 — two phase tasks were reduced in scope.** P6.T2.1 asked to replace a 1 px
dither; the character had no dither op, so the change became a light-form switch.
P6.T2.2 asked for one outline treatment via `corner`/`cap`; the outline is
`auto_outline` with no authored stroke, so the controls did not apply. Both are
recorded, neither is met as written.

### Low

**L1 — visible scene defects.** A stray pixel right of the well and a brown
rectangle protruding from the wall's left edge are visible in the 8x view. They
are lint-clean (inside the part bounds) but wrong, and were found by looking at the
render rather than by any check.

**L2 — the gable's right plane lost its shingle detail**, because the isolated
plane read as pillow-shaded with it. The plane is now a flat lit surface; the
reason is in `scene.design.md`.

## Checks run

| Check | Result |
| --- | --- |
| `pnpm verify` | exit 0 (typecheck, biome, tests, build) |
| `pnpm vitest run test/art/assets.test.ts` | 28 passed |
| `pnpm vitest run test/art/rubric.test.ts` | 10 passed, verdict recomputed |
| New tests | plane lint 3, `E_NO_RAMP` 4, region fit 3, derivation 5, stroke 3, 1.2 gate 6 |
| Thresholds | untouched — coverage 80, rubric bar 4.0 |

## What is worth keeping

The lint and primitive work is additive and gated: `fit` is omitted by default, the
stroke options default to the pre-track geometry (asserted point-for-point), and
every pre-track digest is unchanged. The digests that were re-baselined carry a
written reason in their design files.

## Required before merge

1. Decide whether a 3.73 track merges with AC-15 open. This review does not assume
   either answer.
2. Either rebuild the wall silhouette from geometry or amend FR-17 to describe what
   shipped.
3. Fix or file L1's two visible defects.

## Merge decision

**Owner decision, 2026-11-13:** merged as-is with **AC-15 recorded as open**. The
engine and lint work is additive and fully tested; the score of 3.73 against 4.0
stays a known, documented gap rather than a merge blocker. M1, M2 and L1 remain
open as debt and are carried in the resolution follow-up where they apply.

## Note on process

Performed by the implementing agent; no independent reviewer subagent is configured
in this workspace. H1 comes from the instrument, not from the author's judgement.
