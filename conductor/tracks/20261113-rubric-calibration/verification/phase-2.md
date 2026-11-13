# Phase 2 — Harness and Report: verification

**Date:** 2026-11-13
**Covers:** FR-3, FR-4, FR-5, AC-2, AC-7

## Result: verified

`scripts/calibrate.mjs`, exposed as `pnpm rubric:calibrate`. It scores every
variant through `scripts/rubric.mjs` (pass A on the 8× artifact, pass B on the
debug sheet), reads each pass back out of the record, computes the verdict, and
writes `report.json` and `report.md` under `.conductor/evidence/calibration/`.

## Record safety

The scorer writes only to `test/art/scores.json`, so the harness:

1. restores `scores-backup.json` if a previous run was killed before its `finally`;
2. snapshots the current bytes and writes the backup before the first call;
3. restores the original bytes in a `finally`, then compares them byte-for-byte
   and sets a non-zero exit if they differ;
4. deletes the backup only after the comparison.

Evidence that it works:

- A smoke run with an unusable credential marked all four lighting calls
  `unscored`, wrote the report, and left `test/art/scores.json` byte-identical
  (`git diff` 0 lines, hash unchanged).
- That smoke run also exposed two harness defects, both fixed: it exited 0 with
  every criterion unscored, and its retry message reported the budget rather than
  the attempts actually made. It now exits 1 and names the criteria.
- Every real run afterwards restored the record: `git diff test/art/scores.json`
  returned 0 lines after 52 scoring calls.

## Verdict model

FR-5 named three verdicts but `saturated` describes the ceiling, not separation,
and `lighting` separates 1 against 3 while never exceeding 3. Spec amendment A1
records the change: the verdict reports separation (`separates` / `ambiguous`) and
`saturated` and `anchor4` are independent facts. No threshold moved.

## Operations

`--only <criterion>` limits a run; `--merge` folds the result into the existing
report; `--recompute` re-derives verdicts from recorded scores without calling the
model. `--merge --only edge_language` was used when one pass lost four consecutive
replies to malformed output, at a cost of four calls instead of a full round.

## Cost

| round | calls | notes |
| --- | --- | --- |
| v1 stimuli | 24 | 5 replies rejected and retried within the budget |
| v2 stimuli | 24 | one criterion unscored (edge pass B, 4 attempts) |
| edge re-score | 4 | merged into the v2 report |
| **total** | **52** | amendment A2 raises the budget from 24 to 52 |
