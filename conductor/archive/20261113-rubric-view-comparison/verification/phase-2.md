# Phase 2 — Scoring Mode and Decision: Verification

**Status:** verified
**Date:** 2026-11-13

## Claim

The `--views` mode scores registered artifacts by hash, restores the record even
when every call fails, and computes the verdict from the registered rule rather
than from a human reading.

## Commands and results

### Unusable credential (no credit spent, nothing scored)

```sh
PX_RUBRIC_CREDENTIALS=/nonexistent/creds.json node scripts/calibrate.mjs --views --asset chest
```

Exit code 1. Output: `chest: 1x —/— · 8x —/— · debug —/—`, `Calls: 6 attempted,
6 rejected`, six `unscored:` lines on stderr. `cmp` against the pre-run copy of
`test/art/scores.json`: identical. No `scores-backup.json` left behind.

### Hash guard

```sh
printf 'x' >> .conductor/evidence/views/humanoid/1x.png
node scripts/calibrate.mjs --views --asset humanoid
```

```
calibrate: artifact hash mismatch for humanoid/1x: 887c8d8a… does not match the registered ebb87295…
```

Exit code 1, before any scoring call. After regenerating the views, all six
artifacts verified again (6/6).

### Defect found and fixed during the phase

The run summary line assumed every view in the plan had been scored, so a filtered
run (`--view`, `--repeat`) threw `Cannot read properties of undefined (reading
'repeats')` — after the run itself had finished. The summary and the analyser now
treat an unrequested view as skipped/unscored instead of crashing. The refill path
(`--view … --repeat … --merge-views`) was added in the same phase, because a lost
reply must be replaceable in its own slot rather than costing a fresh round.

## Covers

FR-2, FR-3, FR-4, AC-2, AC-3, AC-4, AC-6.
