## Summary

This track re-authored the two assets that still had `lighting=2` floor failures
(humanoid A/B and scene A) under the inherited `gemini-3.5-flash-lite` instrument
of record. All three original lighting failures cleared after the recipes were
unified under a single top-left light, humanoid A regressed on `edge_language`
and `palette_craft`, and the four affected passes were machine-re-scored via
`scripts/rubric.mjs`. The scorer-recomputed gate is honestly `fail` at mean 3.73
(threshold 3.5 cleared, floor clause binds on two humanoid A criteria); the user
authorized ACCEPT of that fail under "Close on flash-lite". No pass was forced,
no score or rationale was hand-edited, and the ten unaffected passes are
byte-identical.

## Track

- **ID:** `20261118-gate-close-flash-lite`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261118-gate-close-flash-lite/spec.md`](conductor/archive/20261118-gate-close-flash-lite/spec.md)
- **Plan:** [`conductor/archive/20261118-gate-close-flash-lite/plan.md`](conductor/archive/20261118-gate-close-flash-lite/plan.md)
- **Review:** [`conductor/archive/20261118-gate-close-flash-lite/review.md`](conductor/archive/20261118-gate-close-flash-lite/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Re-author the two target recipes and re-render faithful artifacts | Unify humanoid and scene lighting under a single top-left direction | verified | `051ada7` | Humanoid: removed 3 dormant `facing` declarations and added one top-left `light` before `auto_outline`. Scene: removed the two opposing `roof_left`/`roof_right` facings so both slopes share the existing light (12 parts retained). Strict-clean new digests; five other v2 assets and seven v1 originals byte-identical. |
| 2: Re-score the four affected passes and recompute the verdict | Machine-re-score humanoid A/B and scene A/B on flash-lite | verified | `c78f022` | Scorer wrote all four passes (`model=gemini-3.5-flash-lite`); three lighting=2 failures cleared, humanoid A regressed edge 3ΓåÆ2 and palette 3ΓåÆ2. Verdict recomputed: `fail`, mean 3.73, 2 failures. Ten unaffected passes verified JSON-identical (`unaffected_checked=10 diffs=0`). |
| 3: Record the honest gate decision | Document the verdict and an explicit invest/accept decision | verified | `9a8635c` | `gate-decision.md` records the honest fail and the user-authorized ACCEPT; no forced pass or re-roll. |
| R1: Review Fixes | Resolve round-1 Low finding F1 | verified | `261aca9` | Appended one clarification to `instrument.note` explaining that `scored_at` / `instrument.date` preserve the 2026-11-17 asset-set date while the four passes were re-scored on 2026-11-18; guarded dates and all scores/rationales untouched. |

## Requirements

- [x] `FR-1` ΓÇö humanoid A/B lighting ΓëÑ 3 on flash-lite (evidence: `verification/recipe-changes.md`, `test/art/scores.json`)
- [x] `FR-2` ΓÇö scene A lighting ΓëÑ 3 with a single top-left gable light (evidence: `verification/recipe-changes.md`)
- [x] `FR-3` ΓÇö strict-clean faithful re-render with updated digests (evidence: `verification/phase-1.md`)
- [x] `FR-4` ΓÇö four passes machine-re-scored (evidence: `verification/rescore.md`)
- [x] `FR-5` ΓÇö honest verdict recompute with explicit decision (evidence: `verification/gate-decision.md`)
- [x] `FR-6` ΓÇö the five other assets byte-identical (evidence: `verification/phase-1.md`, `verification/integrated.md`)
- [x] `NFR-1` ΓÇö flash-lite only, no cross-instrument comparison
- [x] `NFR-2` ΓÇö no hand-edited scores/rationales; metadata-only honesty edits recorded
- [x] `NFR-3` ΓÇö no new dependencies; existing registered ops only
- [x] `NFR-4` ΓÇö `pnpm verify` + 80% coverage green
- [x] `NFR-5` ΓÇö credentialed scoring primary-run, credential never printed
- [x] `NFR-6` ΓÇö reproducible digest/command evidence
- [x] `AC-1` ΓÇª `AC-7` ΓÇö all covered (see `review.md`)

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| typecheck + lint + unit/integration/smoke + build | `pnpm verify` | pass (119 files / 1028 tests; 1 pre-existing non-failing Biome warning at `test/recipe/version-1-2.test.ts:50`) | `conductor/archive/20261118-gate-close-flash-lite/verification/integrated.md` |
| coverage (80% gate) | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | pass (95.02 / 85.72 / 98.33 / 94.82%) | `conductor/archive/20261118-gate-close-flash-lite/verification/integrated.md` |
| quality instrument | `node scripts/rubric-report.mjs` | pass (gate honestly `fail`, mean 3.73, `gemini-3.5-flash-lite`) | `test/art/scores.json` |

## Review

- **Verdict:** `PASS` (after review-fix round 1)
- **Rounds:** 1 review-fix round
- **Fixed:** 1 finding (F1 ΓÇö Low, metadata clarification only)
- **Accepted/deferred:** 0 (all findings resolved; authorized deviations recorded below)

## Deviations and risks

- **Humanoid byte-identity waiver:** the prior track protected the humanoid v2
  recipe; this track explicitly releases that protection for humanoid only, per
  the user's "Close on flash-lite" directive. All other v2 assets and all seven
  v1 originals remain byte-identical.
- **Inherited instrument:** all scoring stays on `gemini-3.5-flash-lite`, the
  instrument of record promoted in the previous track after the frozen
  `gemini-4-hydrogen` hit its 429 free-tier quota. Scores are NOT comparable to
  the 3.25 hydrogen baseline or the 3.67 prior point-in-time record.
- **Metadata-only honesty edits:** the primary reconciled `scored_by` /
  `verdict.note` (Phase 2) and appended the `instrument.note` date clarification
  (R1). No criterion score, rationale, guarded date, or verdict field was
  hand-edited; all four passes and the structured verdict were scorer-written.
- **Strict-lint roof repair rejected:** three `deriveRamp(base,5)` candidates for
  scene `roof_right` tripped strict lint; the original ramp was retained and the
  opposing facings removed instead.
- **Phase 2 squash skipped:** the range contained a primary honesty-reconciliation
  commit not reported by the subagent, so task commits were retained.

## Follow-ups

- none. A future track may seek `pass` on a restored instrument, which would
  require re-scoring humanoid A's `edge_language` / `palette_craft` above the
  floor; not attempted here (no re-roll, no cross-instrument transfer).

## Rollback

```bash
git revert --no-edit -m 1 <merge-commit>
```

No migration or feature flag. To revert only the art changes, restore
`test/art/v2/humanoid/{humanoid.px.json,humanoid.sha256}` and
`test/art/v2/scene/{scene.px.json,scene.sha256}` plus `test/art/scores.json` from
the parent commit.

