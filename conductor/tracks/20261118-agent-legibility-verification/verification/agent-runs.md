# Fresh-agent runs — Phase 1 (finalized)

- **Track:** `20261118-agent-legibility-verification`
- **Phase:** 1 — Build the docs-only brief and run the fresh-agent test
- **Date:** 2026-11-18
- **Branch:** `chore/20261118-agent-legibility-verification`
- **Covers:** FR-2, FR-7, NFR-1, NFR-6, AC-2
- **Result:** `verified`

All five runs completed and were observed by the primary on 2026-11-18. Every asset stayed within the 12-call budget. The four MCP-first runs used `tools.px.*` via Code Mode with no CLI fallback; the CLI parity run intentionally used the CLI only. **Silhouette scoring and strict-render pass/fail are Phase 2 work and are not claimed here.** No score, rubric verdict, or zero-finding claim is made in this file.

- **Brief inventory:** `docs-brief.md` §1–§2 (mirrored at `.conductor/evidence/agent-legibility/inventory.md`)
- **Exact fresh-agent brief path:** `.conductor/evidence/agent-legibility/fresh-agent-brief.md` — materialized verbatim by the primary (63/63 lines match `docs-brief.md` §3, zero diff)
- **Call budget:** ≤12 px tool calls per asset — all five runs within budget
- **Tool surface:** MCP-first; the CLI parity run is an intentional, recorded deviation, not a fallback

## MCP-first runs

| Asset | Tool surface | Calls | Recipe path | Render path | Transcript | Lint summary (primary-observed) | Silhouette | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| potion 16×16 | MCP px (`tools.px.*`) | 9 | `.conductor/evidence/agent-legibility/potion/potion.px.json` | `.conductor/evidence/agent-legibility/potion/potion.png` | `.conductor/evidence/agent-legibility/potion/transcript.md` | One recovered `E_UNKNOWN_SLOT`; final render has 10 BANDING info findings, no warnings or errors | PENDING PHASE 2 | Run complete, 9/12 calls; quality gate deferred to Phase 2 |
| sword 32×32 | MCP px (`tools.px.*`) | 11 | `.conductor/evidence/agent-legibility/sword/sword.px.json` | `.conductor/evidence/agent-legibility/sword/sword.png` | `.conductor/evidence/agent-legibility/sword/transcript.md` | One recovered `E_EMPTY_PART`; final render clean of warnings, 4 info findings | PENDING PHASE 2 | Run complete, 11/12 calls; quality gate deferred to Phase 2 |
| humanoid 32×32 | MCP px (`tools.px.*`) | 12 | `.conductor/evidence/agent-legibility/humanoid/humanoid.px.json` | `.conductor/evidence/agent-legibility/humanoid/humanoid.png` | `.conductor/evidence/agent-legibility/humanoid/transcript.md` | Two recovered errors; final render has 3 warnings (PILLOW_SHADE ×1, SILHOUETTE_LOSS ×2) plus info; a strict render would gate | PENDING PHASE 2 | Run complete, 12/12 calls (at limit); lint warnings recorded, not claimed clean |
| chest 48×48 | MCP px (`tools.px.*`) | 11 | `.conductor/evidence/agent-legibility/chest/chest.px.json` | `.conductor/evidence/agent-legibility/chest/chest.png` | `.conductor/evidence/agent-legibility/chest/transcript.md` | Recovered init/draw errors; final render has 41 diagnostic warning/info findings, no errors | PENDING PHASE 2 | Run complete, 11/12 calls; diagnostic findings recorded, not claimed clean |

All four MCP-first runs used `tools.px.*` via Code Mode with no CLI fallback; each transcript was self-recorded by the fresh agent and is present on disk.

## CLI parity run (representative asset: potion)

| Asset | Tool surface | Calls | Recipe path | Render path | Transcript | Lint summary (primary-observed) | Silhouette | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| potion 16×16 | CLI only (intentional deviation) | 8 | `.conductor/evidence/agent-legibility/cli-parity/potion.px.json` | `.conductor/evidence/agent-legibility/cli-parity/potion.png` | `.conductor/evidence/agent-legibility/cli-parity/transcript.md` | One recovered `E_BAD_PALETTE`; final render has 1 LOW_CONTRAST warning + 5 BANDING info findings | PENDING PHASE 2 | Parity run complete, 8/12 calls; CLI-only surface recorded as an intentional deviation |

The parity run used the same docs-only brief (`docs-brief.md` §3, contract A) and is recorded beside the MCP results. No MCP fallback was used; the CLI-only surface is intentional, not an MCP failure.

## Primary checks before finalization

- Fresh-agent brief materialized verbatim at `.conductor/evidence/agent-legibility/fresh-agent-brief.md` — 63/63 lines match `docs-brief.md` §3, zero diff.
- All five output directories exist with a sibling `px.style.json`; recipes, renders and transcripts are present on disk.
- `test/art/scores.json` SHA-256 unchanged: `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`.
- `pnpm verify` exit 0 at the prep HEAD (119 files / 1028 tests; one pre-existing non-failing warning).

## Blocker history (all RESOLVED BY PRIMARY; history preserved)

| # | Blocker | Resolution |
| --- | --- | --- |
| 1 | Prepare the four fresh-agent run directories with a sibling `px.style.json` | **RESOLVED BY PRIMARY** — all five output directories exist with a sibling `px.style.json`. |
| 2 | Launch fresh `general` subagent for potion 16×16 (MCP-first) | **RESOLVED BY PRIMARY** — 9 calls, MCP px only; recipe/render/transcript paths above. |
| 3 | Launch fresh `general` subagent for sword 32×32 (MCP-first) | **RESOLVED BY PRIMARY** — 11 calls, MCP px only; recipe/render/transcript paths above. |
| 4 | Launch fresh `general` subagent for humanoid 32×32 (MCP-first) | **RESOLVED BY PRIMARY** — 12 calls (at limit), MCP px only; recipe/render/transcript paths above. |
| 5 | Launch fresh `general` subagent for chest 48×48 (MCP-first) | **RESOLVED BY PRIMARY** — 11 calls, MCP px only; recipe/render/transcript paths above. |
| 6 | Run the bounded CLI parity check (potion) and collect its transcript | **RESOLVED BY PRIMARY** — 8 CLI-only calls; recipe/render/transcript paths above. |
| 7 | Supply the primary-observed run results for finalization | **RESOLVED BY PRIMARY** — results supplied in the appended brief section and recorded in this file and `phase-1.md`. |

No open blockers remain.

## Deviations

- **CLI parity surface:** the potion parity run intentionally used CLI only (`pnpm exec tsx src/cli.ts`), not MCP px. This is a deliberate parity check, not a fallback caused by MCP unavailability; all four MCP-first runs used `tools.px.*`.
- **Humanoid and chest lint findings:** the humanoid final render has 3 warnings (PILLOW_SHADE ×1, SILHOUETTE_LOSS ×2) and the chest final render has 41 diagnostic warning/info findings. These are recorded honestly; neither asset is claimed clean. Strict-render gating and silhouette measurement are Phase 2.
- No engine, op, linter, rubric, config, recipe, `scores.json`, or source file was touched by this phase.

## Notes

- Recovered errors (`E_UNKNOWN_SLOT`, `E_EMPTY_PART`, two humanoid errors, CLI `E_BAD_PALETTE`, chest init/draw errors) are self-recorded by the fresh agents and were resolved within their runs; they are not treated as failures.
- Call counts: potion 9, sword 11, humanoid 12, chest 11, CLI parity 8 — all ≤12.
- No silhouette score, rubric verdict, or "zero findings" claim is made; those are Phase 2 measurements.
