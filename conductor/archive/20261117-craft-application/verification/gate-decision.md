# Gate decision — Phase 3

**Track:** 20261117-craft-application
**Date:** 2026-11-18
**Result:** accept honest fail (publishable gate not met)

## Recomputed verdict

The verdict in `test/art/scores.json` was recomputed by the scorer from all 14 fresh
passes. It is recorded here verbatim; no value was revised by hand.

| Field | Value | Source |
| --- | --- | --- |
| Result | `fail` | `verdict.result` |
| Mean | **3.67** | `verdict.mean` |
| Threshold (mean) | 3.5 | `verdict.threshold_mean` |
| Floor (min allowed, per criterion/pass) | 3.0 | `verdict.min_allowed` |
| Below-floor count | 3 | `verdict.failures[]` |
| Instrument of record | `gemini-3.5-flash-lite` | `instrument.model` (user-authorized promotion) |
| Passes scored | 14 (7 assets x 2 views) | `assets[].passes[]` |
| Schema | 3 | `schema` |
| Scored at | 2026-11-17 | `scored_at` |

Mean 3.67 clears the 3.5 publishable threshold, but the strict gate requires
**both** mean >= 3.5 **and** no criterion below 3 on any asset/pass. Three
criterion scores remain at 2, so the **floor clause binds, not the mean**: the gate
is `fail`. All criterion means are >= 3.0 (lighting sits exactly at 3.00); the
failure is concentrated in three individual pass scores, not a broad collapse.

**Non-comparability note.** All 14 passes were scored on `gemini-3.5-flash-lite`
after the frozen `gemini-4-hydrogen` exhausted its free-tier daily quota (429
`RESOURCE_EXHAUSTED`, 20/day, reset ~18h43m at time of scoring). Scores do not
transfer across instruments, so the original frozen-instrument baseline (mean
3.25, 22 below-floor) is cited only directionally and is NOT mixed into this gate
evidence. The 3.67 mean is not a like-for-like improvement figure against 3.25;
it is an honest, independently-scored result on the promoted instrument.

## Below-floor findings

These are the three machine-written failing scores in `verdict.failures[]`, with
the scorer's rationale quoted from the corresponding pass in `scores.json`.
None was removed or revised upward.

| Asset | Pass | Criterion | Score | Scorer rationale (verbatim) |
| --- | --- | --- | --- | --- |
| humanoid | A | lighting | 2 | "Shading direction is inconsistent across the helmet, body, and sword elements." |
| humanoid | B | lighting | 2 | "Shading direction is inconsistent across the different masses, creating ambiguous form definition." |
| scene | A | lighting | 2 | "The lighting is inconsistent, featuring a flat roof split down the middle with different tones and conflicting shadow directions." |

All three failures are in `lighting`; no other criterion fell below the floor on
any of the 14 passes. Compared with the original frozen-instrument baseline these
three residual failures are a large reduction in below-floor findings (22 -> 3),
but the residual is real and the publishable gate is not met.

## Decision: ACCEPT (honest fail)

**Decision: ACCEPT the honest fail.** The publishable gate is not met and is not
claimed as met. This decision closes FR-6 / AC-4 with a documented accept
outcome; it does not force, reinterpret, or re-roll a pass. No score was
fabricated, revised upward, or selected to change the verdict, and no
below-floor finding was suppressed. The verdict remains `fail` in
`test/art/scores.json`.

**User authorization.** The user directed: "Use the conductor-implement skill to
complete track 20261117-craft-application ... through PR creation, and the single
completion commit." This directive is the explicit invest-vs-accept decision at
the gate: proceed to completion and PR by **accepting and documenting the honest
fail**, rather than opening a new invest track or forcing a pass inside this one.

**Why a pass is not reachable within this track's authorized scope:**

- **humanoid is protected.** It had zero below-floor scores on the original
  frozen `gemini-4-hydrogen` instrument and was deliberately left untouched; it
  is covered by FR-7 / AC-5, which require untouched assets to stay
  byte-identical. Re-authoring it now purely to lift the flash-lite `lighting=2`
  findings would change its digest and violate that byte-identity guarantee.
- **The frozen instrument cannot be returned to within scope.** Its free-tier
  daily quota was exhausted (HTTP 429 `RESOURCE_EXHAUSTED`, reset ~18h43m at
  scoring time). Returning to it for a reversal is a third-instrument move and
  is out of scope for this track.
- **Scores do not transfer across instruments.** The 3.25 frozen-instrument
  baseline cannot be mixed into the flash-lite verdict to manufacture a pass or
  a comparative improvement claim.

**No pass forced.** The 3.67 mean clearing 3.5 is recorded accurately, and the
three below-floor scores are recorded accurately; the floor clause is allowed to
bind. The gate is honestly `fail`.

**Follow-up (future track).** After the frozen `gemini-4-hydrogen` quota resets,
a future track should: (a) re-score the current 14 passes on the frozen
instrument to obtain a like-for-like verdict; and (b) if residual below-floor
lighting findings persist on an asset that must stay byte-identical here,
explicitly re-scope FR-7 / AC-5 to permit a re-author of that asset before
chasing a pass. Neither action is authorized inside this track.

## Deviations

- **Instrument-of-record switch (user-authorized).** The instrument of record was
  promoted from the frozen `gemini-4-hydrogen` to `gemini-3.5-flash-lite` for all
  14 passes after the former's free-tier quota was exhausted. This is recorded
  honestly in `scores.json` metadata (`scored_by`, `instrument.*`,
  `verdict.note`) and in `verification/phase-2.md`. No criterion score or
  rationale was hand-edited as part of the switch.
- **Spec conflict recorded for doc-sync / review.** This switch conflicts with
  spec **NFR-1** ("Use the frozen `gemini-4-hydrogen` instrument only; no
  cross-instrument comparison in gate evidence") and the spec **Out of Scope**
  list ("Changes to ... instrument ... or scoring methodology"). It was made
  only under explicit user authorization and is flagged here as a follow-up for
  the post-implementation doc-sync and review steps so the spec/plan can be
  reconciled with the recorded instrument of record. This phase records the
  deviation; it does not edit the spec or plan.

## Primary verification (conductor-implement)

- **Date:** 2026-11-17
- **Tree:** clean; 1 file changed vs phase base e028ceb, within Touches (gate-decision.md).
- **Verification command:** `node scripts/rubric-report.mjs` exit 0 — 7 assets / 14
  passes, mean 3.67, result fail, instrument gemini-3.5-flash-lite; matches the
  documented verdict and test/art/scores.json. The primary ran this Node command because
  it is denied to the phase subagent.
- **AC-4:** documented ACCEPT decision present (user directive to complete through PR =
  explicit accept choice); no pass forced, no score/rationale edited. **PASS.**
- **Result:** verified.

