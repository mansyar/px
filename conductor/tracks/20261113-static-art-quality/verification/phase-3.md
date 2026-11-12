# Phase 3 — Scale Profiles (verification)

- Track: `20261113-static-art-quality`
- Branch: `feat/20261113-static-art-quality`
- Phase base: `9c332cb`
- Head: `1667352` (+ this evidence file)
- Date: 2026-11-13

## Tasks

| Task | Status | Commit | What landed |
| --- | --- | --- | --- |
| P3.T1 | done | `2991a94` | `src/core/profile.ts`: `ScaleProfile`, the frozen `PROFILES` table, `profileFor`, `profileNumbers`, `profileNumbersFor`, `parseScaleProfile` (`E_PROFILE_UNKNOWN`), `profileWarnings` (`W_PROFILE_MISMATCH`). `meta.profile` parsed, validated, serialized only when declared; `CompiledRecipe.profile` carries the resolved regime. |
| P3.T2 | done | `19340fa` | `lintNumbers(context)` + `src/lint/context.ts`; `JAGGY_LINE`, `ORPHAN_PIXEL` and `LOW_CONTRAST` read every number (and put it in the message) from the profile row. |
| P3.T3 | done | `e45d994` | Debug sheet zooms 8×/4×/2× by profile, ruler labels every 32 device pixels, caption names regime + zoom, `DebugSheet` reports `profile`/`zoom`. |
| P3.T4 | done | `1667352` | `docs/art-profiles.md` (new) and the `docs/lint-thresholds.md` corrections listed under deviations. |

## Gates

Both run on the final tree, exactly as the brief names them.

```
$ pnpm verify
$ tsc --noEmit
$ biome check .
Checked 120 files in 128ms. No fixes applied.
$ vitest run
 Test Files  56 passed (56)
      Tests  496 passed (496)
$ tsc -p tsconfig.build.json
exit 0
```

```
$ pnpm vitest run --coverage
 Test Files  56 passed (56)
      Tests  496 passed (496)
Statements   : 95.09% ( 1705/1793 )
Branches     : 87.38% ( 1081/1237 )
Functions    : 99.23% ( 259/261 )
Lines        : 94.92% ( 1627/1714 )
exit 0
```

Coverage moved from 94.99 statements / 87.11 branches to 95.09 / 87.38. The 80 %
thresholds in `vitest.config.ts` are untouched; `src/core/profile.ts` is fully
covered and therefore not printed by the text reporter.

## Compatibility (the phase's hard constraint)

`git diff --stat 9c332cb..HEAD -- test/` shows four **added** files
(`test/profiles/{profile,override,scale,sheet}.test.ts`) and **no modified test
file**. 457 tests became 496: 39 added, none edited.

That is the evidence that `small` reproduces today's numbers exactly. The four
existing suites that would have caught drift run unmodified:

- `test/lint/shape.test.ts`, `test/lint/rules.test.ts`, `test/lint/framework.test.ts`
  — same findings, same coordinates, same message text.
- `test/benchmarks/thresholds.test.ts` — still imports `JAGGY_MIN_RUNS`,
  `JAGGY_MAX_RUN`, `JAGGY_STEP_JUMP`, `LOW_CONTRAST_MIN_RATIO` from
  `src/lint/thresholds.ts` and still calls `hasKink(steps)` with one argument.
- `test/lint/debug-sheet.test.ts` — 8× geometry, ruler band, anchors, checkerboard
  and panel B/C unchanged.
- `test/benchmarks/benchmarks.test.ts` — all four benchmark replays still end in a
  `--strict` render whose `findings` is exactly `[]`, with `tiny` (potion, 16 px)
  and `small` (sword 32, humanoid 32, chest 48) — the potion's `auto_outline` edge
  is `#1a1024` on `#808080`, ratio ≈ 4.65, clearing tiny's stricter 2.0 floor.

## Digests and envelopes

- Hero: `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb`
  — unchanged, asserted by `test/goldens/render.test.ts` against the untouched
  `test/goldens/fixtures/hero.sha256`, and by "is stored in canonical form".
- The four benchmark recipes and PNGs are untouched (`git diff --stat` lists no
  file under `test/benchmarks/`), and their committed sha256 assertions pass.
- No envelope key set changed. `src/render/debug/sheet.ts` gained fields on its
  own `DebugSheet` return type, but `src/cli/commands.ts` still projects the debug
  payload as `{out, width, height, bytes, sha256}`, so
  `test/lint/feedback-cli.test.ts`'s exact key list and
  `test/parts/surface.test.ts`'s frozen inspect key list both still pass. The
  caption is drawn inside the sheet, not reported through the envelope.
- `W_PROFILE_MISMATCH` reaches the existing `warnings` arrays through
  `parseRecipe`, so no surface needed a new key.

## AC coverage

- **AC-11** — `profileFor` returns `tiny` at 16, `small` at 48, `medium` at 128,
  `large` at 256, and the boundaries are inclusive on the lower regime; asserted in
  `test/profiles/profile.test.ts` alongside the longest-side rule (48×8 is
  `small`, 33×129 is `large`).
- **FR-12** — derivation plus `meta.profile`; every other value in the file is a
  consequence of the row.
- **FR-13** — the eleven numbers are one frozen table. Consumed today:
  `jaggyMinRuns`, `jaggyMaxRun`, `jaggyStepJump`, `orphanRadius`,
  `lowContrastMinRatio` (lint) and `debugZoom` (sheet). `minCluster`,
  `ditherAllowed`, `ditherMinTones`, `outlineWidth` and `toneCount` are carried and
  documented for Phase 5's rules, which is where AC-12 closes; `docs/art-profiles.md`
  lists both sets explicitly.
