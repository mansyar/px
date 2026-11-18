## Summary

This track re-authored the humanoid v2 recipe with a coherent warm/cool steel palette and re-scored its two affected passes on the instrument of record `gemini-3.5-flash-lite`. Humanoid A `edge_language` rose from 2 to 3 and `palette_craft` from 2 to 4; the scorer-recomputed publishable gate is now honestly `pass` at mean 3.82 with zero below-floor criteria. A primary visual self-review of the rendered A/B views was completed before scoring, only one bounded candidate was scored, and the other twelve passes remain JSON-identical.

## Track

- **ID:** `20261118-gate-publishable-pass`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261118-gate-publishable-pass/spec.md`](conductor/archive/20261118-gate-publishable-pass/spec.md)
- **Plan:** [`conductor/archive/20261118-gate-publishable-pass/plan.md`](conductor/archive/20261118-gate-publishable-pass/plan.md)
- **Review:** [`conductor/archive/20261118-gate-publishable-pass/review.md`](conductor/archive/20261118-gate-publishable-pass/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Re-author humanoid ramps and re-render faithful artifacts | Lift humanoid A floor criteria with coherent warm/cool ramps | verified | `6af20cb` | Nine parts, hero `torso`, `design.light=top-left` and one `light` op before `auto_outline` retained. Two strict-lint palette repairs only (`gorget.t2`, `pauldron.t2`); no linter, threshold or op weakened. New strict-clean digest `76c4ba9b...`. Primary personally read baseline and candidate A/B PNGs (NFR-7/AC-9) and judged SATISFIED before scoring. |
| 2: Re-score the two affected passes and recompute the gate | Machine-re-score humanoid A/B on flash-lite | verified | `8f3d92d` | Both calls `OK[try 1]` with `--model gemini-3.5-flash-lite --replace` and the track note. Humanoid A scores 5/4/3/3/5/4, B 5/4/3/3/4/3 (silhouette/value/lighting/edge/cluster/palette). Gate recomputed: `pass`, mean 3.82, `failures=[]`; twelve unaffected passes unchanged (`unaffected_checked=12 diffs=0`). |
| 3: Record the honest gate decision | Document the quality win and the bounded stop | verified | `11cb197` | `gate-decision.md` records the passing verdict, one candidate / one scoring round with no re-roll, no instrument switch and no comparability claim against the old hydrogen baseline. |
| R1: Review Fixes | Resolve the two round-1 Low findings | verified | `9c8d0da` | Corrected the stale pass count to twelve in `spec.md` (three locations) and relabeled the `integrated.md` requirements table to canonical IDs with evidence cells realigned. No score, rationale, verdict, recipe or code file changed. |

## Requirements

- [x] `FR-1` - humanoid A `edge_language >= 3` on flash-lite (evidence: `test/art/scores.json`, `verification/rescore.md`)
- [x] `FR-2` - humanoid A `palette_craft >= 3` on flash-lite (evidence: `test/art/scores.json`, `verification/rescore.md`)
- [x] `FR-3` - humanoid recipe re-authored with coherent warm/cool ramps, strict-clean new digest and faithful A/B artifacts (evidence: `verification/phase-1.md`)
- [x] `FR-4` - exactly two passes machine-re-scored with model and track note (evidence: `verification/rescore.md`)
- [x] `FR-5` - scorer-recomputed verdict recorded honestly with no forced pass (evidence: `verification/gate-decision.md`)
- [x] `FR-6` - one authored candidate, one bounded scoring round, no re-roll (evidence: `verification/gate-decision.md`)
- [x] `NFR-1` - flash-lite only; no cross-instrument comparison
- [x] `NFR-2` - no hand-edited scores, rationales or verdict fields; metadata-only reconciliation recorded
- [x] `NFR-3` - no new dependencies; existing registered ops only; recipe under ~2000 ops
- [x] `NFR-4` - `pnpm verify` and scoped 80% coverage gate green
- [x] `NFR-5` - credentialed scoring primary-run, credential never printed
- [x] `NFR-6` - exact commands, digests and evidence paths recorded
- [x] `NFR-7` - primary visual self-review of A/B views completed before scoring
- [x] `AC-1` .. `AC-9` - all covered (see `review.md` and `verification/integrated.md`)

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| typecheck + lint + unit/integration/smoke + build | `pnpm verify` | pass (119 files / 1028 tests; 1 pre-existing non-failing Biome warning at `test/recipe/version-1-2.test.ts:50`) | `conductor/archive/20261118-gate-publishable-pass/verification/integrated.md` |
| coverage (80% gate) | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | pass (95.02 / 85.72 / 98.33 / 94.82%) | `conductor/archive/20261118-gate-publishable-pass/verification/integrated.md` |
| quality instrument | `node scripts/rubric-report.mjs` | pass (gate `pass`, mean 3.82, zero failures, `gemini-3.5-flash-lite`) | `test/art/scores.json` |
| unaffected integrity | primary diff script | pass (`unaffected_checked=12 diffs=0`) | `conductor/archive/20261118-gate-publishable-pass/verification/rescore.md` |

## Review

- **Verdict:** `PASS` (after review-fix round 1)
- **Rounds:** 1 review-fix round
- **Fixed:** 2 findings (F1 stale pass count, F2 requirement labels - both Low)
- **Accepted/deferred:** 0 (all findings resolved; authorized deviations recorded below)

## Deviations and risks

- **Humanoid byte-identity waiver:** the previous track protected the humanoid v2 recipe; this track explicitly releases that protection for humanoid only. All other v2 assets, all seven v1 originals and twelve score passes remain byte-identical.
- **Inherited instrument:** all scoring stays on `gemini-3.5-flash-lite`, the instrument of record promoted in an earlier track after `gemini-4-hydrogen` hit its free-tier 429 quota. The 3.82 pass is NOT comparable to the 3.25 hydrogen baseline or earlier point-in-time records.
- **Metadata-only honesty edits:** the primary reconciled `scored_by`, `instrument.note` and `verdict.note` free text after scorer runs. No criterion score, rationale, guarded date or verdict field was hand-edited; both passes and the structured verdict were scorer-written.
- **Strict-lint repairs:** two palette tones (`gorget.t2`, `pauldron.t2`) were adjusted to satisfy contrast/collision lints; no threshold or linter was weakened.
- **Phase 2 squash skipped:** the range contained a primary metadata-reconciliation commit not reported by the subagent, so task commits were retained.
- **F1 applied by primary:** the phase subagent's write to primary-owned `spec.md` was permission-denied; the primary ran the exact edit and the subagent finalized the evidence.

## Follow-ups

- none. The publishable gate is reached on the instrument of record; no re-score on the retired instrument was attempted.

## Rollback

```bash
git revert --no-edit -m 1 <merge-commit>
```

No migration or feature flag. To revert only the art/score changes, restore `test/art/v2/humanoid/{humanoid.px.json,humanoid.sha256,humanoid.design.md}` and `test/art/scores.json` from the parent commit.

