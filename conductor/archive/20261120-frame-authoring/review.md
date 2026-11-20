# Review: Frame Authoring for CLI and MCP

- **Track:** `20261120-frame-authoring`
- **Type:** `feature`
- **Branch:** `feat/20261120-frame-authoring`
- **Range:** `d6715dd634c48891571e2514d9027ac50eded4c6..02aae40cbb8f230a518a557c91ef6499e323a438`
- **Date:** 2026-11-20
- **Verdict:** `PASS` (round 2 — both round-1 findings fixed and independently re-reviewed; see History)
- **Doc sync:** `updated` — see `conductor/tech-stack.md` dated note 2026-11-20.

## Summary

All four phases, all 10 tasks, every FR/NFR/AC, and all configured checks pass.
The round-1 read-only reviewer found no Critical or High defects but reported
one Medium numeric-string frame-id selector bug (a valid id could be misread as
a logical index, targeting the wrong frame) and one Low docs/behavior mismatch
(`frame add` silently accepted neither `--from` nor `--ops`). Both were fixed in
review phase R1, verified with the full configured gate, and independently
re-reviewed in round 2 with verdict PASS. No new findings or regressions.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `pnpm verify` | pass | `verification/integrated.md`; re-run at review HEAD — 123 files / 1111 tests |
| typecheck | `pnpm typecheck` (via `pnpm verify`) | pass | no errors |
| lint / format | `pnpm lint` / `pnpm biome check .` (via `pnpm verify`) | pass | one pre-existing non-blocking `noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50` |
| build | `pnpm build` (via `pnpm verify`) | pass | `tsc -p tsconfig.build.json` |
| determinism | `pnpm vitest run --project goldens` | pass | 1 file / 6 tests, no re-baseline |
| coverage | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | pass | 120 files / 1079 tests; 94.89% stmts, 85.81% branches, 98.3% funcs, 94.69% lines (gate 80%) |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1, P2.T1–T2 | `test/unit/frames.test.ts`, `test/integration/frame.test.ts` (AC-1/AC-2) | covered |
| FR-2 | P1.T1, P2.T2 | unit `editFrame` tests, AC-3/AC-4 | covered |
| FR-3 | P1.T1, P2.T2 | unit `removeFrame`, AC-5 | covered (F1 edge case fixed in R1) |
| FR-4 | P1.T1, P2.T2 | unit `listFrames`, AC-6 | covered |
| FR-5 | P1.T1, P2.T2 | unit `setFrameDuration`, AC-7 | covered |
| FR-6 | P1.T1, P2.T2 | unit `moveFrame`, AC-8 | covered |
| FR-7 | P3.T1, P3.T3, P4.T1 | `test/mcp/frame.test.ts`, `test/smoke/{binaries,mcp-stdio}.test.ts` | covered |
| FR-8 | P1.T2, P2.T2 | unit guardrails, AC-10 (byte-for-byte no-write) | covered (F1 edge case fixed in R1) |
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

- **F1 — Numeric-string frame ids were unreachable as selectors — FIXED in R1**
  - **File:** `src/cli/commands.ts:1506-1518` (`frameSelector`)
  - **What:** The original selector unconditionally treated a canonical numeric string as a logical index, so a frame with `--id "5"` could not be addressed by `--frame 5` / `--from 5`.
  - **Fix:** `frameSelector` now resolves declared ids first (`(recipe.frames ?? []).some((frame) => frame.id === value)`) and only falls back to the numeric-index rule when no id matches. All five call sites now pass `recipe`: `--from` add (`:1576`), edit (`:1592`), remove (`:1609`), set-duration (`:1615`), move (`:1622`).
  - **Verification:** `test/integration/frame.test.ts` asserts the correct frame was mutated and its sibling left untouched, covering id/index drift after `move` and `remove` and the `--from`/`set-duration`/`move` sites — these fail under the old code. `test/mcp/frame.test.ts` adds byte parity for a numeric-string id whose value differs from its position.
  - **Requirement:** FR-3, FR-8, AC-5, AC-10 — covered.

### Low

- **F2 — `frame add` with neither `--from` nor `--ops` silently created an empty frame — FIXED in R1**
  - **File:** `src/cli/commands.ts:1568-1574` (`runFrame` add case)
  - **What:** The documented syntax `(--from <index|id> | --ops <json-array>)` presents one source as required, but the CLI previously accepted neither.
  - **Fix:** Throws `E_USAGE` (`Missing --from or --ops`) before any write. The core `addFrame` fallback is intentionally retained; enforcement belongs at the CLI/MCP boundary since MCP routes through the same CLI path. `docs/animation.md:76-78` documents the requirement.
  - **Verification:** `test/integration/frame.test.ts` asserts exit code 1, `E_USAGE`, and a byte-for-byte unchanged recipe file.
  - **Requirement:** FR-1 — covered.

## Overrides

- <none>

## Plan compliance

All four phases carry `Result: verified`, a concrete checkpoint (`7beee44`, `95c554d`, `b07fbea`, `2eb2159`) and a verification evidence file. All 10 top-level `[x]` tasks and their sub-tasks are implemented and checked; no task was dropped. Review phase R1 is verified at checkpoint `02aae40` with `verification/phase-R1.md`. The final code diff is the union of the phases' `Touches` plus the recorded deviations: Phase 2 `test/mcp/anchor.test.ts` and `test/mcp/reachability.test.ts` (staged exclusions), Phase 3 `test/mcp/reachability.test.ts` (staged deviation resolved), `test/mcp/parity.test.ts`, `test/smoke/mcp-stdio.test.ts`, and R1 `src/cli/commands.ts`, `test/integration/frame.test.ts`, `test/mcp/frame.test.ts`, `docs/animation.md`. All intentional and documented.

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
| 2 | PASS (R1 delta independently re-reviewed: F1 and F2 fixed, no new findings) | 0 | 0 | 0 | 0 | 2 |
