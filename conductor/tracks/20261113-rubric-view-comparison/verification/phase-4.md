# Phase 4 — Rubric Outcome and Checks: Verification

**Status:** verified
**Date:** 2026-11-13

## Claim

`docs/rubric.md` states the measured outcome rather than the single-asset anecdote,
and the repository passes its checks.

## Change

The Method section's pass-2 rationale keeps the original 16 px finding and adds the
2026-11-13 measurement at 32 and 48 px: chest moved 1.0 on `edge_language` and
`palette_craft`, humanoid 1.5 on `cluster_discipline` and 1.0 on `lighting`, mean
|Δ| 0.42 and 0.58 against a 0.25 tolerance, and `1x` scored *higher* than the debug
sheet on chest `edge_language`. The conclusion is unchanged — `1x` stays refused at
every size — but it now rests on a pre-registered comparison at the sizes where the
old rule could have been wrong, and the evidence path is cited.

The scoring-path table gains a `method` row, so a calibration measurement that never
touches `scores.json` is not confused with an asset pass.

## Checks

```sh
pnpm verify        # 95 files, 861 tests, typecheck, lint, build — exit 0
git diff --exit-code test/art/scores.json   # no output
git diff --stat test/art                    # no output
```

## Covers

FR-5, FR-6, AC-5, AC-7.
