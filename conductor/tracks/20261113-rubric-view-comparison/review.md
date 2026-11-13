# Review — Rubric View Comparison

- **Track:** `20261113-rubric-view-comparison`
- **Type:** feature
- **Branch:** `feat/20261113-rubric-view-comparison`
- **Range:** `adf5c73..HEAD` (`-- . ':!conductor'`: 3 files, 379 insertions)
- **Date:** 2026-11-13
- **Verdict:** `PASS WITH FINDINGS`

## Summary

The track measures what it said it would: two assets, three views, two repeats,
thirteen calls (twelve plus one refill), and a verdict the harness computes from
the rule committed before the first call. The verdict is `keep 8x and debug`, and
`docs/rubric.md` now states the measurement at 32 and 48 px rather than repeating
one 16 px potion.

No High or Critical finding. Two Medium findings concern the harness's ability to
damage its own evidence: a filtered run could blank a complete report, and an
unscored run could replace the committed one. Both were fixed during the review.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `pnpm verify` | 95 files, 861 tests pass | exit 0 |
| typecheck | `pnpm verify` (`tsc -p tsconfig.build.json`) | pass | exit 0 |
| lint | `pnpm verify` | pass | exit 0 |
| build | `pnpm verify` | pass | exit 0 |
| record integrity | `git diff --exit-code test/art/scores.json` | unchanged | 0 lines |
| hash guard | tampered artifact | aborts before scoring | `verification/phase-2.md` |
| generator determinism | `node scripts/calibrate/views.mjs` | hashes reproduce | `artifacts.json` unchanged |

## Requirements

| ID | Status | Implementation | Verification |
| --- | --- | --- | --- |
| FR-1 | covered | `scripts/calibrate/views.mjs` | six artifacts, hashes in `artifacts.json`; regenerating leaves the registry byte-identical |
| FR-2 | covered | `scripts/calibrate.mjs` `--views` | 13 calls, record byte-identical, refill recorded |
| FR-3 | covered | `writeViews` | per-view means, Δ, exclusions, refills in `views.md`/`views.json` |
| FR-4 | covered | `analyseViews` | verdict printed with blocking reasons; matches the rule |
| FR-5 | covered | `docs/rubric.md` Method | measurement cited, `1x` stays refused |
| FR-6 | covered | diff scope | no asset, score, tier or engine change |
| NFR-1 | covered | generator | deterministic, hashes reproduce |
| NFR-2 | covered | `main()` `finally` + write guard | record restored; committed report protected |
| NFR-3 | covered | run | 13 calls, one refill, four-retry budget respected |
| NFR-4 | covered | credential by reference | no key in repo, args or logs |
| NFR-5 | covered | `pnpm verify` | exit 0 |
| AC-1 | covered | `artifacts.json` committed before calls | 6 entries |
| AC-2 | covered | `views.json` | 12 scores + 1 refill |
| AC-3 | covered | `views.md` | repeats, means, Δ, exclusions |
| AC-4 | covered | `analyseViews` | `keep 8x and debug`, blocking list |
| AC-5 | covered | `docs/rubric.md` | evidence path cited |
| AC-6 | covered | record + asset diff | both empty |
| AC-7 | covered | `pnpm verify` | exit 0 |

## Findings

### F1 — Medium — a filtered run blanks a complete report (fixed)

`scripts/calibrate.mjs:673` — `--view`/`--repeat` without `--merge-views` scored
one slot and wrote a report whose other views were `not scored in this run`,
replacing a finished measurement with a nearly empty one. The track's committed
report is its only record, so this was one mistyped flag away from destroying it.
**Fix:** the mode now refuses to start: `--view and --repeat select single slots;
add --merge-views so the other scores are kept`.

### F2 — Medium — an unscored run replaced the committed report (fixed)

`scripts/calibrate.mjs:538` — the report was written to the track directory before
the unscored check, so a run with a missing credential, or one whose replies all
failed, would commit an empty comparison over the real one.
**Fix:** the evidence copy is always written; the committed copy is written only
when the run is complete, or with an explicit `--replace`. Verified with an
unusable credential: report left untouched, exit 1, message names the reason.

### F3 — Low — the generator left an unregistered duplicate (fixed)

`scripts/calibrate/views.mjs:79` — `1x.8x.png` stayed beside the registered
`8x.png`, an artifact no registry entry describes. **Fix:** removed after the copy;
the evidence directory now holds exactly the three registered views per asset.

### F4 — Low — `--replace` was advertised but unparsed (fixed)

The incomplete-run message offers `--replace`, but `parseArgs` rejected it as an
unknown argument. **Fix:** flag added. Without it the opt-in in F2 would have been
unreachable.

## Plan Compliance

All four phases verified with evidence in `verification/phase-1..4.md`. The
implementation touched only the planned files plus
`conductor/tracks/20261113-rubric-view-comparison/` and `docs/rubric.md`. One
deviation, recorded in phase 2 and phase 3: the refill path
(`--view`/`--repeat`/`--merge-views`) was added because a lost reply must be
replaceable in place rather than at the cost of a new round.

## Out of Scope

- The 16 px case (potion). The rule for assets below 32 px still rests on the
  original round; this comparison says nothing new about it.
- Re-scoring recorded assets.
- Any change to the gate, the tiers or the engine.

## Debt

- The comparison covers two assets. `scene` (256 px) was not measured at 1×; its
  8× artifact is 2048 px and is itself likely resampled by the judge.
- `analyseViews` has no unit test: it is reached only through a networked run, so
  the arithmetic is verified by the committed report rather than by `pnpm test`.

## History

| Round | Verdict | Findings | Fixed |
| --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 2 Medium, 2 Low | F1–F4 in Phase R1 |

## Doc Sync

`updated` — `docs/rubric.md` carries the outcome and the evidence path.
