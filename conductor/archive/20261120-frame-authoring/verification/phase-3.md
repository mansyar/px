# Phase 3 Verification — MCP `px_frame` parity

- Track: `20261120-frame-authoring` (Frame Authoring for CLI and MCP)
- Phase: 3 — MCP `px_frame` parity
- Date: 2026-11-20
- Branch: `feat/20261120-frame-authoring`
- Phase base: `0e2b73886c43902425d490b7a464a92d915ed74d`
- Head: `2bdc1fdc9941cc3761a85d6a2826a43f164b02e6`
- Result: **verified**

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit | `pnpm vitest run --project unit test/mcp/frame.test.ts` (pre-implementation) | 1 | Red gate: all 4 new tests fail because `px_frame` is unregistered (TDD confirmation). |
| unit | `pnpm vitest run --project unit test/mcp/frame.test.ts` (post-implementation) | 0 | 4/4 pass: parity, `--out`, guardrail, registration. |
| unit | `pnpm vitest run --project unit` | 0 | 114 files, 1017 tests passed (includes MCP parity/reachability/anchor suites). |
| smoke | `pnpm vitest run --project smoke` | 0 | 2 files, 11 tests passed (includes real MCP stdio handshake with `px_frame`). |
| verify | `pnpm verify` | 0 | typecheck, lint, test (123 files / 1105 tests), build all pass. |
| gate | `pnpm vitest run --project unit && pnpm vitest run --project smoke && pnpm verify` | 0 | Full phase verification command passes end to end. |

`pnpm verify` lint emits one pre-existing, non-blocking warning (`lint/style/noNonNullAssertion` at `test/recipe/version-1-2.test.ts:50`), documented in `conductor/tech-stack.md`. No new errors or warnings were introduced.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| FR-7 | MCP `px_frame` exposes all six operations with identical semantics | `src/mcp/tools.ts` registers the 12th tool, declares `subcommand` + all 11 flags, and `argvFor` emits `frame <subcommand> ...`; `test/mcp/frame.test.ts` registration test; `test/smoke/binaries.test.ts` + `test/smoke/mcp-stdio.test.ts` prove registration and real-stdio reachability | Verified |
| AC-9 | Each `px_frame` call produces the same recipe bytes as the CLI equivalent | `test/mcp/frame.test.ts` seeds one base recipe into two workspaces, runs all six subcommands plus `--out` and a failing-guardrail case through `runCli` and `callTool`, and asserts equal envelopes and byte-identical recipe files | Verified |
| NFR-2 | No new runtime dependency; CLI and MCP share the core engine | `px_frame` maps to the same `frame` CLI argv via `argvFor`/`callTool`; dependency manifest smoke test still asserts exactly one runtime dependency | Verified |
| Phase 2 deviation | Remove staged `--frame`/`--to`/`--duration`/`--replace` exclusions and map them in `px_frame` | `test/mcp/reachability.test.ts`: four `NOT_AGENT_FLAGS` entries removed, 13 bidirectional `MAPPINGS` rows added; `test/mcp/anchor.test.ts` still lists `frame` in `COMMANDS` | Verified |

## Evidence paths

- `src/mcp/tools.ts` — `px_frame` tool definition and `argvFor` case.
- `test/mcp/frame.test.ts` — AC-9 byte-parity and registration tests.
- `test/mcp/reachability.test.ts` — bidirectional reachability table with the four staged exclusions removed and all frame flags mapped.
- `test/mcp/parity.test.ts` — published tool count updated to 12.
- `test/smoke/binaries.test.ts` — tool-surface registration smoke test.
- `test/smoke/mcp-stdio.test.ts` — real MCP handshake tool list and `px_frame` end-to-end call.

## Deviations

- `test/mcp/reachability.test.ts` — explicit Phase 2 deviation completion: removed `--frame`, `--to`, `--duration`, `--replace` from `NOT_AGENT_FLAGS`, added 13 `MAPPINGS` rows covering the `subcommand` positional and every frame flag, and updated the published tool count from 11 to 12.
- `test/mcp/parity.test.ts` — forced fixture update: the "published surface" assertion hard-codes the tool count; updated 11 → 12 to match the new tool. Smallest possible change.
- `test/smoke/mcp-stdio.test.ts` — forced fixture update: the real-stdio handshake asserts an exact 11-tool list; added `px_frame` (12 tools) and one end-to-end `px_frame` call to prove reachability. Smallest possible change.

## Notes

- Worked test-first: wrote `test/mcp/frame.test.ts` and the smoke fixture changes, observed all four new unit tests fail on the unregistered tool, then implemented `src/mcp/tools.ts` and observed green.
- `ops` serialization reuses `opsArg`; `replace` uses `booleanFlag`; numeric params (`to`, `op_index`, `duration`) are stringified by `flag`; the `subcommand` is forwarded as the verb's second positional token.
- Commit sequence: `e4da0cd` (tests), `79f3eed` (implementation), `2bdc1fd` (Biome formatting of the additions).
- `test/mcp/anchor.test.ts` required no change; `frame` remains in its expected `COMMANDS` list.

## Primary verification

The primary agent independently re-ran the exact phase verification command on a clean tree:

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit | `pnpm vitest run --project unit` | 0 | 114 files / 1017 tests pass. |
| smoke | `pnpm vitest run --project smoke` | 0 | 2 files / 11 tests pass. |
| full verify | `pnpm verify` | 0 | typecheck, lint (one pre-existing warning), 123 files / 1105 tests, build. |
| required chain | `pnpm vitest run --project unit && pnpm vitest run --project smoke && pnpm verify` | 0 | All gates pass. |

Diff scope against phase base `0e2b73886c43902425d490b7a464a92d915ed74d`: the three
declared Touches (`src/mcp/tools.ts`, `test/mcp/frame.test.ts`,
`test/smoke/binaries.test.ts`), this evidence file, and the three recorded forced
fixture updates (`test/mcp/reachability.test.ts`, `test/mcp/parity.test.ts`,
`test/smoke/mcp-stdio.test.ts`). The Phase 2 staged `NOT_AGENT_FLAGS` deviation is
now fully resolved. The working tree was clean.

Result: **verified**.
