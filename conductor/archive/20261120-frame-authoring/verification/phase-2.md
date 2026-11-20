# Phase 2 Verification — CLI `frame` verb

- **Track:** 20261120-frame-authoring — Frame Authoring for CLI and MCP
- **Phase:** 2 — CLI `frame` verb
- **Date:** 2026-11-20
- **Branch:** feat/20261120-frame-authoring
- **Base commit:** 114d4689fa579bd808945e06ea08af453a15f1e3
- **Head commit:** 75448b6d3e6014e35f1c3b635a2a696d18de85b7
- **Result:** verified

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Integration (red) | `pnpm vitest run --project integration test/integration/frame.test.ts` | 1 | New frame test fails before implementation: 14 failed / 1 passed (no `frame` verb). |
| Integration (green) | `pnpm vitest run --project integration test/integration/frame.test.ts` | 0 | 15 passed after wiring; subcommand dispatch, all six verbs, guards and export timeline covered. |
| Full verify (first attempt) | `pnpm verify` | 1 | Typecheck clean; Biome flagged three formatting/import-order issues; two MCP invariant tests needed fixture updates for the new verb/flags. |
| Full verify (second attempt) | `pnpm verify` | 0 | Typecheck, Biome (1 pre-existing warning only), 122 files / 1099 tests, build all pass. |
| Required verification | `pnpm vitest run --project integration && pnpm verify` | 0 | Integration: 3 files / 39 tests passed. Verify: 122 files / 1099 tests passed, build clean. |

The single Biome warning (`noNonNullAssertion` at `test/recipe/version-1-2.test.ts:50`) predates this phase and is unchanged.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | `frame add --from 0` deep-clones frame 0; recipe stays valid and clone is independent | `test/integration/frame.test.ts` → `AC-1: add --from 0 ...` | Pass |
| AC-2 | `frame add --ops <json>` produces exactly the supplied layers/ops | `test/integration/frame.test.ts` → `AC-2: add --ops ...` | Pass |
| AC-3 | `frame edit --op-index 3 --ops <json>` changes only op 3 | `test/integration/frame.test.ts` → `AC-3: edit --op-index 3 ...` | Pass |
| AC-4 | `frame edit --replace --ops <json>` replaces the full ops list | `test/integration/frame.test.ts` → `AC-4: edit --replace ...` | Pass |
| AC-5 | `frame remove` by id/index; frame 0 refused | `test/integration/frame.test.ts` → `AC-5: remove ...` | Pass |
| AC-6 | `frame list` prints one row per frame including frame 0 | `test/integration/frame.test.ts` → `AC-6: list ...` | Pass |
| AC-7 | `set-duration 120` sets; `0`/`1.5` fail with no write | `test/integration/frame.test.ts` → `AC-7: set-duration ...` | Pass |
| AC-8 | `frame move --to 0` reorders; out-of-range fails | `test/integration/frame.test.ts` → `AC-8: move --to 0 ...` | Pass |
| AC-10 | duplicate ids, unknown targets and malformed ops fail before write | `test/integration/frame.test.ts` → `AC-10: bad ids, targets and ops ...` | Pass |
| AC-11 | identical command sequences produce byte-identical recipes | `test/integration/frame.test.ts` → `AC-11: repeated identical sequences ...` | Pass |
| AC-12 | `render --export` emits sheet PNG/meta with `timeline.total_ms` = sum of declared durations (frame 0 = 0) | `test/integration/frame.test.ts` → `AC-12: an authored recipe exports ...` (200 ms = 120 + 80) | Pass |

AC-9 (CLI/MCP byte parity) belongs to Phase 3 and is out of scope here.

Additional coverage: `--out` writes without touching the source; unknown subcommands and missing required arguments return `E_USAGE`; help advertises the verb, all six subcommands, the new flags and the documented `--ops`-wins-over-`--from` precedence.

## Evidence paths

- `test/integration/frame.test.ts` — 15 end-to-end integration tests.
- `src/cli/args.ts` — `frame` verb, second positional, `--frame/--to/--duration/--replace`.
- `src/cli/main.ts` — dispatch, help payload.
- `src/cli/commands.ts` — `runFrame` wiring: core engine → serialize → structural re-parse → write.
- Commits: `c144a8c` (tests), `2b545d4` (parse/dispatch/help), `75448b6` (engine wiring).

## Deviations

- `test/mcp/anchor.test.ts` — added `frame` to the hard-coded expected `COMMANDS` list. Required because `COMMANDS` is the published help verb list and Phase 2 adds the verb; no product behaviour change. Phase 3 keeps this entry.
- `test/mcp/reachability.test.ts` — added `--frame`, `--to`, `--duration`, `--replace` to `NOT_AGENT_FLAGS` with a comment that Phase 3's `px_frame` tool must remove them and add real mappings. Without this, the full verify gate fails during the staged rollout even though the flags are unreachable from MCP only until Phase 3. Both files are outside the phase `Touches`; these are fixture-only changes recorded here as required by the verification gate.

## Notes

- No runtime dependency added; the CLI delegates entirely to the Phase 1 pure core module, which was not modified.
- Failed mutations throw before `writeOut`, so a rejected recipe is never written — verified byte-for-byte in AC-7/AC-10.
- `frame add` with both `--from` and `--ops` honours explicit layers; this precedence is documented in CLI help.
- AC-12 builds the whole recipe through `init`, `draw` and `frame` commands with no hand-edited JSON, then checks the emitted sheet metadata.

## Primary verification

The primary agent independently re-ran the phase verification command on a clean tree:

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| integration | `pnpm vitest run --project integration` | 0 | 3 files / 39 tests pass. |
| full verify | `pnpm verify` | 0 | typecheck, lint (one pre-existing warning), 122 files / 1099 tests, build. |
| required chain | `pnpm vitest run --project integration && pnpm verify` | 0 | All gates pass. |

Diff scope against phase base `114d4689fa579bd808945e06ea08af453a15f1e3`: the four
declared Touches (`src/cli/args.ts`, `src/cli/main.ts`, `src/cli/commands.ts`,
`test/integration/frame.test.ts`), this evidence file, and the two recorded
deviation fixtures (`test/mcp/anchor.test.ts`, `test/mcp/reachability.test.ts`).
Both deviations are required by existing MCP invariant tests and are reverted/
completed in Phase 3 when `px_frame` maps the new flags. The working tree was clean.

Result: **verified**.

Follow-up for Phase 3: remove `--frame`, `--to`, `--duration` and `--replace` from
`NOT_AGENT_FLAGS` in `test/mcp/reachability.test.ts` and map them in `px_frame`.
