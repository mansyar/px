# Phase 6 — Re-scoring, Budget and Evidence

Track: `20261117-authoritative-design-intent`
Phase: 6 (Re-scoring, Budget and Evidence)
Date: 2026-11-17
Branch: `feat/20261117-authoritative-design-intent`
Base: `b9e0ab1`
Head: `e44516c` (P6.T1 / scoring-inputs commit; this evidence file follows)

## Result

**blocked.** The faithful scoring inputs exist, the performance and coverage
budgets hold and both verification gates exit 0, but AC-14 cannot be decided:
the score record requires a vision model with network access, which this
executor does not have. No score or rationale has been invented and
`test/art/scores.json` is byte-identical to its pre-track state. The primary
must complete the scoring, recompute the verdict and update the phase status.

## Commands and results

| Command | Exit | Notes |
|---|---|---|
| `pnpm vitest run --project benchmarks` | 0 | 3 files / 32 tests pass |
| `pnpm vitest run --project benchmarks --reporter=verbose` | 0 | medians printed (below) |
| `pnpm vitest run --project unit test/art/scoring-artifacts.test.ts` | 0 | 1 generator test passes; 21 artifacts + summary written |
| `pnpm verify` | 0 | typecheck clean; biome 1 **pre-existing** warning at `test/recipe/version-1-2.test.ts:50` (`lint/style/noNonNullAssertion`); 117 files / 1012 tests pass; build clean |
| `pnpm vitest run --coverage` | 0 | all four metrics above 80 (table below) |
| `git diff --no-index -- test/art/scores.json test/art/scores-before-intent.json` | 0 | no output — byte-identical |

Denied by this executor's shell permission layer (reported, not worked around
through the shell): `node dist/cli.js render …`, `node scripts/upscale.mjs …`,
`pnpm list --prod --depth 0`, `pnpm tsx --version`, `pnpm dev render …`.
All returned `permission.rejected: Permission denied: shell`.

## P6.T1 — scoring inputs (delivered; scoring blocked)

- All seven v2 render strict, exit code 0, zero error/warning findings
  (advisory `info` counts: potion 4, sword 3, humanoid 31, chest 17,
  character 58, prop 21, scene 65). Rendered digests equal the committed
  `test/art/v2/<asset>/<asset>.sha256` for every asset.
- Artifact pairs and exact commands: `verification/scoring-inputs.md`.
- Machine-readable results: `.conductor/evidence/art-v2/generation-summary.json`.
- `test/art/scores-before-intent.json` is the immutable pre-track record,
  copied byte-for-byte from `test/art/scores.json`.

No schema-3 record was written, no pass means or criterion means were
computed, and no verdict was recomputed. Those are the primary's scoring step.

## P6.T2 — performance (measured)

Benchmark: 256×256, 2,000 deterministic LCG ops across matte/metal/gem/cloth
parts, one `light` op (`form: "round"`, `ao: true`, `cast` set), one
`harmonize` op under a declared design; warm up once, five timed runs with
`performance.now()`, assert and print the median.

| Benchmark | Runs (ms) | Median | Budget | Result |
|---|---|---|---|---|
| 2,000 ops bare | 25.2, 26.6, 28.1, 28.4, 29.5 | 28.1 ms | < 250 ms | pass |
| 2,000 ops + light + harmonize | 110.2, 113.0, 121.4, 122.3, 152.9 | 121.4 ms | < 500 ms | pass |

`fileParallelism: false` remains on the benchmarks project; no mock clock,
no budget change, no op-count reduction.

## P6.T2 — coverage and dependency budget

| Metric | Value | Gate |
|---|---|---|
| Statements | 94.88% (3693/3892) | 80 — pass |
| Branches | 85.70% (2458/2868) | 80 — pass |
| Functions | 98.34% (474/482) | 80 — pass |
| Lines | 94.66% (3493/3690) | 80 — pass |

`harmonize.ts`: 97.82% statements, 80.76% branches. No change to
`vitest.config.ts`: no new pure source module was added, the 80% threshold is
unchanged, no exclude was widened and no `v8 ignore` comment was added.
Production dependency count is exactly one (`@modelcontextprotocol/sdk@1.32.2`
in `package.json`); no runtime dependency was added.

## Golden hashes and untouched contracts

