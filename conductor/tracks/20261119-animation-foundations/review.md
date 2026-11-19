# Review — Animation Foundations

- Track: `20261119-animation-foundations` (feature, medium)
- Branch: `feat/20261119-animation-foundations`
- Range: `d082eae6b958da29bf67cada67b46d3b3b86684a..192caf88ae1c720e2c55e38dfe8ded5ab02d4900`
- Date: 2026-11-19T05:50:03Z
- Verdict: **PASS** (after review-fix round 1 resolved all three findings)

## Summary

Version-gated v1.4 frames, canonical round-trip, byte-identical frame-0 compilation, deterministic single-row sheet export and additive metadata are implemented with all protected baselines intact. Round 1 found one Medium end-to-end strict-gating gap and two Low disclosure gaps; all three were resolved in review-fix round 1 at checkpoint `2a4ca4ebc30941308fcbd88b8a5cfe185135c548`: the render path now reports all-frame findings and suppresses sheet artifacts under `--strict`, the non-executing v1.4 test file is labelled, and the golden fixture exercises a declared shared design/parts. `pnpm verify` is green at 119 files / 1043 tests; no Critical or High finding remains.

## Verification

| Layer / check | Result | Evidence |
| --- | --- | --- |
| `pnpm verify` | pass (exit 0; 119 files / 1043 tests after R1; one pre-existing non-failing warning at `test/recipe/version-1-2.test.ts:50`; build clean) | primary-confirmed, integrated.md + phase-R1.md |
| Scoped coverage | pass (exit 0; 95.01% stmts / 85.8% branches / 98.36% funcs / 94.82% lines; gate 80%) | primary-confirmed, integrated.md |
| Goldens determinism | pass (exit 0; 1 file / 5 tests) | primary-confirmed, integrated.md |
| `node scripts/rubric-report.mjs` | pass (7 assets / 14 passes, mean 3.82 `pass`, `gemini-3.5-flash-lite`) | primary-confirmed, integrated.md |
| `test/art/scores.json` SHA-256 | unchanged `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` | primary + reviewer cross-check |
| `test/goldens/fixtures/hero.sha256` | unchanged `A8FE8F44E481512998C45E6FCD384002F01AF4ED9B969DA52C6141E133F7ED62` | primary + reviewer cross-check |
| Double render | A=B for frame PNG `7c0c9b38…b559`, sheet PNG `6189229c…f045`; Phase 2 point-in-time meta `81592ec3…13dd0` / `92fe07c5…ce17`, R1 after design/parts `2b066598…49731` / `a03e7936…68d2`; raster digests unchanged | primary-confirmed, integrated.md + phase-R1.md |
| Code delta | 20 files, +1147/−24 in review range; R1 adds 9 files within expanded Touches | reviewer `git diff --stat`/`--name-only`, primary |
| Checkpoints | `5cc6103`, `be67c03`, `37e4223`, `2a4ca4e` are real commits | reviewer `git log`/`git show`, primary `git rev-parse` |
| Reviewer `needs` | none | reviewer report |

## Requirements

FR-1..FR-8, NFR-1..NFR-4 and AC-1..AC-11 are fully covered by the phase evidence, integrated matrix and R1 fixes; the round-1 qualifications (FR-4/AC-4 strict gating, FR-1/FR-2 test-file annotation, FR-3/FR-7 golden design) were resolved in R1.

## Findings

### Critical / High

None.

### Medium

