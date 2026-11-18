# Publishable Gate Close — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This track closes the publishable quality gate by lifting the three remaining
below-floor lighting scores to ≥3 on the established `gemini-3.5-flash-lite`
instrument of record. It re-authors the `humanoid` v2 recipe with the
already-validated warm/cool directional-light lever (explicitly releasing the
byte-identity protection that asset held in the prior track) and corrects the
`scene` gable so its two roof planes read as one consistent top-left light
direction, then re-scores the four affected passes and recomputes the verdict
honestly. No engine, rubric, or methodology changes are made.

## Problem / Motivation

The gate verdict is `fail` at mean **3.67** — the 3.5 threshold is comfortably
cleared, but the floor clause (no criterion <3 on any asset/pass) is broken by
exactly **three** of 84 criterion scores, all `lighting = 2`: `humanoid` A
("shading direction is inconsistent across the helmet, body, and sword
elements"), `humanoid` B ("shading direction is inconsistent across the
different masses"), and `scene` A ("a flat roof split down the middle with
different tones and conflicting shadow directions"). The two humanoid failures
are a direct consequence of the authorized switch to flash-lite: humanoid was
deliberately left byte-identical in `20261117-craft-application` (FR-7) because
it was clean under the frozen instrument. Until these three scores clear the
floor, the engine cannot be declared publishable — this is the only open thread
in the project.

## Goals & Success Metrics

- **Goal:** reach a `pass` verdict on the publishable gate (mean ≥ 3.5 AND no
  criterion < 3 on any asset/pass) on `gemini-3.5-flash-lite`.
- **Metric:** `test/art/scores.json` verdict `result: "pass"`, `failures: []`,
  mean ≥ 3.5; all 14 passes present with machine-written model fields; zero
  hand-edited criterion scores or rationales.

## Scope

### In Scope

- Re-author the `humanoid` v2 recipe to lift lighting on both passes to ≥3 using
  the validated lever (warm/cool hue-stepped 5-stop ramps + one top-left
  `light` op before `auto_outline`, no `harmonize`), preserving its declared
  design intent.
- Re-author the `scene` v2 recipe so the gable reads as a single top-left light
  direction rather than a symmetric split, lifting pass A lighting to ≥3.
- Re-render faithful pass A (exact 8× nearest-neighbour on `#808080`) and pass B
  (engine debug sheet) artifacts for both changed assets under `--strict`,
  updating `.sha256` sidecars and transcripts.
- Re-score the four affected passes via `scripts/rubric.mjs` with
  `--model gemini-3.5-flash-lite --replace`, machine-written only.
- Recompute the verdict via the scorer and record the honest result; if the gate
  still fails, document the remaining floor failures and an explicit
  invest/accept decision (no forced pass).
- Verify the other five assets remain byte-identical in recipe, sidecar, and
  score records.

### Out of Scope

- Engine, CLI, MCP, op, linter, or rubric methodology/threshold changes.
- Re-scoring on the frozen `gemini-4-hydrogen` instrument (the user explicitly
  chose to close on flash-lite); no cross-instrument comparison or score
  transfer.
- Re-scoring or modifying the ten unaffected passes/assets.
- The 4.0 "exceptional" tier (documented unreachable in `docs/rubric.md`).
- New dependencies; recipes stay under ~2,000 ops.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Re-author `humanoid` v2 so both faithful passes score `lighting ≥ 3` on flash-lite, using existing ops and preserving `design.light = top-left`, hero `torso`, and the declared value plan. | must |
| FR-2 | Re-author `scene` v2 so pass A scores `lighting ≥ 3` with the gable reading as one consistent top-left light direction (no conflicting shadow split), preserving declared design intent. | must |
| FR-3 | Re-render faithful A/B artifacts for `humanoid` and `scene` from the updated recipes under `--strict` with clean lint and updated committed digests/sidecars. | must |
| FR-4 | Re-score the four affected passes through `scripts/rubric.mjs` with `--model gemini-3.5-flash-lite --replace`; all per-pass scores, model fields, and the verdict are machine-written. | must |
| FR-5 | Recompute the verdict honestly; the final record is `pass` (mean ≥ 3.5, no failures) or an honestly-failed verdict with the remaining floor failures and an explicit invest/accept decision documented. No pass is forced. | must |
| FR-6 | The five unchanged assets (`potion`, `sword`, `chest`, `character`, `prop`) remain byte-identical in recipe, `.sha256`, and score records; verify by digest comparison. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Use only `gemini-3.5-flash-lite` as instrument of record; never switch instruments or compare scores across instruments. |
| NFR-2 | No hand-editing of criterion scores or rationales; the scorer writes all per-pass fields and recomputes the verdict. Metadata fields (`instrument`, `scored_by`, notes) may be edited only to record honest state. |
| NFR-3 | No new dependencies; recipes stay < ~2,000 ops and use only existing registered ops. |
| NFR-4 | `pnpm verify` and the scoped 80% coverage gate pass. |
| NFR-5 | Credentialed scoring is primary-run only; credential path from env, never printed; retry 503/429/non-JSON with backoff and never switch instruments. |
| NFR-6 | Reproducible evidence: candidate recipes and generated artifacts live under gitignored `.conductor/evidence/`; verification docs record exact commands and digests. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `humanoid` pass A and pass B each score `lighting ≥ 3` on gemini-3.5-flash-lite, with faithful artifacts and declared design intent preserved. | FR-1 |
| AC-2 | `scene` pass A scores `lighting ≥ 3` and the gable reads as a single top-left light direction. | FR-2 |
| AC-3 | Updated `humanoid`/`scene` recipes render `--strict` clean to new committed digests; faithful A/B artifacts regenerated and sidecars updated. | FR-3 |
| AC-4 | All four affected passes are machine-re-scored with model field `gemini-3.5-flash-lite`; no hand-edited criterion scores or rationales. | FR-4 |
| AC-5 | Final verdict is `pass` (mean ≥ 3.5, zero failures) or an honestly-failed verdict with remaining floor failures and an explicit decision documented; no pass forced. | FR-5 |
| AC-6 | The five unchanged assets' recipe files, sidecars, and score records are byte-identical to pre-track state, with digest-comparison evidence. | FR-6 |
| AC-7 | `pnpm verify` exit 0 and scoped coverage ≥ 80% on all four metrics. | NFR-4 |

## Edge Cases

- **Scorer 503/429/quota exhaustion or non-JSON replies:** retry with backoff;
  if exhausted, record an honest blocked state rather than fabricating scores or
  switching instruments.
- **Strict-lint regressions during re-authoring** (`VALUE_COLLISION`,
  `SILHOUETTE_LOSS`, `LOW_CONTRAST`, `PILLOW_SHADE`): use the project's
  `deriveRamp(base, 5)` and validate under `--strict`; do not weaken linter
  thresholds.
- **Criterion regression:** lifting lighting must not drop any other criterion
  below 3 on the changed assets; re-check all six criteria on both passes.
- **Scene gable change affecting pass B:** re-score both passes of any changed
  asset so the debug-sheet pass cannot silently regress.
- **Humanoid release of protection:** the byte-identity waiver applies only to
  `humanoid` and is recorded explicitly; the five other assets and all seven v1
  originals stay untouched.

## Dependencies

- **Tracks:** none blocking. `20261117-craft-application` (merged) supplies the
  validated lever and the flash-lite instrument-of-record decision;
  `20261117-gate-instrument-reconciliation` (merged) defines the gate.
- **External:** credential at `C:\Users\Ansyar\.config\opencode\opencode.json`
  (`mcp.agent-vision.environment`), `scripts/rubric.mjs`, and flash-lite API
  availability.

## Open Questions & Assumptions

- **Assumption:** the warm/cool directional-light lever validated on chest will
  lift humanoid lighting on flash-lite; this is a hypothesis from a different
  instrument and must be confirmed by scoring, not assumed.
- **Assumption:** scene pass A's failure is caused by the two-plane split gable;
  unifying the light direction lifts it to ≥3.
- **Assumption:** releasing humanoid's byte-identity protection is authorized by
  the user's "Close on flash-lite" direction.
- **Assumption:** flash-lite has quota capacity for four re-scores; probe before
  the scoring phase.

## References

- `conductor/archive/20261117-craft-application/verification/diagnostic.md` —
  validated lever and per-criterion deltas.
- `conductor/archive/20261117-craft-application/verification/gate-decision.md` —
  prior honest fail and ACCEPT decision.
- `conductor/archive/20261117-craft-application/review.md` — recorded
  out-of-scope handoff and debt.
- `test/art/scores.json` — current gate record and the three below-floor
  rationales.
- `docs/rubric.md` — publishable tier (3.5/3.0) and unreachable exceptional tier.
- `test/art/v2/humanoid/humanoid.design.md`,
  `test/art/v2/scene/scene.design.md` — declared design intent of the two targets.
