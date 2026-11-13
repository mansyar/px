# Rubric View Comparison — Specification

## Overview

Every anchor in `docs/rubric.md` is written "at 1×", but the judge never sees a
1× artifact. The method requires the plain 8× nearest-neighbour upscale for pass A
and the debug sheet for pass B, and it refuses a raw 1× PNG because the first
scoring round saw a 16 px potion score 2.67 at 1× against 4.33 at 8×, with the
rationales naming blur and compression.

That finding came from one small asset. Two dry runs on 2026-11-13 suggest it does
not hold at 48 px: the recorded chest scored identically at 1× and 8×
(5/4/3/3/4/4), and a probe candidate swapped exactly one point in each direction.
The ban may be right in intent and wrong in form — a size threshold rather than a
blanket refusal.

This track measures the view effect on two assets at or above 32 px and makes the
decision from pre-registered numbers.

## Problem / Motivation

The current rule has two costs. It asks the judge to score an artifact that is not
the size the sprite is played at, and it wastes the fact that the anchors were
written for 1×. If 1× is equivalent for assets ≥ 32 px, pass A can score the real
artifact and the method stops contradicting its own anchors.

The risk of just changing it is obvious: one afternoon of dry runs is not evidence,
and a view change silently shifts every future score. Hence a pre-registered
comparison with a decision rule fixed before the first call.

## Goals & Success Metrics

- **Goal:** decide, from measurement, whether 1× is an acceptable pass-A artifact
  for assets at or above 32 px.
- **Metric:** 12 scores — two assets × three views × two repeats.
- **Metric:** a decision computed by the harness against the pre-registered rule,
  with blocking reasons when it rejects.
- **Non-goal:** re-scoring the recorded assets, or settling the 16 px case.

## Scope

### In Scope

- View generator for chest (48 px) and humanoid (32 px): 1×, 8×, debug.
- Artifact hashes registered before any scoring call.
- A `--views` scoring mode with the decision computed in code.
- The `docs/rubric.md` Method section updated to whatever the measurement supports.

### Out of Scope

- The 16 px potion, and any asset below 32 px.
- Re-scoring `test/art/scores.json`.
- Gate tiers, engine code, asset recipes.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-1 | `scripts/calibrate/views.mjs` renders 1×, 8× and debug artifacts for both assets and registers their sha256 before any call. |
| FR-2 | `scripts/calibrate.mjs --views` scores each artifact twice through `scripts/rubric.mjs`, restoring `test/art/scores.json` byte-for-byte, and writes `views.json` and `views.md`. |
| FR-3 | The report records, per asset, view and criterion: both repeat scores, the mean, the Δ across views, and any exclusion with its reason. |
| FR-4 | The harness computes the pre-registered decision mechanically and prints the blocking reasons on rejection. |
| FR-5 | `docs/rubric.md` states the outcome: 1× accepted for assets ≥ 32 px with pass A redefined, or the existing rule retained with the measurement cited. |
| FR-6 | No asset, recorded score, gate tier or engine file changes. |

## Decision Rule (pre-registered)

1. Two repeats of the same view must agree within 1 step on a criterion; a
   criterion that fails is **excluded** and recorded.
2. For each included criterion, Δ = highest view mean − lowest view mean.
3. **Accept 1× for assets ≥ 32 px** only if, for both assets, every included
   criterion has |Δ| ≤ 1 and the mean |Δ| across criteria is < 0.25.
4. Otherwise the current method stands, naming the asset and criteria that blocked
   it.
5. If every criterion is excluded for an asset, the result is `inconclusive` and
   the current method stands.

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Determinism: the view generator reproduces identical artifacts. |
| NFR-2 | The record is restored on failure and the run exits non-zero if it is not byte-identical. |
| NFR-3 | Budget: 12 scoring calls, at most four retries per call. |
| NFR-4 | No credential in the repository, an argument or a log. |
| NFR-5 | `pnpm verify` passes. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Six artifacts registered with hashes before the first call. | FR-1 |
| AC-2 | Twelve scores recorded, two per artifact. | FR-2 |
| AC-3 | Both repeats, means, Δ and exclusions present for every asset/criterion. | FR-3 |
| AC-4 | The decision is computed by the harness and matches the rule. | FR-4 |
| AC-5 | `docs/rubric.md` carries the outcome and the evidence link. | FR-5 |
| AC-6 | `test/art/scores.json` byte-identical; no asset or archive change. | FR-2, FR-6 |
| AC-7 | `pnpm verify` exits 0. | NFR-5 |

## Edge Cases

- A malformed reply: retried up to four times, then recorded unscored; the decision
  becomes `inconclusive` rather than being computed on partial data.
- A criterion whose repeats disagree by more than one: excluded, with the two
  scores shown.
- A view whose artifact fails to render: the run aborts before any call.
- Identical Δ on a tie: acceptance requires the stricter reading, so a tie that
  exceeds the threshold rejects.

## Dependencies

- **Tracks:** none outstanding; `--probes` and the calibration harness are on
  `main` (PR #9).
- **External:** `gemini-3.5-flash-lite` by reference through
  `PX_RUBRIC_CREDENTIALS`.

## Open Questions & Assumptions

- **Decision (owner, 2026-11-13):** chest and humanoid as the two assets.
- **Decision (owner, 2026-11-13):** tolerance of one step per criterion and mean
  |Δ| < 0.25.
- **Decision (owner, 2026-11-13):** an unstable criterion is excluded, not fatal.
- **Assumption:** the debug sheet's role as pass B is unchanged by the outcome,
  preserving two independent views whatever happens to pass A.

## Amendments

- None.

## References

- `docs/rubric.md` — Method, Calibration, Ceiling probes.
- `conductor/archive/20261113-rubric-calibration/` — the original 8× rule and its
  rationale.
- `conductor/archive/20261113-rubric-ceiling-probe/` — the dry-run observation that
  prompted this track.
