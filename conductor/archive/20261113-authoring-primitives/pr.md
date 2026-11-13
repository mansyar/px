## Summary

Adds three authoring primitives to `px` — per-part `facing` for plane shading, a `stroke`
path that cleans its own steps, and a cluster-aware `texture` pass — plus the debug-sheet
feedback that makes plane boundaries and texture spacing legible, and a compatibility proof
that older recipes are untouched. Re-authors four of the seven art assets on the new surface.

**The track's headline criterion, AC-14, is not met: the seven assets measure a mean of 3.90
against a 4.0 bar** (no criterion below 3). The measurement is recorded as `fail`, the owner
has overridden the blocking finding for this merge, and the remaining art work is handed to a
follow-up track. Read the review before merging if the art bar matters to you more than the
primitives do.

## Track

- **ID:** `20261113-authoring-primitives`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261113-authoring-primitives/spec.md`](conductor/archive/20261113-authoring-primitives/spec.md)
- **Plan:** [`conductor/archive/20261113-authoring-primitives/plan.md`](conductor/archive/20261113-authoring-primitives/plan.md)
- **Review:** [`conductor/archive/20261113-authoring-primitives/review.md`](conductor/archive/20261113-authoring-primitives/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Facing | per-part plane tone from `dot(facing, light)` | verified | `dbcd353` | plane stage writes a ramp role so later stages stay coherent |
| 2: Stroke | path raster with balanced steps, L-turn cleanup, smoothing | verified | `cab8949` | longest equal step run 2, 0.70 px max deviation on a 256 px 2:1 diagonal |
| 3: Texture | five patterns at or above `minCluster`, gap derived from density | verified | `2c9b7ab` | no lint rule weakened; `dither_fill` still flags below the floor |
| 4: Feedback and compatibility | plane dashes, texture gauge, pre-track digests | verified | `50a8317` | potion + sword/humanoid/chest digests unchanged; all-primitives round trip |
| 5: Re-authoring | humanoid, sword, character, scene on the new surface | verified | `7af131a` | scene gable redrawn as polygon planes + stroke ridge + hatch shingles |
| 6: Re-scoring | fourteen passes, integrity-checked verdict | **failed** | — | mean 3.90 vs 4.0; see AC-14 below |

## Requirements

- [x] `FR-1`–`FR-4` — part `facing`, plane tone from `dot(facing, light)`, independent of `form`, with `E_FACING_UNKNOWN` (`test/facing/`)
- [x] `FR-5`–`FR-8` — `stroke` path, self-cleaning steps, `closed`, `smooth`, `width`, `color: null` erase (`test/stroke/`)
- [x] `FR-9`–`FR-13` — five textures, cluster floor by construction, deterministic, `E_PATTERN_UNKNOWN`, lint untouched (`test/texture/`)
- [x] `FR-14` — sheet shows plane boundaries and a zoom-scale texture gauge (`test/feedback/sheet.test.ts`)
- [x] `FR-15` — pre-track digests byte-identical; all-primitives recipe round-trips (`test/feedback/compat.test.ts`)
- [x] `FR-16` — four assets re-authored, digests re-baselined with reasons in each design note
- [ ] `FR-17` / `AC-14` — **mean 3.90, bar 4.0: not met**
- [x] `NFR-1`–`NFR-7` — determinism, one runtime dependency, coverage gate, bounded reports, no network, Node 24 ESM, 2,000-op budget
- [x] `AC-1`–`AC-13`, `AC-15`, `AC-16` — covered by the suites named in the review's requirements table

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit + integration + benchmarks | `pnpm test` | pass — 88 files / 830 tests | `conductor/archive/20261113-authoring-primitives/verification/integrated.md` |
| coverage | `pnpm vitest run --coverage` | pass — 95.79 / 87.21 / 98.33 / 95.60, gate 80 | same |
| lint | `pnpm biome check .` | pass — 172 files | same |
| typecheck + build | `tsc --noEmit`, `tsc -p tsconfig.build.json` | pass | same |
| art | `render --strict` × 7, `test/art` record integrity | pass — no warnings | same |

## Media

The scene's gable after the redraw — polygon planes, a stroke ridge and hatch shingles from
the texture pass (`7af131a`):

![Scene gable redrawn](https://github.com/user-attachments/assets/6d99f14e-046e-4499-840c-57839b8b5335)

The humanoid after its re-authoring — 2×2 camo on the shadow side and `bevel` form (`9d7509e`):

![Humanoid re-authored](https://github.com/user-attachments/assets/8ba5ac2e-b341-4502-814c-7dc2cf442c7a)

## Review

- **Verdict:** `PASS WITH FINDINGS` — owner override of F1 (AC-14), recorded in `review.md`
- **Rounds:** 1
- **Fixed:** 3 findings (F2 provenance summary, F3 rubric record shape, F4 spec amendment)
- **Accepted/deferred:** F1 overridden for merge; F5–F7 deferred as debt

## Deviations and risks

- **AC-14 is unmet.** Eight of fourteen scoring passes are agent self-reviews
  (`basis: "mixed"`), because no rubric credential was configured; the record says so and an
  independent re-score still needs `PX_RUBRIC_API_KEY`. Risk: the 3.90 is a weaker
  measurement than an independent one, and it is 0.10 short either way.
- **Phase 4 changed files outside its `Touches`** (`src/core/parts.ts`, `src/core/ops/*`,
  `vitest.config.ts`); every change is additive and recorded in `verification/phase-4.md`.
- **`VALUE_COLLISION` blocks two adjacent same-material parts on different planes**, so the
  scene's gable is one part with a tone split rather than two `facing` planes. Recorded as
  out-of-scope engine work in the review.
- Only three primitives' worth of art changed; potion, chest and prop are untouched on purpose.

## Follow-ups

None filed (`review.issues.auto_create` is false). Proposed, tracked in `review.md` Debt:

- `[conductor] high: raise the seven-asset mean to 4.0` — scene wall on geometry, character
  dither → 2×2 shading, even ramp steps
- `[conductor] medium: allow adjacent same-material parts on different planes` (engine)
- `[conductor] low: tracker counts, probe artifacts, Phase 4 Touches note`

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>
```

No migration, no data, no feature flag: recipes are additive, and every changed asset digest
is recorded with its reason. Reverting the merge restores the previous art and removes the
three ops; older recipes are unaffected either way.

