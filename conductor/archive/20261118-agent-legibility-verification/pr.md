# Summary

Verifies the product's central success metric ΓÇö that a fresh agent with only tool documentation can author the four benchmark sprites within 12 tool calls each ΓÇö using MCP px tools first with a bounded CLI parity check. All four assets met the call budget with zero `OUT_OF_BOUNDS` / `ORPHAN_PIXEL` findings and silhouette diagnostics of 5/4/5/5. The honest decision is **PASS with disclosed residual strict-gate gaps**: humanoid and chest fresh renders exited 3 (`E_LINT_GATE`) on craft findings, which are recorded rather than hidden. This is an evidence-only track: no engine, CLI, MCP, linter, rubric, score or dependency change, and `test/art/scores.json` is byte-identical.

# Track

- [Specification](https://github.com/mansyar/px/blob/main/conductor/archive/20261118-agent-legibility-verification/spec.md)
- [Implementation plan](https://github.com/mansyar/px/blob/main/conductor/archive/20261118-agent-legibility-verification/plan.md)
- [Review](https://github.com/mansyar/px/blob/main/conductor/archive/20261118-agent-legibility-verification/review.md)

# What happened

| Phase | Result | Checkpoint | Evidence |
| --- | --- | --- | --- |
| 1 ΓÇö Docs-only brief and fresh-agent runs | verified | `e0893de` | `verification/docs-brief.md`, `verification/agent-runs.md`, `verification/phase-1.md` |
| 2 ΓÇö Artifact measurement and doc-gap decision | verified | `e507ac8` | `verification/measurement.md`, `verification/phase-2.md` |
| 3 ΓÇö Honest decision | verified | `d67c950` | `verification/agent-legibility-decision.md`, `verification/phase-3.md` |
| R1 ΓÇö Review fix (stale final HEAD) | verified | `f0afe70` | `verification/integrated.md`, `verification/phase-R1.md` |

# Requirements

- [x] FR-1 docs-only brief with included/excluded source inventory
- [x] FR-2 four fresh MCP-first transcripts with call counts
- [x] FR-3 primary strict renders with honest lint findings
- [x] FR-4 flash-lite `--dry-run` silhouette diagnostics in evidence only
- [x] FR-5 bounded documentation fix decision (SKIP justified)
- [x] FR-6 honest final decision with no forced pass
- [x] FR-7 bounded CLI parity check
- [x] NFR-1..NFR-7 (docs-only isolation, score integrity, no engine change, green verify, primary-only credentialed scoring, exact evidence, one-fix maximum)
- [x] AC-1..AC-8, including unchanged `scores.json` hash `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`

# Verification

| Command | Result |
| --- | --- |
| `pnpm verify` | pass ΓÇö 119 files / 1028 tests; one pre-existing non-failing Biome warning at `test/recipe/version-1-2.test.ts:50` |
| `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | pass ΓÇö 95.02% stmts / 85.72% branches / 98.33% funcs / 94.82% lines (gate 80%) |
| `pnpm vitest run --project goldens` | pass ΓÇö determinism hashes match |
| `node scripts/rubric-report.mjs` | pass ΓÇö 7 assets / 14 passes, mean 3.82 `pass`, gemini-3.5-flash-lite |
| `git diff --name-only 12037ca..HEAD` | 14 files, all under `conductor/` ΓÇö empty code delta |

Fresh-agent results: potion 9 calls, sword 11, humanoid 12, chest 11, CLI parity potion 8 ΓÇö all Γëñ12; zero `OUT_OF_BOUNDS`/`ORPHAN_PIXEL`; silhouettes 5/4/5/5. Strict renders: potion/sword exit 0; humanoid/chest exit 3 (`E_LINT_GATE`) with craft findings disclosed.

# Review

PASS after one review-fix round. Round 1 found one Low documentation-provenance finding (stale final HEAD in `verification/integrated.md`); R1 corrected it and a round-2 re-review confirmed no new findings. Zero findings deferred.

# Deviations and risks

- CLI parity run intentionally used CLI only (8 calls); all four MCP-first runs used `tools.px.*` with no CLI fallback.
- `--dry-run` silhouette scoring prints only integer scores, never judge rationale; no rationale was invented.
- No documentation fix or re-test: humanoid/chest findings are craft choices within budget and thresholds were already documented in `docs/lint-thresholds.md`; the one-fix budget was left untouched.
- R1 corrected only the integrated report's final-HEAD provenance; no check result, score, verdict, code or dependency changed.
- Residual strict-gate gaps are disclosed observations about the fresh agents' craft, not defects in this verification track.

# Follow-ups

None. The accepted debt from earlier tracks (`scripts/` outside lint/typecheck, archived stale prose) is pre-existing and out of scope.

# Rollback

Revert the merge commit with `git revert --no-edit -m 1 <merge-commit>`. This removes the Conductor track archive and the dated tech-stack note; no engine or generated asset data is changed.

