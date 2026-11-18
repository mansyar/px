# Integrated Verification

- **Track:** `20261118-agent-legibility-verification`
- **Date:** 2026-11-18
- **Branch:** `chore/20261118-agent-legibility-verification`
- **Head commit:** `8af7082` (final check run)
- **Result:** `verified`

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static | `pnpm verify` | 0 | typecheck + Biome + 119 files / 1028 tests + build; one pre-existing non-failing `noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50` |
| unit/integration/smoke/goldens | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | 0 | 116 files / 996 tests; statements 95.02%, branches 85.72%, functions 98.33%, lines 94.82% (gate 80%); benchmarks excluded from v8 coverage |
| determinism | `pnpm vitest run --project goldens` | 0 | 1 file / 2 tests; PNG SHA-256 replay matches |
| gate read-only | `node scripts/rubric-report.mjs` | 0 | 7 assets / 14 passes, `mean 3.82 · pass · gemini-3.5-flash-lite`; no write |
| PR state | `gh pr list --state open --json number,url` | 0 | `[]` — no open PR at verification time |
| integrity | `Get-FileHash -Algorithm SHA256 test/art/scores.json` | 0 | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` (unchanged before and after the track) |

## Requirements

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-1 | Docs-only brief with included/excluded inventory | `verification/docs-brief.md`, `.conductor/evidence/agent-legibility/inventory.md` | pass |
| FR-2 | Four MCP-first fresh-run transcripts | `verification/agent-runs.md`, four `transcript.md` files | pass |
| FR-3 | Strict re-render of each fresh artifact with findings | `verification/measurement.md` (potion/sword exit 0; humanoid/chest exit 3 disclosed) | pass |
| FR-4 | Flash-lite silhouette diagnostics, evidence only | `verification/measurement.md` (5 / 4 / 5 / 5) | pass |
| FR-5 | Documentation fix and re-test only if doc-caused | `verification/measurement.md` (SKIP with reason); `verification/agent-legibility-decision.md` | pass |
| FR-6 | Honest final decision | `verification/agent-legibility-decision.md` (PASS with residual strict-gate gaps) | pass |
| FR-7 | CLI parity check | `verification/agent-runs.md`, `.conductor/evidence/agent-legibility/cli-parity/transcript.md` (8 calls) | pass |
| NFR-1 | Docs-only isolation | `verification/docs-brief.md` (explicit exclusions; no source/test/score leakage) | pass |
| NFR-2 | No score/rationale/verdict edits; dry-run, flash-lite only | unchanged scores hash; `--dry-run` scorer invocations in `verification/measurement.md` | pass |
| NFR-3 | No dependencies or engine/tool changes | empty code delta; only Conductor state/verification files changed | pass |
| NFR-4 | `pnpm verify` exit 0 | commands table | pass |
| NFR-5 | Credentialed scoring primary-only, retried with backoff | `verification/measurement.md` (availability retries on sword/humanoid; credential via env, never printed) | pass |
| NFR-6 | Exact commands, paths, digests, transcripts | `verification/*.md`, gitignored `.conductor/evidence/agent-legibility/**` | pass |
| NFR-7 | At most one doc fix and one re-test; no re-roll | zero fixes, zero re-tests recorded in `verification/measurement.md` | pass |
| AC-1 | Brief inventory excludes forbidden sources | `verification/docs-brief.md` | pass |
| AC-2 | Four transcripts ≤12 calls or honest failures | 9 / 11 / 12 / 11 calls; `verification/agent-runs.md` | pass |
| AC-3 | No OOB/ORPHAN or honest failures listed | zero OOB/ORPHAN on all four; strict-gate findings disclosed | pass |
| AC-4 | Four silhouettes ≥4 | 5 / 4 / 5 / 5 | pass |
| AC-5 | Doc fix only if doc-caused; no engine change | SKIP with reason; empty code delta | pass |
| AC-6 | Honest pass/fail decision | `verification/agent-legibility-decision.md` | pass |
| AC-7 | Verify green and empty code delta | commands table + `git diff --name-only 12037ca..HEAD` (Conductor state only) | pass |
| AC-8 | scores.json hash unchanged | `E5CCE080…828D` before and after | pass |

## Gate outcome

- Product legibility metric: all four assets completed by a fresh docs-only agent with 9 / 11 / 12 / 11 MCP calls (all ≤12), zero `OUT_OF_BOUNDS`/`ORPHAN_PIXEL`, and silhouettes 5 / 4 / 5 / 5.
- Overall decision: **LEGIBILITY METRIC VERIFIED — PASS with disclosed residual strict-gate gaps**. Humanoid and chest strict renders exited 3 (`E_LINT_GATE`) on craft findings (contrast, value collision, pillow shade); these are recorded honestly and are not claimed clean.
- Published gate untouched: mean 3.82 `pass`, scores hash unchanged; dry-run silhouette diagnostics are not comparable to published gate scores.

## Deviations

- No `docs/agent-tool-guide.md` was created: strict-gate failures are craft choices within the 12-call budget, and lint thresholds were already provided in `docs/lint-thresholds.md`; no re-test was needed.
- No rationale text is available from the flash-lite `--dry-run` path (`scripts/rubric.mjs:387-394` prints integer scores only); recorded honestly without inventing a rationale.
- CLI parity run intentionally used CLI only (8 calls) as a bounded comparison surface, not as an MCP fallback.

## Evidence

- `verification/docs-brief.md`, `verification/agent-runs.md`, `verification/measurement.md`, `verification/agent-legibility-decision.md`, `verification/phase-1.md`, `verification/phase-2.md`, `verification/phase-3.md`.
- Gitignored binaries and ordered transcripts: `.conductor/evidence/agent-legibility/**`.

## Notes

Track is evidence-only: no engine, CLI, MCP, op, linter, rubric, CI, score, recipe, or dependency change. Terminal checks were re-run at final HEAD `8af7082` and all passed.
