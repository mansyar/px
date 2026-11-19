# Closeout decision — Animation Foundations

- Track: `20261119-animation-foundations`
- Phase: 3 (Closeout decision and integrated record)
- Date: 2026-11-19
- Branch: `feat/20261119-animation-foundations`
- Phase base: `3440a9772d46b4ada3ca9f4c2a48e60d32336d18`
- Head at verification: `3440a97` (identical to the phase base; this phase adds only its two evidence files)

## Decision

**PASS.** Version-gated animation foundations — recipe schema `1.4` with an optional `frames` array, deterministic multi-frame compile, per-frame lint, opt-in sprite-sheet export and additive sheet metadata — are implemented and verified. All configured checks pass, scoped coverage is comfortably above the 80% gate, every Phase 1 and Phase 2 acceptance criterion is satisfied, and all protected baselines (frame-0 and sheet bytes, `test/art/scores.json`, `hero.sha256`, existing goldens, meta-export/parity assertions, archived tracks and CI config) are unchanged. No pass was forced, no golden was re-baselined, and no score, rationale or digest was edited.

This is an honest decision derived from measured output; every command, exit code and digest below is real primary-session or final-session output, not an assertion.

## Phase checkpoints

| Phase | Checkpoint | Result |
| --- | --- | --- |
| Phase 1 — Version-gated frame schema and compile | `5cc61039886438e23dca5322e485439ba66ebc23` | verified (AC-1..AC-4, AC-10) |
| Phase 2 — Sheet export, additive metadata, fixture and docs | `be67c0380f297183fad8cb9396eb0f5a908e25c7` | verified (AC-5..AC-10) |
| Phase 3 — Closeout decision and integrated record | this evidence | verified (AC-10, AC-11) |

## Measured evidence (exact commands, exits, digests)

| Layer | Command | Exit | Result (verbatim from primary final checks) |
| --- | --- | --- | --- |
| Full verify (re-run in finalization session) | `pnpm verify` | 0 | 119 test files / 1041 tests passed, build clean, one pre-existing non-failing `noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50` (outside Touches) |
| Scoped coverage | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | 0 | 116 files / 996 tests; All files Statements 95.01% (4021/4232), Branches 85.8% (2671/3113), Functions 98.36% (543/552), Lines 94.82% (3809/4017); gate 80%; benchmarks excluded |
| Goldens (re-run in finalization session) | `pnpm vitest run --project goldens` | 0 | 1 test file / 5 tests — the original hero golden plus the new `anim-duo` frame-0 and sheet assertions |
| Rubric | `node scripts/rubric-report.mjs` | 0 | 7 assets / 14 passes, `mean 3.82 · pass · gemini-3.5-flash-lite` |
| Protected score digest | `test/art/scores.json` SHA-256 | unchanged | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` |
| Protected golden digest | `test/goldens/fixtures/hero.sha256` | unchanged | `A8FE8F44E481512998C45E6FCD384002F01AF4ED9B969DA52C6141E133F7ED62` |
| Change scope | `git diff --name-only d082eae6b958da29bf67cada67b46d3b3b86684a..HEAD` | 0 | 29 paths (listed below), all Conductor state/verification or approved Phase 1/2 Touches |
| Open PRs | `gh pr list --state open --json number,url` | 0 | `[]` |

Re-run confirmation in the finalization session: `pnpm verify` → exit 0 with the counts above, and `pnpm vitest run --project goldens` → exit 0 with 1 file / 5 tests. These independently reproduce the primary's snapshot values.

## Scope proof

The range `d082eae6b958da29bf67cada67b46d3b3b86684a..HEAD` contains 29 paths:

- Conductor state/verification: `conductor/tracks.md`, `conductor/tracks/20261119-animation-foundations/{index.md,metadata.json,plan.md,spec.md}` and `verification/{schema-frames.md,phase-1.md,export-sheet.md,phase-2.md}`.
- Approved Phase 1 Touches: `src/core/recipe/{types.ts,normalize.ts,serialize.ts}`, `src/core/compile.ts`, `src/lint/{types.ts,index.ts}`, `test/recipe/version-1-4.test.ts`, `test/unit/{recipe.test.ts,compile.test.ts}`.
- Approved Phase 2 Touches: `src/cli/{commands.ts,main.ts}`, `src/meta/index.ts`, `src/mcp/tools.ts`, `docs/animation.md`, `test/goldens/fixtures/anim-duo.{px.json,sha256,sheet.sha256}`, `test/goldens/render.test.ts`, `test/mcp/{meta-export.test.ts,parity.test.ts}`.

No `test/art/scores.json`, archive, CI config or `hero.sha256` change appears in the range. This phase adds only `verification/decision.md` and `verification/phase-3.md`.

## Disclosed limitations

- No new CLI verb or MCP tool was added; framed export is triggered solely by the existing `--export` flag.
- No onion-skin viewer, playback runtime, frame interpolation, event/animation timeline, tilemap, GUI surface, translucent alpha, RNG, npm publishing or non-Godot export — all remain deferred Phase 2/out-of-scope work.
- `duration` is recorded in metadata but never interpreted; playback semantics are future work.
- The single `noNonNullAssertion` lint warning at `test/recipe/version-1-2.test.ts:50` pre-dates this track, is non-failing and lies outside the approved Touches; it was deliberately left unchanged.

## Honesty / provenance

In this subagent shell, `pnpm exec vitest run --coverage …` and `node scripts/rubric-report.mjs` returned `permission.rejected`; no workaround was attempted. The primary ran those exact commands and supplied the outputs transcribed above. This mirrors the RESOLVED BY PRIMARY history recorded in Phase 1 and Phase 2 evidence. No score, rationale, digest, golden, archive or CI value was re-baselined or hand-edited to reach this PASS.

## Evidence paths

- `conductor/tracks/20261119-animation-foundations/verification/decision.md`
- `conductor/tracks/20261119-animation-foundations/verification/phase-3.md`
