## Summary

A frozen-instrument diagnostic on the worst asset (chest, 2.50) isolated one
validated craft lever ΓÇö warm/cool hue-stepped ramps plus a single top-left
directional `light` op ΓÇö and applied it to all six below-floor v2 recipes. All 14
passes were machine-re-scored and the publishable gate was recomputed honestly:
mean 3.67 clears the 3.5 threshold, but three remaining below-floor lighting=2
scores keep the floor clause binding, so the gate is `fail`. No pass was forced;
the user made and recorded an explicit ACCEPT decision.

## Track

- **ID:** `20261117-craft-application`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261117-craft-application/spec.md`](conductor/archive/20261117-craft-application/spec.md)
- **Plan:** [`conductor/archive/20261117-craft-application/plan.md`](conductor/archive/20261117-craft-application/plan.md)
- **Review:** [`conductor/archive/20261117-craft-application/review.md`](conductor/archive/20261117-craft-application/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Frozen-instrument craft diagnostic (chest) | Isolate levers that lift lighting/edge/palette to ΓëÑ3 | verified | `fa0e530` | L (warm/cool directional light) is the only lever clearing all three weak criteria on both passes; H partial, E refuted, C non-decisive. Scores on `gemini-4-hydrogen`. |
| 2: Apply validated levers and re-score the gate | Apply L to every below-floor asset and re-score 14 passes | verified | `2b6a7d8` | Prop re-authored per FR-4 despite plan omission; humanoid untouched (FR-7). Frozen instrument hit daily quota; user authorized promotion of `gemini-3.5-flash-lite` to instrument of record ΓÇö all 14 passes re-scored and metadata recorded honestly. |
| 3: Gate decision and record | Recompute verdict and make an explicit invest/accept decision | verified | `d5b2da7` | Honest `fail` (mean 3.67, 3 below-floor); user-authorized ACCEPT recorded in `gate-decision.md`. |
| R1: Review Fixes | Resolve round-1 Low findings F1/F2 | verified | `35057b2` | Test title and generator comment corrected; no assertion or logic change. |

## Requirements

- [x] `FR-1` ΓÇö 2ΓÇô3 chest diagnostic candidates using existing ops (evidence: `verification/diagnostic.md`)
- [x] `FR-2` ΓÇö faithful A/B views for baseline + candidates (evidence: `verification/diagnostic.md`)
- [x] `FR-3` ΓÇö frozen-instrument scoring + per-criterion deltas (evidence: `verification/diagnostic.md`)
- [x] `FR-4` ΓÇö apply measured levers to every below-floor recipe (evidence: `verification/lever-selection.md`)
- [x] `FR-5` ΓÇö re-score all 14 passes via the scorer only (evidence: `test/art/scores.json`)
- [x] `FR-6` ΓÇö honest verdict + explicit ACCEPT decision (evidence: `verification/gate-decision.md`)
- [x] `FR-7` ΓÇö untouched asset digests byte-identical (evidence: `verification/asset-digests.md`)
- [x] `NFR-1` ΓÇö instrument rule (authorized deviation ΓÇö see Overrides)
- [x] `NFR-2` ΓÇö scores machine-generated only
- [x] `NFR-3` ΓÇö no new deps; recipes < ~2000 ops
- [x] `NFR-4` ΓÇö `pnpm verify` + 80% coverage green
- [x] `NFR-5` ΓÇö credential used but never printed
- [x] `NFR-6` ΓÇö reproducible diagnostic evidence
- [x] `AC-1` ΓÇª `AC-6` ΓÇö all covered (see `review.md`)

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit/integration/smoke/goldens + typecheck + lint + build | `pnpm verify` | pass (119 files / 1028 tests) | `conductor/archive/20261117-craft-application/verification/integrated.md` |
| coverage (80% gate) | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | pass (94.97/85.69/98.33/94.77%) | `conductor/archive/20261117-craft-application/verification/integrated.md` |
| quality instrument | `node scripts/rubric-report.mjs` | pass (gate honestly `fail`, mean 3.67) | `test/art/scores.json` |

## Review

- **Verdict:** `PASS` (after review-fix round 1)
- **Rounds:** 1 review-fix round
- **Fixed:** 2 findings (F1, F2 ΓÇö both Low, title/comment-only)
- **Accepted/deferred:** 1 authorized deviation (instrument switch ΓÇö recorded in `review.md` Overrides)

## Deviations and risks

- **Instrument of record switch (user-authorized):** `gemini-4-hydrogen` hit its free-tier daily quota (429 `RESOURCE_EXHAUSTED`, 20/day, ~18 h reset) mid-campaign. The user chose "New instrument of record": all 14 passes re-scored on `gemini-3.5-flash-lite`, `scores.json` metadata and `rubric.test.ts` guards updated honestly. Scores are explicitly NOT comparable to the 3.25 baseline. Recorded in `scores.json` note, `tech-stack.md` dated note, `integrated.md`, `gate-decision.md`.
- **Quality goal unmet (honest):** the publishable gate is still `fail` (floor clause). The mean improved but three lighting=2 scores remain on humanoid (FR-7 protected, byte-identical) and scene. Restoring a pass would require re-scoring the protected humanoid on a quota-recovered frozen instrument ΓÇö out of scope; documented as a follow-up.

## Follow-ups

- none (a future track may re-score the publishable gate on a restored frozen instrument after quota reset; no issue filed ΓÇö deferred work is recorded in `review.md` Debt).

## Rollback

```bash
git revert --no-edit -m 1 <merge-commit>
```

No migration or feature flag. To revert the art changes, restore the six v2 `.px.json`/`.sha256` pairs and `test/art/scores.json` from the parent commit; the frozen-instrument baseline record is preserved in `test/art/scores-before-intent.json` and `scores-agent-vision.json`.
