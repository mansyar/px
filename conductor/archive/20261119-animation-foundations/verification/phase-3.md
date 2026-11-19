# Phase 3 — Closeout decision and integrated record

- Track: `20261119-animation-foundations`
- Phase: 3
- Date: 2026-11-19
- Branch: `feat/20261119-animation-foundations`
- Phase base: `3440a9772d46b4ada3ca9f4c2a48e60d32336d18`
- Head at verification: `3440a97` (phase base; this phase adds only the two evidence files)

## Result

**verified.** Honest closeout **PASS** recorded in `verification/decision.md`. All configured checks pass, scoped coverage is above the 80% gate, Phase 1 and Phase 2 ACs are satisfied, and every protected baseline is unchanged. No forced pass, no re-baseline, no score/digest edit. Two configured commands (`pnpm exec … --coverage`, `node scripts/rubric-report.mjs`) were denied by this subagent shell and are transcribed verbatim from the primary's final checks (RESOLVED BY PRIMARY), consistent with prior phases; no unresolved blocker remains.

## Commands and exit codes

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| Full verify (subagent re-run) | `pnpm verify` | 0 | `tsc --noEmit`; `biome check .` 224 files, one pre-existing non-failing `noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50`; 119 test files / 1041 tests passed; `tsc -p tsconfig.build.json` clean |
| Scoped coverage (primary) | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | 0 | 116 files / 996 tests; All files Statements 95.01% (4021/4232), Branches 85.8% (2671/3113), Functions 98.36% (543/552), Lines 94.82% (3809/4017); gate 80%; benchmarks excluded |
| Goldens (subagent re-run) | `pnpm vitest run --project goldens` | 0 | 1 test file / 5 tests — original hero golden plus new `anim-duo` frame-0 and sheet assertions |
| Rubric (primary) | `node scripts/rubric-report.mjs` | 0 | 7 assets / 14 passes, `mean 3.82 · pass · gemini-3.5-flash-lite` |
| Change scope (subagent re-run) | `git diff --name-only d082eae6b958da29bf67cada67b46d3b3b86684a..HEAD` | 0 | 29 paths, all approved (see Scope proof) |
| Open PRs (primary) | `gh pr list --state open --json number,url` | 0 | `[]` |

## Acceptance criteria

| AC | Evidence | Status |
| --- | --- | --- |
| NFR-1 / AC-10 — no Phase 1 digest change | `scores.json` SHA `E5CCE080…C828D` and `hero.sha256` `A8FE8F44…ED62` unchanged; no `test/art/**`, golden, meta-export/parity, archive or CI change in the diff range | Verified |
| NFR-2 / AC-10 — `pnpm verify` exit 0; coverage ≥80% | `pnpm verify` exit 0 above; scoped coverage Statements 95.01%, Branches 85.8%, Functions 98.36%, Lines 94.82% — all above 80% | Verified |
| NFR-4 — additive version gate, no new dependency, opt-in sheet | Schema `1.4` additive `frames`; no new runtime dependency; sheet artifacts gated on `--export` + non-empty frames (verified in Phase 1/2 ACs) | Verified |
| AC-10 — no tracked changes outside approved scope | 29-path diff enumeration matches Phase 1 Touches + Phase 2 Touches + Conductor state only | Verified |
| AC-11 — honest final pass/fail with evidence; no re-baseline | `verification/decision.md` records PASS with exact commands, exits, digests and limitations; this file carries the snapshot; no score/rationale/digest/golden/archive re-baselined | Verified |
| Phase 1 AC-1..AC-4 + Phase 2 AC-5..AC-9 (referenced) | Checkpoints `5cc6103` and `be67c03`; full `pnpm verify` and goldens re-run green at final HEAD | Verified |

## Golden / digest results

| Artifact | Protected digest | State |
| --- | --- | --- |
| `test/art/scores.json` | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` | unchanged |
| `test/goldens/fixtures/hero.sha256` | `A8FE8F44E481512998C45E6FCD384002F01AF4ED9B969DA52C6141E133F7ED62` | unchanged |
| `test/goldens/fixtures/anim-duo.sheet.sha256` | `6189229cd0b26e818484f8704f5936723e3393e28c3257b7d8dab3ae63f1b045` (committed lower-case) | unchanged; goldens test passes twice |

## Scope proof

`git diff --name-only d082eae6b958da29bf67cada67b46d3b3b86684a..HEAD` returns 29 paths: 5 Conductor state files + 4 prior verification docs, 11 approved Phase 1 Touches, and 13 approved Phase 2 Touches (totals overlap as enumerated in `decision.md`). No `test/art/scores.json`, archive, CI config or `hero.sha256` change. The working tree was clean before this phase.

## Evidence paths

- `conductor/tracks/20261119-animation-foundations/verification/decision.md`
- `conductor/tracks/20261119-animation-foundations/verification/phase-3.md`

## Deviations

- The subagent shell denied `pnpm exec vitest run --coverage …` and `node scripts/rubric-report.mjs` (`permission.rejected`). No workaround was attempted; the primary's verbatim outputs are transcribed above and in `decision.md`. This is the same RESOLVED BY PRIMARY pattern recorded in Phase 1 (`schema-frames.md`, `phase-1.md`) and Phase 2 (`export-sheet.md`, `phase-2.md`).

## Notes

- All checks were re-run or transcribed at final HEAD `3440a97`. `pnpm verify` and `pnpm vitest run --project goldens` were executed directly in the finalization session and reproduced the primary's snapshot exactly.
- Limitations disclosed in `decision.md`: no new CLI verb or MCP tool; no onion-skin viewer, playback/interpolation, timeline, tilemap, GUI, translucent alpha, RNG, npm publish or non-Godot export; the one lint warning pre-dates this track and was left untouched.
- No state file, plan, spec, golden, score, archive or CI config was edited by this phase.

## Primary verification (conductor-implement)

- Date: 2026-11-19. Working tree clean at verification time.
- Range `3440a9772d46b4ada3ca9f4c2a48e60d32336d18..HEAD` contains exactly the single reported commit `deaf89e`, no merge or user commits; both changed paths are the two in-Touches evidence files (`verification/decision.md`, `verification/phase-3.md`). Squash guard eligible.
- Zero unresolved `PENDING PRIMARY` cells in either evidence file; `phase-3.md` Result is `verified`; `decision.md` records an honest **PASS** with Phase 1/2 checkpoints `5cc6103`/`be67c03`.
- Primary re-ran `pnpm verify`: exit 0 — 119 test files / 1041 tests, build clean, one pre-existing non-failing warning at `test/recipe/version-1-2.test.ts:50` (outside Touches).
- Primary final-check results at phase base (already supplied to the subagent and transcribed verbatim): scoped coverage exit 0 with 95.01% statements / 85.8% branches / 98.36% functions / 94.82% lines (all above the 80% gate); goldens exit 0 (1 file / 5 tests); rubric report exit 0 (`mean 3.82 · pass · gemini-3.5-flash-lite`); `scores.json` `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` and `hero.sha256` `A8FE8F44E481512998C45E6FCD384002F01AF4ED9B969DA52C6141E133F7ED62` unchanged; 29-path diff limited to Conductor state plus approved Phase 1/2 Touches; zero open PRs.
- NFR-1, NFR-2, NFR-4, AC-10 and AC-11 are satisfied. Phase 3 accepted; squash to one conventional commit.

