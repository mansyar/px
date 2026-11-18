# Agent Legibility Verification — Phase 1 Report (finalized)

- **Track:** `20261118-agent-legibility-verification` — Agent Legibility Verification
- **Phase:** 1 — Build the docs-only brief and run the fresh-agent test
- **Date:** 2026-11-18
- **Branch:** `chore/20261118-agent-legibility-verification`
- **Branch base (plan.md):** `12037ca4ce76844b3d64f8705992099b297fdf65`
- **Phase base:** `b66912c5a1ca8ad1f4dff9ec65cc9754407a06b2`
- **Covers:** FR-1, FR-2, FR-7, NFR-1, NFR-6, AC-1, AC-2
- **Result:** `verified`

The docs-only brief was assembled, the fresh-agent brief was materialized verbatim, and all five runs (four MCP-first assets plus one CLI parity run) completed within the 12-call budget with ordered transcripts recorded. The primary supplied the observed results for finalization. **Silhouette scoring and strict-render pass/fail are Phase 2 work and are not claimed here.**

## Commands table

| Layer / purpose | Command | Exit | Summary |
| --- | --- | --- | --- |
| docs capture | `pnpm exec tsx src/cli.ts --help` | 0 | CLI help JSON captured verbatim at `.conductor/evidence/agent-legibility/cli-help.json`; usage, commands, flags, `exit_codes` and `runtime` reproduced in `docs-brief.md` §1.1 and §3. |
| verification (prep) | `pnpm verify` | 0 | typecheck clean; Biome checked 216 files, no fixes, 1 pre-existing `noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50:7`; 119 test files / 1028 tests passed; build clean. |
| verification (final) | `pnpm verify` | 0 | Re-run after finalizing the two evidence files; same clean result at final HEAD. |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | A brief inventory exists and excludes all forbidden sources | `docs-brief.md` §1 (CLI help capture, 11 MCP descriptions, three docs with rubric restricted to the silhouette anchor) and §2 (explicit exclusions); mirrored at `.conductor/evidence/agent-legibility/inventory.md`; brief materialized at `.conductor/evidence/agent-legibility/fresh-agent-brief.md` (63/63 lines match §3, zero diff) | done |
| AC-2 | Four transcripts exist with call counts and tool surfaces; counts ≤12 or honest failures listed | `agent-runs.md` — four MCP-first rows (potion 9, sword 11, humanoid 12, chest 11) plus CLI parity potion 8; all ≤12; tool surface and recipe/render/transcript paths recorded; five transcripts present on disk | done |

FR-1/NFR-1 are satisfied by the recorded inventory, exclusions and verbatim brief materialization. FR-2/FR-7/NFR-6/AC-2 are satisfied by the five completed runs, ordered transcripts, tool-surface records and honest lint notes.

## Evidence paths

- `conductor/tracks/20261118-agent-legibility-verification/verification/docs-brief.md` — allowed-source inventory, CLI help capture location, MCP tool list, docs paths, exclusions, and copy-ready fresh-agent brief (§3).
- `conductor/tracks/20261118-agent-legibility-verification/verification/agent-runs.md` — finalized per-asset runs and CLI parity row, primary-observed lint notes, blocker history.
- `conductor/tracks/20261118-agent-legibility-verification/verification/phase-1.md` — this report.
- `.conductor/evidence/agent-legibility/cli-help.json` — verbatim CLI help capture.
- `.conductor/evidence/agent-legibility/inventory.md` — on-disk mirror of the inventory and the exact fresh-agent brief path.
- `.conductor/evidence/agent-legibility/fresh-agent-brief.md` — materialized verbatim by the primary from `docs-brief.md` §3 (63/63 lines, zero diff).
- `.conductor/evidence/agent-legibility/{potion,sword,humanoid,chest,cli-parity}/` — five output directories, each with a sibling `px.style.json`, recipe, render and ordered transcript.

## Blockers (RESOLVED BY PRIMARY — history preserved)

