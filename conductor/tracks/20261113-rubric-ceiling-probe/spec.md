# Rubric Ceiling Probe — Specification

## Overview

The calibration recorded in `docs/rubric.md` answered a destructive question: what
does *removing* a property cost? For lighting, edge language and palette craft the
answer was 1 to 2 points, and the high side of every pair stopped at 3. It did not
answer the constructive question — **what would a 4 or 5 look like to this judge?**

Until that is measured, the exceptional tier is an assertion, and any art track
aiming at it is guessing. This track builds nine deliberate attempts at the top of
the scale, three per criterion, fixes them before the first scoring call, and
reports what the judge did with them.

## Problem / Motivation

The honest state after PR #8: the gate's exceptional tier is declared unreachable
on the evidence that three criteria never exceed 3, but nothing shows whether that
ceiling belongs to the art, the judge or the stimuli. A probe distinguishes them:

- if a candidate reaches 4, the ceiling is a property of the art, and the way to
  reach it is now known and recorded;
- if none of three distinct approaches reaches 4, the ceiling is a property of the
  instrument at this size, which is a stronger and more actionable claim than "we
  could not do it".

The second outcome is only credible if the candidates were fixed in advance. Hence
the pre-registration rule: nine recipes, hashed, committed before any call.

## Goals & Success Metrics

- **Goal:** measure whether any of three distinct treatments per criterion earns a
  4 from the judge on a 16–48 px chest.
- **Metric:** nine candidates scored twice each, all reported.
- **Metric:** a per-criterion verdict of `ceiling reached` (naming the candidate)
  or `not reached` (naming all three).
- **Metric:** the rubric document quotes what the judge actually rewarded.
- **Non-goal:** improving any asset's recorded score, or reaching the gate.

## Scope

### In Scope

- Nine pre-registered candidate recipes derived from the chest.
- A `--probes` mode in the existing harness that scores candidates by recipe hash.
- One 18-call run, its report committed with the track.
- A Ceiling probes section in `docs/rubric.md`.

### Out of Scope

- Applying a winning treatment to the seven recorded assets (a follow-up track).
- Changing `test/art/scores.json`, any asset recipe, the gate tiers, or the engine.
- Revising candidates after seeing a score, or a second round without a new owner
  decision.

## Functional Requirements

| ID | Requirement |
| --- | --- |
| FR-1 | The nine candidates are defined in `scripts/calibrate/ceiling.mjs` and registered with a sha256 per recipe **before** any scoring call. |
| FR-2 | Each candidate renders from the chest base to an 8× artifact and a debug sheet, changing only what its treatment needs. |
| FR-3 | Each candidate is scored twice — pass A on the 8× artifact, pass B on the debug sheet — through `scripts/rubric.mjs`, with `test/art/scores.json` restored byte-for-byte. |
| FR-4 | The report records, per candidate, both passes, the per-criterion scores, verbatim rationales, and whether the target criterion reached ≥ 4 on both passes. |
| FR-5 | Per criterion, a verdict of `ceiling reached` or `not reached`, with every candidate named. |
| FR-6 | Each recipe's hash is verified immediately before its scoring call; a mismatch aborts the run instead of scoring an unregistered recipe. |
| FR-7 | `docs/rubric.md` gains a Ceiling probes section with the candidate table, the verdicts, and at least one quoted rationale per criterion. |
| FR-8 | Recorded scores, `test/art/**`, archived tracks, gate tiers and engine code are untouched. |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Determinism: regeneration produces identical recipes and identical PNGs. |
| NFR-2 | The record is restored even on failure, and the run exits non-zero if it is not byte-identical. |
| NFR-3 | Budget: 18 scoring calls, at most four retries per call. |
| NFR-4 | No credential in the repository, an argument or a log. |
| NFR-5 | `pnpm verify` passes with the existing suite. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Nine candidates registered with hashes before the first call, and verified unchanged at scoring time. | FR-1, FR-6 |
| AC-2 | Eighteen scores recorded, two passes per candidate. | FR-3 |
| AC-3 | All nine candidates appear in the report with both passes and rationales. | FR-4 |
| AC-4 | A verdict per criterion naming whether the ceiling was reached. | FR-5 |
| AC-5 | The docs section repeats the verdicts and quotes what the judge rewarded. | FR-7 |
| AC-6 | `test/art/scores.json` is byte-identical after the run. | FR-3, NFR-2 |
| AC-7 | No `test/art`, `conductor/archive` or gate-tier change. | FR-8 |
| AC-8 | `pnpm verify` exits 0 and the suite count is unchanged apart from additions. | NFR-5 |

## Edge Cases

- A model reply that fails validation: retried up to four times; if still unusable
  the candidate pass is recorded as `unscored`, never guessed.
- A recipe edited between registration and scoring: hash mismatch aborts the run,
  and the abort is recorded as the result of that phase.
- A candidate that scores *lower* than the base on its own criterion: recorded as
  a regression; the report keeps it and the docs mention it.
- Two candidates scoring identically: both reported; the verdict names the first
  only if it reached the threshold on both passes.

## Dependencies

- **Tracks:** none outstanding; the calibration harness from PR #8 is on `main`.
- **External:** `gemini-3.5-flash-lite` by reference through
  `PX_RUBRIC_CREDENTIALS`.

## Open Questions & Assumptions

- **Decision (owner, 2026-11-13):** three candidates per criterion, 18 calls.
- **Decision (owner, 2026-11-13):** chest only, for comparability with the
  calibration.
- **Decision (owner, 2026-11-13):** a null result is recorded and the track stops;
  no fishing.
- **Decision (owner, 2026-11-13):** findings go into `docs/rubric.md` plus a
  committed report.
- **Assumption:** the chest exercises all three criteria — it has a lid plane and
  a cylindrical lock for lighting, four material families for palette, and a
  silhouette plus interior detail lines for edge language.

## Amendments

- None.

## References

- `docs/rubric.md` — Calibration section and the two-tier gate.
- `conductor/archive/20261113-rubric-calibration/` — the calibration that
  motivated this probe.
- `.conductor/evidence/calibration/report.md` — variant scores and rationales.
