# Phase R1 Verification — Review fixes (round 1)

- **Track:** 20261120-frame-authoring — Frame Authoring for CLI and MCP
- **Phase:** R1 — Review fixes (review round 1)
- **Date:** 2026-11-20
- **Branch:** feat/20261120-frame-authoring
- **Phase base:** `6b44b2a`
- **Code head:** `f85f478` (test commit `995d096`; implementation commit `f85f478`)
- **Result:** verified — the primary ran the exact combined verification command,
  all stages exit 0. (The subagent shell permission denial is resolved.)

## Summary

Both review findings are fixed with test-first coverage.

- **F1:** `frameSelector` in `src/cli/commands.ts` now resolves a raw selector
  against declared frame **ids first**; only when no frame carries that exact id
  does it fall back to the original canonical-number-as-logical-index rule.
  Applied uniformly to `--frame` (edit, remove, set-duration, move) and `--from`
  (add). Frame 0 (`"0"` → base) still works when no frame has id `"0"`, and the
  error vocabulary (`E_USAGE` / `E_BAD_PARAM` / `E_BAD_META`) is unchanged.
- **F2:** The `add` case of `runFrame` now throws `E_USAGE` when neither `--from`
  nor `--ops` is supplied, with a hint quoting the documented
  `(--from <index|id> | --ops <json-array>)` form. The core engine fallback is
  untouched (MCP shares the CLI path). `docs/animation.md` now states the
  requirement and the id-first selector rule.

No runtime dependency added; no other file or Conductor state touched.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Integration (red) | `pnpm vitest run --project integration test/integration/frame.test.ts` | 1 | 5 new tests fail / 15 pass — all five F1/F2 cases fail on the unfixed code (TEST-FIRST confirmation). |
| MCP (red) | `pnpm vitest run --project unit test/mcp/frame.test.ts` | 1 | New F1 parity test fails / 4 pass on the unfixed code. |
| Integration (green) | `pnpm vitest run --project integration test/integration/frame.test.ts` | 0 | 20/20 pass after the fix. |
| MCP (green, first) | `pnpm vitest run --project unit test/mcp/frame.test.ts` | 1 | Test-only assertion bug: compared normalized ops to raw tuples; CLI/MCP bytes already matched. Corrected the assertion. |
| MCP (green, final) | `pnpm vitest run --project unit test/mcp/frame.test.ts` | 0 | 5/5 pass after correcting the test assertion. |
| **Exact combined command** | `pnpm verify && pnpm vitest run --project unit && pnpm vitest run --project integration && pnpm vitest run --project smoke && pnpm vitest run --project goldens && pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | 0 | Primary run: verify 123 / 1111, unit 114 / 1018, integration 3 / 44, smoke 2 / 11, goldens 1 / 6, coverage 120 / 1079; 94.89 / 85.81 / 98.3 / 94.69%. |

The two targeted green runs cover every changed behavior. The full gate
(typecheck, lint, build, all unit/integration/smoke/goldens suites, and the
coverage gate) could not be executed by this subagent due to the permission
denial above and is delegated to the primary.

## Findings

| ID | Fix | Test | Status |
| --- | --- | --- | --- |
| F1 (Medium) | `frameSelector` (src/cli/commands.ts) resolves declared ids before logical indices; all five call sites pass the source recipe. Ids that look numeric now win over index interpretation, including after `move`/`remove` drift. | `test/integration/frame.test.ts` — 4 new cases (edit/remove with off-position numeric ids; after `move`; after `remove`; `--from`/`set-duration`/`move`); `test/mcp/frame.test.ts` — numeric-string id parity through argv. | Fixed; locally green. |
| F2 (Low) | `add` case of `runFrame` throws `E_USAGE` when both `--from` and `--ops` are absent; `docs/animation.md` documents the requirement. | `test/integration/frame.test.ts` — rejects with `E_USAGE` and asserts the recipe is byte-for-byte unchanged. | Fixed; locally green. |

## Evidence paths

- `src/cli/commands.ts` — id-first `frameSelector` + `add` source guard.
- `test/integration/frame.test.ts` — five new F1/F2 integration tests plus a shared `EXPECTED_ONE_OP`.
- `test/mcp/frame.test.ts` — F1 numeric-string id parity test (CLI bytes == MCP bytes).
- `docs/animation.md` — documented id-first selector and required `add` source.
- Commits: `995d096` (test-first red tests), `f85f478` (fix + docs + corrected MCP assertion).

## Deviations

None. All edits are confined to the four paths in `Touches` (`src/cli/commands.ts`,
`test/integration/frame.test.ts`, `test/mcp/frame.test.ts`, `docs/animation.md`)
plus this evidence file. The single MCP test-file change after the fix was a
correction to my own new assertion (normalized ops vs raw tuples), not a
behavior change.

## Blockers

- **Command:** `pnpm verify && pnpm vitest run --project unit && pnpm vitest run --project integration && pnpm vitest run --project smoke && pnpm vitest run --project goldens && pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens`
- **Why:** Required phase verification gate; must confirm typecheck, lint, build, all four test projects, and the 80% coverage gate still pass with the F1/F2 changes.
- **Expected:** All stages exit 0 (consistent with the Phase 4 baseline: 123 files / 1105 tests on `pnpm verify`, and the four-project coverage run passing the 80% gate). The primary has previously been able to run this command for Phase 4.

## Notes

- TEST-FIRST followed: red tests committed at `995d096`, then the fix at `f85f478`.
- No runtime dependency, generated file, lockfile, or core-engine change. The core
  `addFrame` fallback was deliberately left intact; the requirement is enforced at
  the CLI/MCP boundary.
- Error messages stay in the existing `E_*` / usage vocabulary; frame 0 behavior is
  preserved because `"0"` resolves to the base only when no declared frame has id `"0"`.

## Primary verification

The primary independently ran the exact combined command on the current branch.
The first run failed only on two Biome formatting diagnostics in the new test
files; `pnpm exec biome check --write test/integration/frame.test.ts
test/mcp/frame.test.ts` applied formatter-only fixes, after which the exact
combined command exited 0 at every stage:

- `pnpm verify` — typecheck, lint (one pre-existing, non-blocking
  `noNonNullAssertion` warning), 123 files / 1111 tests, build.
- `pnpm vitest run --project unit` — 114 files / 1018 tests.
- `pnpm vitest run --project integration` — 3 files / 44 tests.
- `pnpm vitest run --project smoke` — 2 files / 11 tests.
- `pnpm vitest run --project goldens` — 1 file / 6 tests, no re-baseline.
- Coverage — 120 files / 1079 tests, 94.89% stmts / 85.81% branches /
  98.3% funcs / 94.69% lines (gate 80%); `frames.ts` 88.33 / 80 / 96.96 / 87.61.

Diff scope vs phase base `6b44b2a`: exactly the four `Touches` plus this
evidence file. Both findings are fixed with behavioral tests and the result is
**verified**.
