# Phase 1 — Independent Instrument and Baseline

- **Track:** `20261113-surface-fidelity` — Surface Fidelity
- **Phase:** 1 — Independent Instrument and Baseline
- **Date:** 2026-11-13
- **Branch:** `feat/20261113-surface-fidelity`
- **Base:** `0515f0c` (phase marked in progress)
- **Head:** recorded below in the phase checkpoint

## Result

**verified** — the seven assets carry fourteen independent passes on
`gemini-3.5-flash-lite`, every pass names its instrument, the verdict is
recomputed from them (`basis: "independent"`, mean **3.69**), and the difference
from the archived 3.90 is recorded per asset and per criterion.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit + integration + benchmarks + lint + typecheck + build | `pnpm verify` | 0 | 830 tests, biome clean, both tsc passes |
| art record | `pnpm vitest run test/art` | 0 | 115 tests, including the new instrument-name assertion |
| instrument noise | `node scripts/rubric.mjs --asset potion --pass {A,B} --dry-run` ×2 | 0 | four replies, logged |
| baseline | `node scripts/rubric.mjs --asset <asset> --pass {A,B} --replace` ×14 | 0 (one retry) | fourteen passes recorded |
| calibration | see `.conductor/evidence/calibration.txt` | 0 | per-asset and per-criterion deltas |

Evidence paths: `.conductor/evidence/instrument-noise.log`,
`.conductor/evidence/score-batch-1.log`, `.conductor/evidence/score-batch-2.log`,
`.conductor/evidence/score-character-retry.log`,
`.conductor/evidence/calibration.txt`, `.conductor/evidence/phase1-verify.log`.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | two passes per asset, `scorer: "vision-model"`, each naming its model | `scores.json`; `test/art/rubric.test.ts` asserts the model name | met |
| AC-2 | `basis: "independent"`, recomputed mean, no unlisted failures | verdict recomputed by the record test; `failures` lists both below-floor scores | met |
| AC-3 | calibration note against the archived 3.90 | `.conductor/evidence/calibration.txt` | met |

## Instrument decision

`gemini-3.5-flash-lite`, per the owner's decision, read by reference through
`PX_RUBRIC_CREDENTIALS=~/.config/opencode/opencode.json`. No credential exists in
the repository, an argument or a log.

## Instrument noise (potion, two runs of each view)

| Run | View | silhouette | value | lighting | edge | cluster | palette |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | A (8×) | 5 | 4 | 3 | 3 | 4 | 3 |
| 2 | A (8×) | 5 | 4 | 4 | 3 | 4 | 4 |
| 1 | B (debug) | 5 | 4 | 3 | 4 | 5 | 4 |
| 2 | B (debug) | 5 | 4 | 4 | 3 | 5 | 4 |

Same-view spread is **1 point** on `lighting` and `palette_craft` (A) and on
`lighting` and `edge_language` (B). View-to-view spread on one run is also 1
point. **Consequence:** a one-point move on those criteria is inside the
instrument's noise and must not be read as art progress in Phase 6.

## Calibration against the archived record

| Asset | Archived | Independent | Δ |
| --- | --- | --- | --- |
| potion | 4.25 | 3.83 | −0.42 |
| sword | 3.67 | 4.17 | +0.50 |
| humanoid | 3.50 | 3.08 | −0.42 |
| chest | 4.17 | 3.67 | −0.50 |
| character | 3.58 | 3.75 | +0.17 |
| prop | 4.33 | 4.08 | −0.25 |
| scene | 3.83 | 3.25 | −0.58 |
| **verdict** | **3.90** (mixed) | **3.69** (independent) | **−0.21** |

| Criterion | Archived | Independent | Δ |
| --- | --- | --- | --- |
| silhouette | 4.50 | 4.71 | +0.21 |
| value_separation | 3.71 | 3.86 | +0.14 |
| lighting | 3.57 | 3.07 | −0.50 |
| edge_language | 3.64 | 3.21 | −0.43 |
| cluster_discipline | 4.21 | 3.86 | −0.36 |
| palette_craft | 3.79 | 3.43 | −0.36 |

`flash-lite` is **stricter on lighting, edges, clusters and palette** and
**looser on silhouette and value separation** — not uniformly harsher, which is
why the net −0.21 hides a half-point swing in both directions on individual
assets. The archived 3.90 and this 3.69 measure different instruments on the same
pixels and are not comparable as art quality.

## Below-floor scores

- `humanoid` pass A, `lighting` = 2 (pass B = 3)
- `scene` pass A, `lighting` = 2 (pass B = 3)

Both occur on the plain 8× view and both rise to 3 on the debug sheet, which is
the same view-to-view disagreement measured above. They are recorded as measured.
AC-15 requires no score below 3, so Phase 6's redraw has to clear them; the floor
and the bar are unchanged.

## Deviations

- **One scoring call returned malformed JSON** (`character` pass A: a key missing
  its opening quote). The scorer rejected it and wrote nothing; the retry
  succeeded. No validator was loosened.
- `scripts/rubric.mjs` also gained the `model` field the phase required; that is
  inside `Touches`.

## Notes

- The scorer's `--replace` path was used deliberately: this phase re-scores
  existing passes rather than appending a third.
- `scored_by` and `verdict.note` were updated to describe the independent
  baseline; the verdict numbers themselves are recomputed, never typed.

## Primary verification

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm verify` | 0 | pass |
| `pnpm vitest run test/art` | 0 | 115 tests pass |
