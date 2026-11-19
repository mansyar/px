# Review — Animation Foundations

- Track: `20261119-animation-foundations` (feature, medium)
- Branch: `feat/20261119-animation-foundations`
- Range: `d082eae6b958da29bf67cada67b46d3b3b86684a..192caf88ae1c720e2c55e38dfe8ded5ab02d4900`
- Date: 2026-11-19T05:50:03Z
- Verdict: **PASS WITH FINDINGS** (strict mode requires every finding to be resolved before PR)

## Summary

Version-gated v1.4 frames, canonical round-trip, byte-identical frame-0 compilation, deterministic single-row sheet export and additive metadata are implemented with all protected baselines intact. One Medium end-to-end gap remains: `lintCompiledFrames` is defined and unit-tested but the render path still reports/gates only frame 0, so AC-4's "any frame blocks under --strict and suppresses sheet artifacts" is not satisfied end to end. Two disclosed Low debt items remain (an unexecuted dedicated v1.4 test file and a design-less golden fixture). No Critical or High finding; all findings are routed to review-fix Phase R1.

## Verification

| Layer / check | Result | Evidence |
| --- | --- | --- |
| `pnpm verify` | pass (exit 0; 119 files / 1041 tests; one pre-existing non-failing warning at `test/recipe/version-1-2.test.ts:50`; build clean) | primary-confirmed, integrated.md |
| Scoped coverage | pass (exit 0; 95.01% stmts / 85.8% branches / 98.36% funcs / 94.82% lines; gate 80%) | primary-confirmed, integrated.md |
| Goldens determinism | pass (exit 0; 1 file / 5 tests) | primary-confirmed, integrated.md |
| `node scripts/rubric-report.mjs` | pass (7 assets / 14 passes, mean 3.82 `pass`, `gemini-3.5-flash-lite`) | primary-confirmed, integrated.md |
| `test/art/scores.json` SHA-256 | unchanged `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` | primary + reviewer cross-check |
| `test/goldens/fixtures/hero.sha256` | unchanged `A8FE8F44E481512998C45E6FCD384002F01AF4ED9B969DA52C6141E133F7ED62` | primary + reviewer cross-check |
| Double render | A=B for frame PNG `7c0c9b38…b559`, sheet PNG `6189229c…f045`, frame meta `81592ec3…13dd0`, sheet meta `92fe07c5…ce17` | primary-confirmed, integrated.md |
| Code delta | 20 files, +1147/−24; all within approved Phase 1/2 Touches | reviewer `git diff --stat`/`--name-only` |
| Checkpoints | `5cc6103`, `be67c03`, `37e4223` are real commits | reviewer `git log`/`git show` |
| Reviewer `needs` | none | reviewer report |

## Requirements

FR-1..FR-8, NFR-1..NFR-4 and AC-1..AC-11 are covered by the phase evidence and integrated matrix, with these exceptions: FR-4 and AC-4 are **partial** because of F1; FR-1/FR-2 and AC-1/AC-2 carry the disclosed Low F2 debt; FR-3/FR-7 carry the disclosed Low F3 debt. All other requirements are covered without qualification.

## Findings

### Critical / High

None.

### Medium

- **F1 — PENDING R1** — `src/cli/commands.ts:43,1145-1152`: `lintCompiledFrames` is never imported by the render path; `runRender`'s findings come from `lintCompiled(result.compiled, ...)` (frame 0 only) and the sheet is written before the strict gate runs. A framed recipe with a warning confined to frame 1+ therefore does not gate under `--strict` and can still write `<stem>.sheet.png` / `<stem>.sheet.meta.json`. Root cause: AC-4 was satisfied at unit level but not end to end. Fix: report all-frame findings from `runRender` (via `lintCompiledFrames` over `compileRecipeFrames(effective)`) and suppress sheet artifacts when `args.strict && lintBlocks(findings, true)`; add an integration test that renders a framed recipe with a frame-1 warning under `--strict`, asserting exit 3 and no sheet files. Requirement: FR-4 / AC-4. Test gap: integration test through `runCli`.

### Low

- **F2 — PENDING R1** — `test/recipe/version-1-4.test.ts:1-206`: the dedicated 206-line v1.4 test file is outside every vitest project include, so only the mirrored unit assertions execute in CI. Disclosed honestly in `integrated.md` Deviations and `phase-1.md`; residual debt, not a correctness defect. Fix: add a header comment stating it is not executed by CI, or fold assertions fully into the in-scope unit files and delete it. Requirement: FR-1/FR-2/AC-1/AC-2. Test gap: none.
- **F3 — PENDING R1** — `test/goldens/fixtures/anim-duo.px.json:1-89`: the original `design` block was removed because `validateIntent` rejects a hierarchy part absent from a `parts` block; the golden therefore does not exercise the "all frames share design" clause. Disclosed in `export-sheet.md`/`phase-2.md`. Fix: optionally add a declared `parts` block with a valid hierarchy and restore a minimal `design` block. Requirement: FR-3/FR-7. Test gap: none.

## Overrides

None.

## Plan compliance

PASS for the three implemented phases: all `Status: verified` with Result/Checkpoint/Evidence; 10/10 tasks `[x]`; metadata 3/3 phases and 10/10 tasks; documented deviations disclosed; `doc_sync: done` with the 2026-11-19 tech-stack note; integrated.md uses point-in-time HEAD wording consistent with git history. Review-fix Phase R1 is appended for the findings above. Registry remains `[~]` until completion.

## Out of scope

Onion-skin/playback/interpolation/timeline, tilemaps, GUI, translucent alpha, RNG, npm publish, non-Godot exports, new CLI verb or MCP tool, engine op changes, linter-threshold/rubric/CI changes, `test/art/**`, `scores.json`, archives and earlier golden digests. No out-of-scope finding.

## Debt

F2 and F3 are disclosed residual debt. The pre-existing Biome warning at `test/recipe/version-1-2.test.ts:50` predates the track. `duration` is recorded but not interpreted by design.

## Doc sync

pending — R1 must update `verification/phase-R1.md`; if F2's header comment or F3's fixture change is applied, `docs/animation.md` / `verification/schema-frames.md` may need a matching clarification. No product or guideline change is anticipated.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 1 | 2 | 0 |
