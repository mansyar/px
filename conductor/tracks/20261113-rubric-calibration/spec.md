# Rubric Calibration — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

The art rubric has two independent defects in its definition of done, and four
consecutive art tracks have run into them without naming them.

1. **The arithmetic cannot close.** The documented per-criterion targets —
   lighting 3.5, edge language 3.5, palette 3.6, value separation 3.7 — combined
   with the measured silhouette 4.79 and cluster discipline 4.07 average **3.875**.
   An asset can satisfy every named target and still fail the 4.0 mean, because
   the target vector was derived when cluster discipline was 4.57 and assumed it
   would stay there.
2. **The top of the scale is unevidenced.** `docs/rubric.md` describes 4 and 5 in
   prose only. A three-variant calibration on the chest (flat fill, hand-painted
   ramp, engine `light`) scored lighting **1, 3 and 3**: the instrument separates
   unshaded from shaded by two points, and then both real shading methods stop at
   "shaded but not convincing". No recorded artifact demonstrates what a 4 or a 5
   looks like to this judge.

`docs/rubric.md`'s AC-20 carries the same bar ("mean ≥ 4.0, no criterion below
3"), so the document, the track conventions and the record all need to agree
before another art track is worth running.

## Problem / Motivation

Three tracks tried to lift the score by extending the engine (PRs #4, #5), and one
tried by re-authoring the art (PR #7). The mean moved 3.73 → 3.71 → 3.69, while
the untracked control asset moved 3.92 → 4.00 on its own. The last track's
criterion moves (+0.15 palette, +0.28 lighting, +0.22 value) all sit inside that
noise, and its five missed acceptance criteria were merged as open by owner
override.

The decisive evidence is the calibration already run in this session: with
identical geometry and only the shading method changed, the judge scored flat 1,
hand 3, engine 3 for lighting. That proves the criterion measures something — and
that the bar it is being held to has never been shown to be reachable.

## Goals & Success Metrics

- **Goal:** make the acceptance bar both arithmetically consistent and
  evidence-anchored, with a reproducible harness that proves each criterion can
  separate a low-quality artifact from a high-quality one.
- **Metric:** the target vector documented in `docs/rubric.md` sums to at least
  six times the mean gate, enforced by a test.
- **Metric:** every criterion carries a measured verdict (`separates`,
  `ambiguous` or `saturated`) and an explicit statement of whether a 4-anchor
  exists.
- **Metric:** at least four of six criteria separate, lighting among them.
- **Non-goal:** making any specific asset score 4.0 in this track.

## Scope

### In Scope

- A deterministic variant generator producing low/high recipe pairs for all six
  criteria from a base asset, changing only the property under test.
- A harness that scores every variant twice through `scripts/rubric.mjs`, keeps
  the real record byte-identical, and writes a JSON and markdown report.
- A `pnpm rubric:calibrate` command.
- A gate-arithmetic test that parses the documented target table and fails when
  the targets cannot reach the mean gate.
- A rewrite of `docs/rubric.md` AC-20 to the calibrated definition, plus a dated
  Calibration section with the measured results and anchors.
- A dated forward-only note: recorded scores and archived tracks are not re-scored.

### Out of Scope

- Changing any asset recipe under `test/art/**`.
- Changing any recorded score in `test/art/scores.json`.
- Editing archived tracks, their reviews, or their metadata.
- Engine, lint-threshold or output-contract changes.
- Changing the scoring model or the two-pass method.
- Lowering the gate. If a criterion has no 4-anchor, this track reports it; a gate
  change is a separate owner decision.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | A repository command generates, for each of the six criteria, at least two variants of a base asset that differ only in the property under test (low and high contrast), from deterministic recipes. | must |
| FR-2 | Variants render through the existing CLI to an 8× upscale and a debug sheet; no variant is written into `test/art/**`. | must |
| FR-3 | The harness scores every variant twice — pass A on the 8× artifact, pass B on the debug sheet — through `scripts/rubric.mjs`, into a temporary record. | must |
| FR-4 | The harness writes a calibration report as both JSON and markdown, recording per criterion the low and high scores, the separation Δ, both passes, and a verdict. | must |
| FR-5 | A criterion is `separates` when Δ ≥ 2 on the mean of both passes and no single pass shows Δ < 1; otherwise `ambiguous`; a criterion whose high variant cannot exceed 3 on either pass is `saturated`. | must |
| FR-6 | A criterion has an evidenced 4-anchor when at least one variant scores ≥ 4 on both passes; otherwise the report says it has none, and the gate is not adjusted to compensate. | must |
| FR-7 | `docs/rubric.md` gains a dated Calibration section naming the variants, model, pass method, separation results and evidenced anchors, and AC-20 is rewritten so the documented per-criterion targets sum to at least the mean gate and say they are re-derived when silhouette or cluster discipline moves. | must |
| FR-8 | A check enforces the arithmetic: the documented target vector must sum to at least six times the mean gate, so no specification can state targets that cannot reach it. | must |
| FR-9 | Scores and recipes already recorded are untouched; the new scale applies forward only, and the document states this with a date. | must |
| FR-10 | No engine, lint-threshold or existing-test change. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Determinism: the same base recipe and variant definitions produce identical recipes and identical PNG bytes. |
| NFR-2 | The harness must restore `test/art/scores.json` even when a scoring call fails or is interrupted, and must exit non-zero if the restored file is not byte-identical. |
| NFR-3 | Cost is bounded: six criteria × two variants × two passes = 24 scoring calls, with at most four retries per call on an unusable reply. |
| NFR-4 | No credential is written to the repository, an argument or a log; the scorer continues to read it by reference. |
| NFR-5 | `pnpm verify` must pass, with the existing 28 asset tests and 10 record tests unchanged. |
| NFR-6 | The report must be readable without the model: every verdict is accompanied by the verbatim rationales that produced it. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | The generator emits at least two variants per criterion, and a mutation audit shows each variant differs from the base only in its target property. | FR-1 |
| AC-2 | `pnpm rubric:calibrate` runs end to end and writes both the JSON and the markdown report. | FR-3, FR-4 |
| AC-3 | The report carries a verdict for all six criteria. | FR-4, FR-5 |
| AC-4 | At least four of the six criteria reach `separates`, and lighting is one of them. | FR-5 |
| AC-5 | Every criterion's report entry states whether a 4-anchor exists, and `docs/rubric.md` repeats those findings. | FR-6, FR-7 |
| AC-6 | The arithmetic check fails against the currently documented targets (3.875) and passes against the rewritten ones (≥ 24.0). | FR-8 |
| AC-7 | A completed harness run leaves `test/art/scores.json` byte-identical. | NFR-2 |
| AC-8 | `pnpm verify` exits 0 and the asset and record tests still pass 28 and 10. | NFR-5 |
| AC-9 | No file under `test/art/` changes, other than a documented additive field if the record needs one. | FR-9 |
| AC-10 | The forward-only note is present with a date, and no file under `conductor/archive/` changes. | FR-9 |

## Edge Cases

- A model reply that is not JSON, or returns a non-integer score: the scorer writes
  nothing; the harness retries and, after four attempts, records the criterion as
  unscored rather than guessing.
- A variant that turns out to be visually identical to the base after mutation:
  the mutation audit fails the run before any scoring call is spent.
- A criterion that cannot be synthesized on the chosen base asset: it is declared
  `unsupported` with the reason, and counts against the four-of-six requirement
  honestly.
- A high variant that scores 5 trivially (for example a solid shape against a
  blob): recorded as evidence that the criterion has a usable top end, not as
  proof that the anchor is meaningful.
- An interrupted run: the `try/finally` restore runs; if the process is killed
  outright, the next run detects the dirty record and refuses to start until it is
  restored.

## Dependencies

- **Tracks:** none outstanding. `scripts/rubric.mjs` and
  `scripts/rubric-report.mjs` are merged on `main`.
- **External:** `gemini-3.5-flash-lite` through
  `PX_RUBRIC_CREDENTIALS`, read by reference.

## Open Questions & Assumptions

- **Decision (owner, 2026-11-13):** keep the 4.0 gate and recalibrate the scale
  rather than lower the bar.
- **Decision (owner, 2026-11-13):** anchors are calibrated against synthetic
  variants only.
- **Decision (owner, 2026-11-13):** the harness covers all six criteria, with
  synthetic variants where possible.
- **Decision (owner, 2026-11-13):** two passes per variant.
- **Decision (owner, 2026-11-13):** apply forward only; archived scores are not
  re-scored.
- **Assumption:** the chest is a sufficient base asset for all six mutations
  except silhouette and cluster discipline, where a second base may be needed; if
  so, that is recorded in the report rather than stretched to fit.
- **Assumption:** the 3.5 criterion floor from the previous track is retained as
  the floor, while the target vector is re-derived to sum to the mean gate.

## Amendments

- **A1 (2026-11-13, during Phase 2):** FR-5's three verdicts conflated separation
  with the scale ceiling. `saturated` described a criterion whose high variant
  cannot exceed 3, but a criterion can separate a bad artifact from a good one
  *and* still have no 4-anchor — `lighting` scores 1 against 3 and never reaches 4.
  The report now records the verdict on the separation axis (`separates` or
  `ambiguous`) and records `saturated` and `anchor4` as independent facts about
  the ceiling, so AC-4 ("lighting separates") and FR-6 ("no 4-anchor") can both
  be true of one criterion. No threshold changed and no bar was lowered.
- **A3 (2026-11-13, owner decision after Phase 4):** the mean gate is split into
  two tiers — **publishable** at 3.5 with a per-criterion floor of 3.0, and
  **exceptional** at 4.0 with a floor of 3.5 — on the calibration evidence, which
  puts the attainable ceiling at 3.67. The recorded scores and the recorded
  verdict are unchanged: the decision changes what the numbers mean, not the
  numbers. AC-20 now reports both tiers, and the current record meets neither,
  because humanoid pass B scores cluster discipline 1, below the publishable
  floor.
- **A2 (2026-11-13, during Phase 4):** the first round of variants was too mild to
  instantiate the anchor-1 descriptions for `edge_language`, `cluster_discipline`
  and `palette_craft` — a chest with every outline removed, and one fully
  desaturated, were both still scored 3-4. Those stimuli were replaced with ones
  that match the anchor text (reasonless edge switching, 1 px checkerboard
  confetti, warped hues), and the round was re-run in full. Both rounds are kept:
  the first as `v1` stimulus-development evidence, the second as the calibrated
  result. The call budget rises from 24 to 48 for this reason.

## References

- `docs/rubric.md` — criteria, anchors, scoring paths, AC-20.
- `.conductor/evidence/calibration/report.md` — the three-variant calibration that
  motivated this track.
- `test/art/scores.json` — the current record (3.69) and its verdict.
- `conductor/archive/20261113-lighting-recovery/review.md` — the review that
  recorded five open criteria.
