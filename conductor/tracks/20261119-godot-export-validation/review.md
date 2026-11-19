# Review — Godot 4 Export Validation

- Track: `20261119-godot-export-validation` (chore, high)
- Branch: `chore/20261119-godot-export-validation`
- Range: `0ea5c5357985b365e02b860d872e0de5bca93d84..d2c00d39e2683674c214991ec3249d27cdd250fd`
- Date: 2026-11-19T03:20:08Z
- Verdict: **PASS WITH FINDINGS** (one Low finding; strict mode requires a fix before PR)

## Summary

Evidence-only track is honest and internally consistent. The golden hero export is byte-identical to the committed golden, metadata deep-equals `buildMetadata`, and real Godot `4.7.2.stable.mono.official.ed1daf0bf` headless validation printed five `ASSERT ... result=PASS` lines plus `GODOT_VALIDATION=PASS` with empty stderr. The full-canvas 16×16 texture with an 8×8 trim at (4,4), `offset=[-4,-4]`, and pivot local `[4,4]` all reconcile with `src/meta/index.ts`, `src/meta/bounds.ts` and the hero fixture. Two earlier failed runs are correctly disclosed as validator-authoring defects, not product defects; no re-roll or favorable-result fishing occurred. All configured checks are green, the published gate and scores are untouched, and the non-conductor code delta is empty by design. One Low documentation-identification finding remains.

## Verification

| Layer / check | Result | Evidence |
| --- | --- | --- |
| `pnpm verify` | pass (exit 0; 119 files / 1028 tests; one pre-existing non-failing warning at `test/recipe/version-1-2.test.ts:50`; build clean) | primary-confirmed, integrated.md |
| Scoped coverage | pass (exit 0; 95.02% stmts / 85.72% branches / 98.33% funcs / 94.82% lines; gate 80%) | primary-confirmed, integrated.md |
| Goldens determinism | pass (exit 0; 1 file / 2 tests) | primary-confirmed, integrated.md |
| `node scripts/rubric-report.mjs` | pass (7 assets / 14 passes, mean 3.82 `pass`, `gemini-3.5-flash-lite`) | primary-confirmed, integrated.md |
| `test/art/scores.json` SHA-256 | unchanged `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` | primary + reviewer cross-check |
| Godot headless V1c | pass (exit 0; five PASS assertions; `GODOT_VALIDATION=PASS`) | `verification/godot-validation.md` §1c/§4 |
| Code delta | empty: 13 paths, all `conductor/**` | reviewer-run `git diff --name-only` |
| Checkpoints | `18004de1f...f9f`, `9fbbda550...b2`, `a6a9d3d7...3d6` are real commits | reviewer `git show`; primary `git cat-file -t` / `git rev-parse` for all three |

## Requirements

FR-1..FR-7, NFR-1..NFR-6 and AC-1..AC-8 are all covered by the phase evidence and integrated matrix. No requirement is missing or partial. NFR-4 (exact evidence) has one Low presentation finding (F1); NFR-5 (no re-roll/fishing) is satisfied because the two early failures were validator-authoring defects corrected before the first clean run.

## Findings

### Critical / High / Medium

None.

### Low

- **F1** — `verification/integrated.md:57,66` (`conductor/tracks/20261119-godot-export-validation/verification/integrated.md`): the first failed Godot run is labelled `V1a` here, but `V1` in `godot-validation.md:22` and `decision.md:63`, and `first run` in `phase-1.md:24`. Substance is identical (GDScript Variant-inference parse error at lines 37/38/109); only the run identifier differs. Why: in an evidence-only track built for precise auditable run identification, this can make a reader unsure whether `V1` and `V1a` are separate executions. Fix: standardize one label across `integrated.md`, `godot-validation.md`, `decision.md` and `phase-1.md`, keeping `V1b`/`V1c` intact. Requirement: NFR-4. Test gap: none.

## Overrides

None.

## Plan compliance

PASS. Three implemented phases, all `Status: verified` with Result/Checkpoint/Evidence blocks; 9/9 tasks `[x]`; metadata 3/3 phases and 9/9 tasks. All three phase checkpoints resolve to real commits. Per-phase primary-verification blocks cite pre-squash SHAs with squash notes, consistent with `git.phase_squash: true`. Registry `[~]` matches the pre-review in-progress state.

## Out of scope

Product behavior, engine/CLI/MCP/op/linter/rubric/CI changes, score/recipe/golden edits, GUI import, other Godot versions, and the other six v2 assets. No out-of-scope discovery.

## Debt

None introduced. Accepted limitations (empty-trim assets, other Godot versions, GUI import, other v2 assets) are recorded as scope limits in `decision.md`, not as passes. The pre-existing Biome warning at `test/recipe/version-1-2.test.ts:50` predates this track.

## Doc sync

pending — post-review sync will update this line after F1 is fixed and the final review round is recorded.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 1 | 0 |
