# Phase 3 — Final verification checks

- Track: `20261119-godot-export-validation` — Godot 4 Export Validation
- Phase: 3 — Final verification snapshot and closeout
- Date: 2026-11-19
- Branch: `chore/20261119-godot-export-validation`
- Phase base: `9aea208b5d93cce3b38a5e7850280be9e00a5d6e`
- Covers: FR-7, NFR-2, NFR-6, AC-6, AC-7, AC-8
- Values below are transcribed verbatim from the primary-run final checks at phase-3 base HEAD `9aea208b5d93cce3b38a5e7850280be9e00a5d6e`; the primary re-runs them at acceptance. No value is invented or re-derived by this subagent.

## Result

**verified** — every final check is green. `pnpm verify` exits 0; scoped coverage clears the 80% gate on all four metrics; goldens and rubric report pass; `test/art/scores.json` hash is unchanged; and the code delta contains only Conductor state/verification paths. The Phase 2 decision stands as **PASS** ("Godot export contract verified in real Godot 4.7.2"), carried forward unchanged.

## Final checks table

| # | Command | Runner | Exit | Summary |
| --- | --- | --- | --- | --- |
| F1 | `pnpm verify` | primary at phase-3 base (subagent re-ran: exit 0) | 0 | `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all clean. Typecheck clean; Biome `check .` scanned 223 files with one pre-existing non-failing `lint/style/noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50`; 119 files / 1028 tests pass; build clean. |
| F2 | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | primary | 0 | 116 files / 996 tests; All files statements 95.02% (3969/4177), branches 85.72% (2625/3062), functions 98.33% (530/539), lines 94.82% (3758/3963); gate 80%; benchmarks excluded. |
| F3 | `pnpm vitest run --project goldens` | primary | 0 | 1 file / 2 tests; golden hashes match. |
| F4 | `node scripts/rubric-report.mjs` | primary | 0 | 7 assets / 14 passes; `mean 3.82 · pass · gemini-3.5-flash-lite`. |
| F5 | `Get-FileHash -Algorithm SHA256 test/art/scores.json` | primary | 0 | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` (unchanged). |
| F6 | `git diff --name-only 0ea5c5357985b365e02b860d872e0de5bca93d84..HEAD` | primary | 0 | 9 paths, all Conductor state/verification: `conductor/tracks.md` plus `conductor/tracks/20261119-godot-export-validation/{index.md,metadata.json,plan.md,spec.md,verification/decision.md,verification/godot-validation.md,verification/phase-1.md,verification/phase-2.md}`. No src, test, scripts, score, recipe, golden or product-doc change. |
| F7 | `gh pr list --state open` | primary | 0 | 0 open PRs. |

The single Biome warning in F1 is pre-existing, non-failing, and unrelated to this track; `pnpm verify` still exits 0. The coverage gate is 80% on all four metrics and F2 clears it on every metric. The benchmarks project is deliberately excluded from F2 (per `conductor/workflow.md`); NFR-7 remains enforced uninstrumented by F1.

## Coverage metrics (F2, verbatim)

| Metric | Percent | Covered / total |
| --- | --- | --- |
| Statements | 95.02% | 3969 / 4177 |
| Branches | 85.72% | 2625 / 3062 |
| Functions | 98.33% | 530 / 539 |
| Lines | 94.82% | 3758 / 3963 |

Gate: 80% — satisfied on all four metrics. Scoped to the unit, integration, smoke and goldens projects; benchmarks excluded.

## Hashes (verbatim)

| Artifact | SHA-256 | State |
| --- | --- | --- |
| `test/art/scores.json` | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` | unchanged |

## Phase 2 decision carried forward

- Decision: **PASS** — Godot export contract verified in real Godot 4.7.2; no product change.
- Godot version: `4.7.2.stable.mono.official.ed1daf0bf`; final validation exit `0`; all five assertions `result=PASS`; `GODOT_VALIDATION=PASS`.
- Golden PNG: `8D9074157A61E030355DAA15489ED85FD37A73074087EE77CC45AEEF28F027CB`, unchanged after Godot import; exported metadata deep-equals `buildMetadata`.
- Follow-up: **none**. Source: `verification/decision.md`, `verification/phase-1.md`, `verification/godot-validation.md`.

## Evidence paths

- `conductor/tracks/20261119-godot-export-validation/verification/final-checks.md`
- `conductor/tracks/20261119-godot-export-validation/verification/phase-3.md`
- `conductor/tracks/20261119-godot-export-validation/verification/decision.md`
- `conductor/tracks/20261119-godot-export-validation/verification/godot-validation.md`
- `conductor/tracks/20261119-godot-export-validation/verification/phase-1.md`
- `conductor/tracks/20261119-godot-export-validation/verification/phase-2.md`

## Deviations

None. All final-check values were supplied by the primary and transcribed verbatim; this subagent ran only `pnpm verify` (exit 0). No Godot, `node`, hash, credentialed, network or push command was run by this subagent.

## Notes

- F6 records the scope at phase-3 base HEAD `9aea208b5d93cce3b38a5e7850280be9e00a5d6e` (9 paths, all Conductor state/verification). This phase adds only `verification/final-checks.md` and `verification/phase-3.md`, both within Touches; the primary re-runs the scope check at acceptance.
- F7 records 0 open PRs at phase-3 base; no PR was opened, pushed, merged or rebased by this subagent.