- Hero digest `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` —
  untouched; golden tests pass in `pnpm verify`.
- Four 1.0 benchmark digests — untouched; `benchmarks.test.ts` passes.
- Seven original v1 art digests (`ORIGINAL_DIGESTS` in `assets-v2.test.ts`) —
  untouched; contract test passes.
- No `.sha256` file outside `test/art/v2/` was modified (working tree clean
  of tracked changes before the two phase commits).
- `test/art/assets-v2.test.ts`, `test/art/rubric.test.ts`, `docs/rubric.md`,
  `scripts/rubric.mjs`, `scripts/upscale.mjs` and `scripts/calibrate.mjs` were
  not edited.

## AC table

| ID | Status | Basis |
|---|---|---|
| AC-13 | blocked | Same instrument unchanged; inputs and prior-record copy delivered, but the new schema-3 record needs vision scoring |
| AC-14 | blocked | Measured mean ≥ 4.0 with no criterion below 3 cannot be evaluated without scores — hard criterion, never lowered |
| AC-16 | verified | Light + harmonize median 121.4 ms < 500 ms |
| AC-17 | verified | Coverage ≥ 80% on all four metrics; one production dependency |
| FR-19 / FR-20 | blocked | Re-score and honest verdict require the score record |
| NFR-3 | verified | Coverage gate unchanged and green |
| NFR-6 | verified | No new runtime dependency |
| NFR-7 | verified | 256×256, 2,000 ops, full light + harmonize under 500 ms median of five |

AC-14 **expected** (verbatim from the brief): "primary scores the seven v2
assets with two faithful nearest-neighbour passes and writes the schema-3
record; verdict recomputed by `test/art/rubric.test.ts`".

## Deviations

- `test/art/scoring-artifacts.test.ts` (within `Touches`) was added as a
  self-contained, in-process generator because the direct `node` render and
  upscale commands are shell-denied in this executor. It drives the real
  `runCli` renderer and the same deterministic nearest-neighbour / filter-0 /
  deflate-level-9 encoder; an in-test assertion proves its bytes equal
  `encodePng`'s. Full disclosure is in `verification/scoring-inputs.md`.
- The brief's literal render command from the repository root cannot resolve
  `@project`: the CLI reads the style from the recipe's own directory and no
  `px.style.json` exists under `test/art/v2/`. The generator follows the
  established contract-test pattern of copying the root style next to the
  recipe in a temporary workspace.

## Notes for the primary

Score the seven v2 assets with two faithful nearest-neighbour passes and write
the schema-3 record; the verdict is then recomputed by `test/art/rubric.test.ts`.
Do not change anchors, views, thresholds, budgets or artifacts to make AC-14
pass. If the primary re-runs the literal `node` commands, apply the style
workspace preparation noted above. Both gates exit 0 on the final tree
(117 files / 1012 tests).

## Primary scoring and verification

The primary scored all seven v2 assets with two faithful passes: pass A on the
exact 8x nearest-neighbour upscale, pass B on the engine debug sheet. All seven
8x artifacts were re-derived with `node scripts/upscale.mjs` and matched the
generated bytes exactly, so the pass-A inputs are genuine nearest-neighbour
views. The record is `test/art/scores.json`; the pre-track record was already
preserved byte-for-byte in `test/art/scores-before-intent.json`.

**AC-14 is not met.** Mean 3.39 against the 4.0 bar with eight scores below the
floor of 3. The per-asset and per-criterion tables, the three human tiebreaks
and the instrument caveat are in `verification/phase-6-scoring.md`. No rubric,
anchor, view, bar or score was changed to make the gate pass; the score record
was rewritten once with the measured scores and never rerolled.

`pnpm vitest run test/art/rubric.test.ts` passed 10/10, independently checking
the record's completeness, arithmetic, verdict, basis and failure list.
`pnpm verify` passed after the record was written: 117 files, 1012 tests,
typecheck, Biome and build all clean (the single known out-of-Touches warning
at `test/recipe/version-1-2.test.ts:50` remains). Coverage stays 94.88%
statements / 85.70% branches. No digest file outside `test/art/v2/` changed,
the instrument files and `scores-before-intent.json` are untouched, and the
phase is recorded as delivered with AC-14 failed rather than rewritten to pass.
