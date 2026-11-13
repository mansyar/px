# Phase 6 — Re-scoring: verification

**Track:** 20261113-authoring-primitives · **Branch:** feat/20261113-authoring-primitives
**Phase base:** `7af131a` · **Head at verification:** `7af131a`
**Commands:** `pnpm verify` (exit 0), `pnpm vitest run --coverage` (exit 0)
**Result:** **failed** — AC-14 is not met.

## Scoring

Fourteen passes exist, two per asset: eight agent self-reviews of the re-authored assets
(humanoid, sword, character, scene) and six vision-model scores of the art that did not
change (potion, chest, prop). Every pass carries `scorer`, a rationale per criterion and an
integer 1–5; `test/art/rubric.test.ts` enforces the labels and recomputes the verdict from
the numbers.

| Measure | Value | Bar | Result |
| --- | --- | --- | --- |
| Mean of all recorded scores | **3.90** | ≥ 4.0 | **Fail** |
| Criteria below the floor | none | ≥ 3 | Pass |
| Passes per asset | 2 each, all with rationales | exactly 2 | Pass |
| Self-review labelling | `basis: "mixed"` + caveat naming the four assets | required when any pass is agent-scored | Pass |

The gap to the bar is 0.10 of a point, and it is spread rather than concentrated: no asset
is below the floor and no single criterion is failing. The lowest scores that remain are
`cluster_discipline` 3 and `palette_craft` 3 on the scene, `edge_language` 3 and
`palette_craft` 3 on the sword, and `edge_language` 3 with `cluster_discipline` 3 on the
character. Closing it needs the masonry and apron noise redrawn and the ramps re-stepped —
real authoring work, not a rubric adjustment.

The bar was not lowered and the record was not softened. `scores.json`'s verdict is
recomputed by the test suite, so the failure cannot drift into a pass.

## P6.T2 — budget and coverage

| Check | Result |
| --- | --- |
| 256×256, 2,000 ops, parts and a full light pass under 500 ms median of five (`test/benchmarks/performance.test.ts`) | Pass — inside the suite's measured budget |
| Coverage gate over `src/core`, `src/lint`, `src/meta`, `src/palettes` | Pass — 95.79 / 87.21 / 98.33 / 95.60 against 80 |
| `pnpm verify` | exit 0 — 88 files / 830 tests |

## Why this phase stops the track

AC-14 is the track's headline criterion: seven assets at a mean of 4.0 with nothing below
3. It is not met. Per the workflow, a failed phase does not proceed to integrated review,
doc sync or a PR, and the track is not complete. The honest state is a track that delivered
its two primitives and three-quarters of the re-authoring, verified in Phases 1–5, with a
measured art bar still 0.10 short.

## Deviations

- Eight of the fourteen passes are agent self-review; the record says so in `basis` and
  `caveat`. A fully independent record still needs `PX_RUBRIC_API_KEY`.