- **F1 — RESOLVED in R1 (checkpoint `2a4ca4e`)** — `src/cli/commands.ts:43,1145-1152`: `lintCompiledFrames` is never imported by the render path; `runRender`'s findings come from `lintCompiled(result.compiled, ...)` (frame 0 only) and the sheet is written before the strict gate runs. A framed recipe with a warning confined to frame 1+ therefore does not gate under `--strict` and can still write `<stem>.sheet.png` / `<stem>.sheet.meta.json`. Root cause: AC-4 was satisfied at unit level but not end to end. Fix: report all-frame findings from `runRender` (via `lintCompiledFrames` over `compileRecipeFrames(effective)`) and suppress sheet artifacts when `args.strict && lintBlocks(findings, true)`; add an integration test that renders a framed recipe with a frame-1 warning under `--strict`, asserting exit 3 and no sheet files. Requirement: FR-4 / AC-4. Test gap: integration test through `runCli`. **Fix applied in R1:** `runRender` now reports `lintCompiledFrames(compileRecipeFrames(effective), lintBackdrop)` and suppresses sheet artifacts under strict; two `runCli` tests assert exit 3, `frame === 1` and no sheet files. Primary scoped run 3 files / 25 tests green.

### Low

- **F2 — RESOLVED in R1 (checkpoint `2a4ca4e`)** — `test/recipe/version-1-4.test.ts:1-206`: the dedicated 206-line v1.4 test file is outside every vitest project include, so only the mirrored unit assertions execute in CI. Disclosed honestly in `integrated.md` Deviations and `phase-1.md`; residual debt, not a correctness defect. Fix: add a header comment stating it is not executed by CI, or fold assertions fully into the in-scope unit files and delete it. Requirement: FR-1/FR-2/AC-1/AC-2. Test gap: none. **Fix applied in R1:** header comment added; no assertion changed.
- **F3 — RESOLVED in R1 (checkpoint `2a4ca4e`)** — `test/goldens/fixtures/anim-duo.px.json:1-89`: the original `design` block was removed because `validateIntent` rejects a hierarchy part absent from a `parts` block; the golden therefore does not exercise the "all frames share design" clause. Disclosed in `export-sheet.md`/`phase-2.md`. Fix: optionally add a declared `parts` block with a valid hierarchy and restore a minimal `design` block. Requirement: FR-3/FR-7. Test gap: none. **Fix applied in R1:** declared `body` part + minimal `design` restored with `part: body` on all four ops; primary double render confirmed unchanged raster digests, so no sidecar re-baseline.

## Overrides

None.

## Plan compliance

PASS: three implemented phases plus review-fix R1 all `Status: verified` with Result/Checkpoint/Evidence; 14/14 top-level tasks `[x]` (10 implementation + 4 fix); metadata 4/4 phases and 14/14 tasks, `review_verdict: PASS`, `last_checkpoint: 2a4ca4ebc30941308fcbd88b8a5cfe185135c548`; documented deviations disclosed; integrated.md uses point-in-time HEAD wording consistent with git history. Registry remains `[~]` until completion.

## Out of scope

Onion-skin/playback/interpolation/timeline, tilemaps, GUI, translucent alpha, RNG, npm publish, non-Godot exports, new CLI verb or MCP tool, engine op changes, linter-threshold/rubric/CI changes, `test/art/**`, `scores.json`, archives and earlier golden digests. No out-of-scope finding.

## Debt

No unresolved review debt: F1/F2/F3 were resolved in R1. The pre-existing Biome warning at `test/recipe/version-1-2.test.ts:50` predates the track. `duration` is recorded but not interpreted by design.

## Doc sync

updated — R1 recorded all three fixes in `verification/phase-R1.md` and updated `verification/schema-frames.md` / `verification/export-sheet.md`; no product, tech-stack, guideline, score, golden or archive change was required.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 1 | 2 | 0 |
| 2 (Review Fixes R1) | PASS | 0 | 0 | 0 | 0 | 3 (F1, F2, F3) |
| 3 (round-2 re-review) | PASS | 0 | 0 | 0 | 0 | 0 |

Round-2 reviewer `needs` were all resolved by the primary: protected digests re-computed to `E5CCE080…828D` and `A8FE8F44…ED62`; the pre-squash commits `7864ecf`/`1d1c0de` are no longer ancestors (exit 1 each); HEAD is `1b3e2871801834b6be1eae6c8fd1c21ad3646ca8`. No new finding.
