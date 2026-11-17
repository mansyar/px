# Integrated verification — Gate and Instrument Reconciliation

- Track: `20261117-gate-instrument-reconciliation`
- Branch: `chore/20261117-gate-instrument-reconciliation`
- Base: `0fd23f7fda645b0c24f696af988f7901507b49ea`
- Date: 2026-11-17
- Scope: a chore track — settle the quality contract and establish one reproducible measurement. No drawing capability changed.

## Gate results

| Check | Result |
| --- | --- |
| `pnpm verify` | exit 0, 119 files / 1027 tests, typecheck + Biome + build clean (one pre-existing warning at `test/recipe/version-1-2.test.ts:50`) |
| `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | exit 0, 116 files / 995 tests, 94.97% statements / 85.69% branches / 98.33% functions / 94.77% lines |
| `pnpm vitest run test/art/rubric.test.ts` | exit 0, 12 tests |
| `git diff 0fd23f7..HEAD -- test/goldens test/benchmarks test/art` filtered to `.sha256` | empty — 19 digests unchanged (1 hero, 4 v1 benchmarks, 7 v1 art, 7 v2 art) |
| `git diff 0fd23f7..HEAD -- package.json pnpm-lock.yaml` | empty — manifest and lockfile byte-identical, one production dependency |
| Network-capable imports in `src/`, `test/`, CI | none; only `scripts/rubric.mjs` is networked and is imported by nothing |
| `v8/c8/istanbul ignore` comments in `src/` | 0 |
| Coverage thresholds in `vitest.config.ts` | 80 for lines, functions, branches, statements — unchanged |

## Checkpoint table

| Phase | Checkpoint | Result |
| --- | --- | --- |
| Gate Contract and Provenance | `e3ab807` | verified — publishable 3.5/3.0 binding; two prior records frozen |
| Frozen Instrument and Baseline | `6f64349` | verified — one instrument, 14 faithful passes, honest gate failure |
| Verification and No-Regression | pending | verified by this document |

## Cross-phase invariants

- **Gate contract:** publishable mean >= 3.5 and no criterion below 3 is the binding shipping gate; exceptional 4.0 remains documented unreachable and no future criterion fails solely because of it.
- **Instrument:** all 14 passes use `scripts/rubric.mjs` with `gemini-4-hydrogen`; `gemini-3.5-flash-lite` is recorded as fallback but was not used. Three transient 503/429 failures were retried with the same model, not papered over with a mixed instrument.
- **Provenance:** `scores-before-intent.json` (3.69) and `scores-agent-vision.json` (3.39) are byte-identical to their originals; `scores.json` is the new baseline.
- **No engine change:** no render, lint, palette, CLI or MCP code changed; no recipe, PNG or digest changed; no dependency added.
- **Coverage vs performance:** wall-clock NFR-7 is measured uninstrumented by `pnpm verify`; coverage excludes only the benchmarks project, with unchanged thresholds and no new ignore comment.

## Acceptance criteria

AC-1 through AC-12 are satisfied: the binding gate and both provenance records exist; the instrument and views are recorded and enforced by tests; all 14 passes come from one model with a recomputed verdict; digests, dependency manifest, lockfile and network boundary are unchanged; the baseline documents the result honestly; both gates exit 0 without weakening a threshold, exclude or ignore rule.

## Result of the quality gate itself

**FAIL at the publishable tier** — mean **3.25** against 3.5, with 22 criterion scores below 3. This is the finding the track was created to establish, not a failure of the track's own criteria. The prior 3.69 and 3.39 records used different instruments, so the difference is not treated as a measured regression; 3.25 is the new baseline. No score was raised, no failing criterion was removed, and no reroll was performed.

## Known limitations

- Single-instrument baseline is steadier than earlier cross-instrument comparisons (A/B mean absolute delta 0.21, max 1, none over 1) but still samples one vision model on one date.
- `docs/rubric.md` target table keeps 4.0 as an unreachable aspiration; the binding gate is the publishable tier.
- The pre-existing Biome warning in `test/recipe/version-1-2.test.ts:50` is out of scope and non-failing.
