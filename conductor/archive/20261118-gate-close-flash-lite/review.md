# Review: Publishable Gate Close

- **Track:** `20261118-gate-close-flash-lite`
- **Type:** feature
- **Branch:** `feat/20261118-gate-close-flash-lite`
- **Range:** `8de763543d60fa2b92e5799dd5cbd6f288932342..0773af1957741cfac8ad467bc035a2cae1acb42f`
- **Date:** 2026-11-18
- **Verdict:** `PASS` (after review-fix round 1 resolved the single Low finding F1)

## Summary

The track is internally consistent and honest. All three original below-floor
`lighting=2` findings (humanoid A/B, scene A) were cleared; humanoid A regressed
to `edge_language=2` and `palette_craft=2`, so the scorer-recomputed verdict is
`fail` at mean 3.73 (threshold 3.5 cleared, floor clause binds). The user
authorized ACCEPT of that honest fail. All 14 passes carry
`model=gemini-3.5-flash-lite`; the four affected passes were machine-written by
`scripts/rubric.mjs`, the ten unaffected passes are JSON-identical to the
pre-track snapshot, the updated design docs match the recipes, and the five
other v2 assets plus seven v1 originals are absent from the diff. The single Low
metadata-staleness finding (F1) was resolved in Review Fixes round 1 under strict
mode; no Critical, High or Medium findings were raised.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `pnpm verify` | pass | 119 files / 1028 tests; one pre-existing non-failing Biome warning at `test/recipe/version-1-2.test.ts:50` (not introduced by this diff) |
| coverage | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | pass | 95.02% stmts / 85.72% branches / 98.33% funcs / 94.82% lines (gate 80%) |
| rubric | `node scripts/rubric-report.mjs` | pass | 7 assets / 14 passes, mean 3.73, `fail`, `gemini-3.5-flash-lite`; independent arithmetic check 313/84 = 3.73 |
| score diff | primary diff script | pass | `unaffected_checked=10 diffs=0` |

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1 | P1.T1 | `verification/rescore.md` §4 (humanoid A/B lighting 2→3) | covered |
| FR-2 | P1.T2 | `verification/rescore.md` §4 (scene A lighting 2→3) | covered |
| FR-3 | P1.T1/P1.T2 | digests + `phase-1.md` (strict-clean double render) | covered |
| FR-4 | P2.T2 | four machine-written passes in `scores.json` | covered |
| FR-5 | P3.T1 | `gate-decision.md` §2–§4 (honest fail + ACCEPT) | covered |
| FR-6 | P1.T3 | digest table in `recipe-changes.md`; absent from diff | covered |
| NFR-1 | P2.T2/P3.T2 | all 14 `model=gemini-3.5-flash-lite`; non-comparability recorded | covered |
| NFR-2 | P2.T3/P2 metadata reconciliation | no score/rationale hand-edited; metadata-only honesty edits | covered (F1) |
| NFR-3 | P1.T1/P1.T2 | no manifest change; existing ops only | covered |
| NFR-4 | integrated verification | `pnpm verify` + scoped coverage | covered |
| NFR-5 | P2.T2 | primary-run credentialed scoring with backoff; no instrument switch | covered |
| NFR-6 | P1/P2/P3 evidence | exact commands, digests and paths recorded | covered |
| AC-1..AC-7 | P1.T1–P3.T2 | per-phase verification files + plan Result blocks | covered |

## Findings

### Critical

- <none>

### High

- <none>

### Medium

- <none>

### Low

- **F1 — stale scoring date metadata**
  - **File:** `test/art/scores.json:5` (`scored_at`) and `:28` (`instrument.date`)
  - **What:** both read `2026-11-17`, the original asset-set scoring date, while
    the four affected passes were machine-re-scored on 2026-11-18. The scorer
    only sets `scored_at` on record creation and never refreshes it on
    `--replace`; the primary's metadata pass updated `scored_by` and
    `verdict.note` but not these two fields.
  - **Why:** a consumer sees a scoring timestamp one day earlier than the actual
    re-score. Minor metadata staleness; no criterion score, rationale or verdict
    is affected.
  - **Fix:** per NFR-2's metadata-only allowance, append a clarification to the
    existing `instrument.note` stating that `scored_at` / `instrument.date`
    intentionally preserve the original 2026-11-17 asset-set scoring date and
    that the four gate-close passes were machine-re-scored on 2026-11-18. Do NOT
    change `instrument.date` to 2026-11-18: `test/art/rubric.test.ts:212` guards
    it at `2026-11-17` as the asset-set date. Record the resulting `scores.json`
    SHA-256 in `verification/phase-R1.md`.
  - **Requirement:** NFR-2
  - **Test gap:** none
  - **Status:** RESOLVED in Review Fixes round 1 — the clarification was appended
    to `instrument.note` via the NFR-2 metadata-only allowance; guarded dates and
    all scores/rationales untouched. `verification/phase-R1.md` checkpoint `261aca9`.

## Overrides

- <none>

## Plan compliance

All three phases are verified with Result / Checkpoint / Evidence blocks
(`051ada7`, `c78f022`, `9a8635c`); all 8 top-level tasks are `[x]` and were
implemented; no task was silently dropped. The diff stays within the union of
the phases' Touches. Recorded deviations: humanoid byte-identity waiver,
metadata-only `scores.json` reconciliation, rejected strict-lint roof candidates,
and the Phase 2 squash skip (primary commit in range).

## Out of scope

- Restoring a publishable `pass` by further re-rolls or by re-scoring on the
  frozen `gemini-4-hydrogen` instrument — explicitly excluded by the user's
  "Close on flash-lite" directive and by NFR-1.
- Updating the guarded asset-set date fields, which belong to the frozen asset
  set rather than to any re-score event.

## Debt

- <none — F1 was fixed in Review Fixes round 1 under strict mode>

## Doc sync

`updated` — post-review sync records the F1 resolution in `metadata.json`
(`doc_sync: updated`, `review_verdict: PASS`) and in this review's History table.
No product or guideline change was needed; `tech-stack.md` already carries the
2026-11-18 gate-close dated note from the pre-review doc-sync step.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | PASS WITH FINDINGS | 0 | 0 | 0 | 1 | 0 |
| 2 (Review Fixes R1) | PASS | 0 | 0 | 0 | 0 | 1 (F1) |
