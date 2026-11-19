# Phase R1 — Review Fixes (Animation Inspection & Playback) — Evidence

- **Track:** `20261119-animation-playback`
- **Phase:** R1 (Review Fixes) — finding F1 only
- **Date:** 2026-11-19
- **Branch:** `feat/20261119-animation-playback`
- **Phase base:** `b69ea4a9a1a8aafa0f75585518580cd7297885fd`
- **Head commit:** `a7aa2ef5b63347cc31c28976325074034d1365a7`
- **Result:** verified (primary re-ran the two commands denied to the phase executor; all four checks pass)

## F1 — what changed

The render envelope reported frame-0 canvas dimensions for every view. For
`--onion`, the emitted sibling PNG is a 3-panel strip (`ONION_PANELS`), so a
machine client sizing the returned image from `width` misread a 48x16 strip as
16x16. Root cause fixed in `src/cli/commands.ts` (payload `width` now
`result.width * ONION_PANELS` when `view.kind === 'onion'`); `height`, the
`view` payload, PNG bytes, golden digests and envelope keys are unchanged.

Test-first was confirmed: before the fix, the new parity assertion failed with
`AssertionError: expected 16 to be 48` at `test/mcp/parity.test.ts` (envelope
width 16 vs sibling PNG IHDR width 48) — the intended reason.

## Commands

| # | Layer | Command | Exit | Summary |
|---|-------|---------|------|---------|
| 1 | full verify | `pnpm verify` | 0 | typecheck, lint (1 pre-existing unrelated warning in `test/recipe/version-1-2.test.ts`), 120 files / 1057 tests pass, build. Test-first run of this same command (pre-fix) exited 1 with the intended F1 assertion failure. |
| 2 | scoped tests | `pnpm exec vitest run test/mcp/parity.test.ts test/cli/onion.test.ts test/goldens/render.test.ts` | denied | Permission layer denied to the phase executor. Intent fully covered by command #1 (`pnpm verify` runs `vitest run` over the whole suite, including all three named files, 1057/1057 passing). Primary should re-run to record the scoped exit. |
| 3 | protected baseline hash | `Get-FileHash -Algorithm SHA256 test/art/scores.json` | denied | Permission layer denied to the phase executor (same command was denied to earlier phase subagents and re-run by the primary). `scores.json` does not appear anywhere in the base..HEAD diff (command #4), so it is byte-identical to the committed baseline; the recorded SHA-256 is `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`. Primary should re-run to record the direct hash. |
| 4 | scope proof | `git diff --name-only b3f984f49374b8ba394afa4d3a708f4a93af67ca..HEAD` | 0 | Lists only active-track source/tests/docs and Conductor state. No protected path appears: no `hero.sha256`, `anim-duo.sha256`, `anim-duo.sheet.sha256`, `test/art/scores.json`, `package.json`, `pnpm-lock.yaml`, archive or CI config. The only golden fixtures in the list are the two pre-existing onion sidecars (`anim-duo.onion0.sha256`, `anim-duo.onion1.sha256`), unchanged by R1. |

## Acceptance criteria (F1)

| ID | Criterion | Evidence | Status |
|----|-----------|----------|--------|
| F1-a | Onion envelope `width`/`height` equal emitted sibling PNG IHDR dimensions (48x16 for anim-duo) | `test/mcp/parity.test.ts` onion test: IHDR reads `readUInt32BE(16)==48`, `readUInt32BE(20)==16`, envelope matches; `pnpm verify` green | pass |
| F1-b | Normal (non-view) render still reports frame-0 dimensions (16x16) | `test/mcp/parity.test.ts` framed-export test asserts envelope width/height equal frame-0 PNG IHDR (16x16); `pnpm verify` green | pass |
| F1-c | No byte/digest/envelope-key change | Diff limited to one envelope field expression + regression assertions; command #4 scope proof clean | pass |

## Evidence paths

- `src/cli/commands.ts` — envelope `width` fix.
- `test/mcp/parity.test.ts` — F1 regression assertions.
- Commit `a7aa2ef` — `fix(cli): report emitted strip width in onion render envelope`.

## Deviations

None. Touches limited to the three allowed files.

## Notes

- The pre-existing Biome warning in `test/recipe/version-1-2.test.ts:50` is
  unrelated and does not fail `pnpm verify`.
- Two verification commands (#2, #3) were denied by the phase-executor
  permission layer and are listed in `blockers`; the primary re-ran both (below).
  All executable checks passed.

## Primary verification

Primary independently verified Phase R1 at its final HEAD (`469e915`), without
trusting the subagent's `blocked` status:

| Check | Command | Exit | Result |
| --- | --- | --- | --- |
| Clean tree | `git status --porcelain` | — | Empty (no unstaged/staged changes) |
| Conventional commits | `git log --oneline b69ea4a..HEAD` | 0 | `a7aa2ef fix(cli): ...`, `469e915 docs(verify): ...` |
| Full verify | `pnpm verify` | 0 | typecheck → lint → 120 files / 1057 tests → build; only the pre-existing warning in `test/recipe/version-1-2.test.ts:50` |
| Scoped tests (blocker #2 resolved) | `pnpm exec vitest run test/mcp/parity.test.ts test/cli/onion.test.ts test/goldens/render.test.ts` | 0 | 3 files / 19 tests pass |
| Scores hash (blocker #3 resolved) | `Get-FileHash -Algorithm SHA256 test/art/scores.json` | 0 | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` — matches baseline |
| Scope proof | `git diff b69ea4a..HEAD -- src/cli/commands.ts test/mcp/parity.test.ts` | 0 | Only the intended one-line envelope fix (with explanatory comment) and the two regression assertion blocks; no PNG bytes, golden digests, envelope keys or other files touched |

F1 acceptance criteria F1-a/b/c all confirmed. The fix is root-cause and
additive-safe: only the `width` value for the onion view changes; `height`,
PNG bytes, `sha256`/`bytes`/`out` semantics, envelope `v:1` keys and the `view`
payload are unchanged. No protected baseline, golden fixture, score, archive,
CI config, dependency or tool changed. R1 accepted.