| # | Blocker | Resolution |
| --- | --- | --- |
| 1 | Prepare four fresh-agent run directories with a sibling `px.style.json` | **RESOLVED BY PRIMARY** — all five output directories exist with a sibling `px.style.json`. |
| 2 | Launch fresh `general` subagent for potion 16×16 (MCP-first) | **RESOLVED BY PRIMARY** — 9 calls, MCP px only; recipe/render/transcript present. |
| 3 | Launch fresh `general` subagent for sword 32×32 (MCP-first) | **RESOLVED BY PRIMARY** — 11 calls, MCP px only; recipe/render/transcript present. |
| 4 | Launch fresh `general` subagent for humanoid 32×32 (MCP-first) | **RESOLVED BY PRIMARY** — 12 calls (at limit), MCP px only; recipe/render/transcript present. |
| 5 | Launch fresh `general` subagent for chest 48×48 (MCP-first) | **RESOLVED BY PRIMARY** — 11 calls, MCP px only; recipe/render/transcript present. |
| 6 | Run the bounded CLI parity check (potion) | **RESOLVED BY PRIMARY** — 8 CLI-only calls; recipe/render/transcript present. |
| 7 | Supply primary-observed run results for finalization | **RESOLVED BY PRIMARY** — results supplied in the appended brief section and recorded in both evidence files. |

No open blockers remain.

## Deviations

- **CLI parity surface:** the potion parity run intentionally used CLI only, not MCP px. This is a deliberate parity check, not a fallback caused by MCP unavailability; all four MCP-first runs used `tools.px.*` via Code Mode.
- **Humanoid and chest lint findings:** humanoid's final render has 3 warnings (PILLOW_SHADE ×1, SILHOUETTE_LOSS ×2) plus info and would gate under `--strict`; chest's final render has 41 diagnostic warning/info findings with no errors. Both are recorded honestly; neither is claimed clean.
- No engine, op, linter, rubric, config, recipe, `scores.json`, or source file was touched. The code delta is intentionally empty.

## Notes

- Recovered errors during authoring (`E_UNKNOWN_SLOT`, `E_EMPTY_PART`, two humanoid errors, CLI `E_BAD_PALETTE`, chest init/draw errors) were resolved within the runs and are self-recorded in the transcripts; they are not treated as failures.
- Call counts: potion 9, sword 11, humanoid 12, chest 11, CLI parity 8 — all ≤12.
- Primary check: `test/art/scores.json` SHA-256 unchanged at `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`; no credentialed scoring was run and `node scripts/rubric.mjs` was not invoked.
- Silhouette diagnostics, strict renders and any pass/fail quality verdict are Phase 2 scope; this phase records only the runs and their honest lint notes.
- The CLI help command initially returned `permission.rejected` when combined with an appended exit-code echo; the exact command `pnpm exec tsx src/cli.ts --help` ran successfully (exit 0). Not an open blocker.

## Primary verification (conductor-implement)

- Date: 2026-11-18; branch `chore/20261118-agent-legibility-verification`; phase base `b66912c5a1ca8ad1f4dff9ec65cc9754407a06b2`.
- Working tree clean; range `b66912c..HEAD` contains exactly the three reported commits (`f1b38f7`, `e593163`, `2d764c4`) and exactly three files, all within Phase 1 Touches (`verification/docs-brief.md`, `verification/agent-runs.md`, `verification/phase-1.md`). No merge or unreported commit; squash eligible.
- Fresh-agent brief materialized verbatim at `.conductor/evidence/agent-legibility/fresh-agent-brief.md` (63/63 lines match `docs-brief.md` §3, zero diff); all five per-asset directories contain a sibling `px.style.json`, recipe, render and transcript.
- All five runs recorded honestly within budget: potion MCP 9, sword MCP 11, humanoid MCP 12, chest MCP 11, CLI parity potion 8. Zero `PENDING PRIMARY` cells remain in `agent-runs.md` and `phase-1.md`.
- `test/art/scores.json` SHA-256 unchanged: `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`; no credentialed scoring run in this phase.
- Primary re-ran `pnpm verify` at HEAD: exit 0 (119 files / 1028 tests; one pre-existing non-failing Biome `noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50`; build clean).
- AC-1 and AC-2 satisfied for the docs-only brief and four MCP-first transcripts with CLI parity; silhouette and strict-render pass/fail are deferred to Phase 2. Subagent status verified, blockers [].

