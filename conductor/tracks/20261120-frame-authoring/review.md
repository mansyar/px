# Review: Frame Authoring for CLI and MCP

- **Track:** `20261120-frame-authoring`
- **Type:** `feature`
- **Branch:** `feat/20261120-frame-authoring`
- **Range:** `d6715dd634c48891571e2514d9027ac50eded4c6..f255d8a0cdf48099a5929858b8bd50c9e3615ebc`
- **Date:** 2026-11-20
- **Verdict:** `BLOCK` (round 1 — two fixable findings; see History)
- **Pre-review doc sync:** `updated` — see `conductor/tech-stack.md` dated note 2026-11-20.

## Summary

All four phases, all 10 tasks, every FR/NFR/AC, and all configured checks pass.
The read-only reviewer found no Critical or High defects but reported one Medium
numeric-string frame-id selector bug (a valid id can be misread as a logical
index, targeting the wrong frame) and one Low docs/behavior mismatch (`frame
add` silently accepts neither `--from` nor `--ops`). Both are objective, local,
and in scope, so they are fixed in review phase R1 rather than deferred.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `pnpm verify` | pass | `verification/integrated.md` — 123 files / 1105 tests; also re-run at review HEAD |
| typecheck | `pnpm typecheck` (via `pnpm verify`) | pass | no errors |
| lint / format | `pnpm lint` / `pnpm biome check .` (via `pnpm verify`) | pass | one pre-existing non-blocking `noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50` |
| build | `pnpm build` (via `pnpm verify`) | pass | `tsc -p tsconfig.build.json` |
| determinism | `pnpm vitest run --project goldens` | pass | 1 file / 6 tests, no re-baseline |
| coverage | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | pass | 120 files / 1073 tests; 94.89% stmts, 85.81% branches, 98.3% funcs, 94.69% lines (gate 80%) |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1, P2.T1–T2 | `test/unit/frames.test.ts`, `test/integration/frame.test.ts` (AC-1/AC-2) | covered |
| FR-2 | P1.T1, P2.T2 | unit `editFrame` tests, AC-3/AC-4 | covered |
| FR-3 | P1.T1, P2.T2 | unit `removeFrame`, AC-5 | covered (F1 edge case under repair) |
| FR-4 | P1.T1, P2.T2 | unit `listFrames`, AC-6 | covered |
| FR-5 | P1.T1, P2.T2 | unit `setFrameDuration`, AC-7 | covered |
| FR-6 | P1.T1, P2.T2 | unit `moveFrame`, AC-8 | covered |
| FR-7 | P3.T1, P3.T3, P4.T1 | `test/mcp/frame.test.ts`, `test/smoke/{binaries,mcp-stdio}.test.ts` | covered |
| FR-8 | P1.T2, P2.T2 | unit guardrails, AC-10 (byte-for-byte no-write) | covered (F1 edge case under repair) |
| FR-9 | P1.T2, P2.T2 | unit determinism, AC-11, `serialize.ts` canonical order | covered |
| FR-10 | P2.T3, P4.T1 | AC-12 (sheet + `timeline.total_ms` = 200), `docs/animation.md` | covered |
| NFR-1 | P1.T3, P2.T3 | unit + integration byte-identical sequences | covered |
| NFR-2 | P3.T1 | shared core delegation; smoke manifest asserts one runtime dependency | covered |
| NFR-3 | P4.T1 + goldens | 6/6 goldens unchanged; absent fields omitted on serialize | covered |
| NFR-4 | P1.T2 | `E_*` vocabulary; no-write assertions in AC-7/AC-10 | covered |
| AC-1..AC-8 | P1.T3, P2.T3 | `test/unit/frames.test.ts`, `test/integration/frame.test.ts` | covered |
| AC-9 | P3.T2 | `test/mcp/frame.test.ts` byte parity for six subcommands, `--out`, guardrail | covered |
| AC-10 | P1.T3, P2.T3 | unit guardrails, AC-10 | covered |
| AC-11 | P1.T3, P2.T3 | unit + integration determinism | covered |
| AC-12 | P2.T3, P4.T1 | AC-12 export assertion, phase-4 docs | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- **F1 — Numeric-string frame ids are unreachable as selectors**
  - **File:** `src/cli/commands.ts:1498-1512` (`frameSelector`); consumed at `:1564`, `:1580`, `:1597`, `:1603`, `:1610`
  - **What:** `Number.isInteger(Number(v)) && String(Number(v)) === v` unconditionally treats a canonical numeric string as a logical index. A declared frame with `--id "5"` cannot be addressed by `--frame 5` / `--from 5`; the command targets a different frame or errors as unknown.
  - **Why:** `spec.md:91` allows any non-empty string id. Wrong-frame edit/remove/move is a data-integrity defect when a numeric id differs from the frame's logical position, especially after `move`/`remove`.
  - **Fix:** Resolve the raw selector against declared frame ids first; fall back to numeric-index interpretation otherwise. Add tests with a numeric id whose value differs from its logical position, including after `move`/`remove`.
  - **Requirement:** FR-3, FR-8, AC-5, AC-10
  - **Test gap:** CLI integration test for numeric-string id selection after reorder/removal; MCP parity is structural but must keep byte-identical behavior.

### Low

- **F2 — `frame add` with neither `--from` nor `--ops` silently creates an empty frame**
  - **File:** `src/core/recipe/frames.ts:244-252`; CLI help `src/cli/main.ts:48`
  - **What:** The documented syntax `(--from <index|id> | --ops <json-array>)` presents one source as required, but `addFrame` falls back to `[{id:'base', ops:[]}]` and the CLI accepts it.
  - **Why:** Docs/behavior mismatch; an agent omitting both receives a silent empty frame instead of an actionable usage error.
  - **Fix:** Require at least one of `--from` / `--ops` in the `add` case of `runFrame` with `E_USAGE`, and add one integration test for the chosen behavior.
  - **Requirement:** FR-1
  - **Test gap:** integration test for `frame add` with neither flag.

## Overrides

- <none>

## Plan compliance

All four phases carry `Result: verified`, a concrete checkpoint (`7beee44`, `95c554d`, `b07fbea`, `2eb2159`) and a verification evidence file. All 10 top-level `[x]` tasks and their sub-tasks are implemented and checked; no task was dropped. The final code diff is the union of the phases' `Touches` plus the recorded deviations: Phase 2 `test/mcp/anchor.test.ts` and `test/mcp/reachability.test.ts` (staged exclusions), Phase 3 `test/mcp/reachability.test.ts` (staged deviation resolved), `test/mcp/parity.test.ts`, `test/smoke/mcp-stdio.test.ts`. All intentional and documented. No code changed after phase 4; later commits touch only Conductor state/prose.

## Out of scope

`conductor/**` prose and state; no lockfiles, generated files, or vendored code in the diff. No render/export semantic change, golden re-baseline, dependency change, or product-guideline change.

## Debt

- Pre-existing, non-blocking Biome warning at `test/recipe/version-1-2.test.ts:50` (not introduced by this track).
- No leftover review findings once R1 lands; no issues to file.

## Doc sync

`updated` — `conductor/tech-stack.md` gained a dated 2026-11-20 note describing `px frame` / `px_frame`; `docs/animation.md` documents the full contract. No product or guideline changes require user approval.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK (reviewer proposed PASS WITH FINDINGS; both findings elected for repair) | 0 | 0 | 1 | 1 | 0 |