- **FR-14** — an override that disagrees yields exactly one `W_PROFILE_MISMATCH`
  (`info`), never an error; a matching override yields none; an unknown name throws
  `E_PROFILE_UNKNOWN` whose hint lists the four names. Round-trips stay
  byte-identical with and without the field.

## Behaviour that changed, by design

Only above 48 px, which no committed asset uses:

- the same 8×8 edge is `JAGGY_LINE` at tiny/small and silent at large
  (`test/profiles/scale.test.ts`);
- a grey whose ratio sits between the `medium` and `small` floors is reported at
  tiny/small and silent at medium/large, and the message quotes the floor that
  applied;
- a 256 px sheet gets a 2× panel (769 px) instead of a 2,049 px one.

`orphanRadius` stays 2 in all four rows as the brief pins it: the `bayer_25`
lattice is Chebyshev 2, so the radius is a property of the dither pattern, not of
the canvas. The rule documents this at the point of use and
`docs/art-profiles.md` devotes a section to why the one constant row is not an
oversight.

## Deviations

- `src/lint/thresholds.ts` was rewritten rather than extended. Its constants were
  the table's `small` values under old names, and `test/benchmarks/thresholds.test.ts`
  imports those names, so the file now re-exports `PROFILES.small` field by field
  (`JAGGY_MIN_RUNS`, `JAGGY_MAX_RUN`, `JAGGY_STEP_JUMP`, `ORPHAN_NEIGHBOUR_RADIUS`,
  `LOW_CONTRAST_MIN_RATIO`) and keeps `DEFAULT_BACKDROP_HEX`,
  `LOW_CONTRAST_BACKDROP`, `MAX_FINDINGS_PER_CODE` and `MAX_COORDS_PER_FINDING`.
  No rule reads it.
- `docs/lint-thresholds.md` line 3–13 (intro) said `thresholds.ts` was the only
  place the numbers live — wrong once the table exists, so it now points at
  `src/core/profile.ts` and this phase's doc. Lines 44, 53, 71, 87 and 108 carry
  the per-row values in their headings (`JAGGY_MIN_RUNS` 3 everywhere,
  `JAGGY_MAX_RUN` 3/3/4/6, `JAGGY_STEP_JUMP` 2/2/2/3,
  `LOW_CONTRAST_MIN_RATIO` 2.0/1.5/1.35/1.25, `ORPHAN_NEIGHBOUR_RADIUS` 2
  everywhere) with the `small` value still first, and line 108 gained two bullets
  explaining that the orphan radius is not a scale number. No value in that file
  became untrue without being corrected.
- `test/profiles/**` was added to the `unit` project in `vitest.config.ts` (one
  line); the coverage include list and thresholds are unchanged.

## Notes for review

- `docs/art-profiles.md` deliberately states that `ditherAllowed` does not ban
  `dither_fill` and that `outlineWidth` is a recommendation. Both are recommendations
  the Phase 5 rules read; enforcing them now would change `render --strict` on
  assets that ship a dither at a legitimate size.
- The debug zoom follows an override, so a 256 px recipe that declares `small`
  produces a 2,049 px panel. That is the caller's explicit choice; the ≤ 1,100 px
  bound holds for every derived regime and is asserted for 16/48/128/256.

## Primary verification

Independently re-checked at the squashed checkpoint `f0d7e5c` (phases 3 commits
`9c332cb..HEAD`, five commits, no merges):

| Check | Result |
|---|---|
| Working tree | clean, no untracked files |
| Pre-existing tests modified | none — `git diff --name-only 9c332cb..HEAD -- test/` filtered to non-`test/profiles/` is empty |
| Goldens / benchmarks | `git diff --stat 9c332cb..HEAD -- test/goldens test/benchmarks` empty |
| Scope | every path inside `src/core/`, `src/lint/`, `src/render/debug/`, `docs/`, `test/profiles/`, `vitest.config.ts` or `conductor/` |
| `pnpm verify` | exit 0 (typecheck, biome, **496 tests in 56 files**, build) |
| `pnpm vitest run --coverage` | exit 0 — statements **95.09%** (1705/1793), branches **87.38%** (1081/1237), functions 99.23%, lines 94.92% |

The claim that matters is "no existing test file was edited", because that is what
makes `small` compatibility checkable rather than asserted: 457 pre-existing tests
still pass unmodified against a rule layer that now reads every number from a table.

Design spot-checks rather than trusting the summary:

- `src/core/profile.ts` is pure and O(1), derives from the longest canvas side (so a
  48x256 panel is `large`), freezes every row, and carries the `orphanRadius` warning
  in the table's own docstring rather than only in the docs.
- `src/lint/thresholds.ts` no longer holds values; the old constants are field-by-field
  aliases of `PROFILES.small`, so the names fixtures import cannot drift from the table.
  `MAX_FINDINGS_PER_CODE` and `MAX_COORDS_PER_FINDING` stay here because they are
  response bounds, not art judgement.
- `src/lint/jaggy.ts` reads `lintNumbers(context)` via a `PROFILES` fallback for
  hand-built contexts, so a test that constructs a context without a profile still
  behaves exactly as before.

```text
pnpm verify                              -> 0
pnpm vitest run --coverage               -> 0
git diff --name-only 9c332cb..HEAD -- test/ (excluding test/profiles) -> empty
```
