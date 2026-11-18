# Specification: Gate Publishable Pass

## Overview

Close the quality gate by fixing the last two below-floor scores on the humanoid
asset, on the inherited `gemini-3.5-flash-lite` instrument of record. Re-author
the humanoid palette as coherent warm/cool hue-stepped ramps while keeping the
single top-left light already unified in the previous track, visually review the
rendered art before scoring, then re-score only humanoid A and B and recompute
the publishable verdict honestly. This is one bounded candidate attempt: no
re-rolls, no instrument switch, no hand-edited scores.

## Problem / Motivation / Background

After track `20261118-gate-close-flash-lite`, `test/art/scores.json` reports
`result: "fail"`, mean 3.73, threshold_mean 3.5, with exactly two below-floor
criterion scores — both on humanoid pass A: `edge_language=2` ("The heavy black
outlines are mostly consistent, but internal details lack deliberate and
distinct edge treatments.") and `palette_craft=2` ("The colors feel somewhat
arbitrary with harsh ramps and hues that do not harmonize effectively for the
subject."). Humanoid B and all scene passes now clear the floor. The mean
already clears the publishable threshold; the floor clause alone blocks `pass`.

The ceiling probe in `20261113-rubric-ceiling-probe` reached `palette_craft=4`
with a hue-ramp treatment, and the craft-application diagnostic validated
warm/cool hue-stepped ramps plus one top-left light. Criterion means are
silhouette 4.79, cluster_discipline 4.21, value_separation 3.71, lighting 3.21,
edge_language 3.21, palette_craft 3.21. The user chose "Close the gate: humanoid
hue-ramp pass" and added a visual self-review requirement before scoring.

## Goals & Success Metrics

- **Goal:** reach `result: "pass"` on the publishable gate with no criterion
  below 3 on any asset/pass, using only `gemini-3.5-flash-lite`.
- **Metric:** `test/art/scores.json` has `verdict.result === "pass"`,
  `verdict.failures === []`, `verdict.mean >= 3.5`, all 14 passes present, and
  every per-pass `model === "gemini-3.5-flash-lite"`.
- **Secondary metric:** the ten unaffected passes remain JSON-identical to the
  pre-track snapshot (verified by a field-by-field diff), and the five other v2
  recipes plus seven v1 originals remain byte-identical.
- **Quality intent:** the primary visually inspects the rendered A/B views and
  records an honest assessment before any score is requested.

## Scope

### In scope

- Re-authoring the `test/art/v2/humanoid/humanoid.px.json` palette as warm/cool
  hue-stepped 5-stop ramps, keeping the single top-left `light`, nine parts,
  hero `torso`, value plan, and all design-block invariants.
- Re-rendering humanoid to a new strict-clean committed digest and regenerating
  faithful 8x nearest-neighbour (A) and engine debug sheet (B) artifacts.
- A primary visual review of those artifacts with at most one bounded visual
  revision before scoring.
- Machine re-scoring of exactly the two humanoid passes via
  `scripts/rubric.mjs --model gemini-3.5-flash-lite --replace`.
- Honest verdict recomputation, a bounded-stop gate decision, and digest/
  command evidence.

### Out of scope

- Any change to the engine, CLI, MCP surface, ops, linter, rubric instrument,
  or scoring methodology.
- Re-scoring on frozen `gemini-4-hydrogen`; cross-instrument comparison;
  re-scoring the ten unaffected passes; score re-rolls or hand-edited scores.
- The 4.0 exceptional tier (documented unreachable in `docs/rubric.md`).
- New dependencies, recipes over ~2000 ops, or unregistered ops.
- Changes to the five other v2 recipes or the seven pinned v1 originals.

## Functional Requirements

- **FR-1:** Humanoid pass A `edge_language >= 3` on `gemini-3.5-flash-lite`.
- **FR-2:** Humanoid pass A `palette_craft >= 3` on `gemini-3.5-flash-lite`.
- **FR-3:** The humanoid recipe is re-authored with coherent warm/cool hue-stepped
  ramps and renders `--strict` clean to a new stable committed digest; faithful
  A/B artifacts are regenerated.
- **FR-4:** Humanoid passes A and B are re-scored by `scripts/rubric.mjs` with
  `model=gemini-3.5-flash-lite` and a track-specific `--note`; no other pass is
  re-scored.
- **FR-5:** The verdict is recomputed by the scorer and recorded honestly
  (`pass` or `fail`); a `pass` is never forced and a `fail` is explicitly
  accepted as the bounded final outcome.
- **FR-6:** Exactly one authored candidate is scored; if the floor is still
  breached, no second recipe/scoring iteration is attempted in this track.

## Non-Functional Requirements

- **NFR-1:** Use `gemini-3.5-flash-lite` only; no cross-instrument comparison
  with the 3.25 hydrogen baseline or the 3.67 prior point-in-time record.
- **NFR-2:** No hand-editing of criterion scores, rationales, or verdict fields;
  metadata-only edits to `scores.json` are allowed solely to record honest state
  and must be documented.
- **NFR-3:** No new dependencies; recipes under ~2000 ops; only existing
  registered ops.
- **NFR-4:** `pnpm verify` exits 0 and scoped coverage
  `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens`
  meets the 80% gate on all four metrics.
- **NFR-5:** Credentialed scoring is run by the primary only, with the
  credential read from `C:\Users\Ansyar\.config\opencode\opencode.json` via
  `PX_RUBRIC_CREDENTIALS` and never printed; 503/429/non-JSON responses are
  retried with backoff, never by switching instruments.
- **NFR-6:** Evidence records exact commands, artifact/recipe/digest values,
  and paths; binaries stay under gitignored `.conductor/evidence/`.
- **NFR-7:** Visual self-review before scoring: after authoring and rendering,
  the primary inspects the A/B images directly, compares with the baseline, and
  records a judgment. If unsatisfied, the primary may request **one** bounded
  visual revision from the phase subagent before any credentialed scoring. This
  gate is about visual quality only — it is not a score re-roll and does not
  lift the one-candidate scoring cap in FR-6.

## Acceptance Criteria

- **AC-1 (FR-1):** Humanoid A `edge_language >= 3` on flash-lite, with declared
  design intent preserved (`design.light=top-left`, hero `torso`).
- **AC-2 (FR-2):** Humanoid A `palette_craft >= 3` on flash-lite.
- **AC-3 (FR-3):** New humanoid `.sha256` matches two strict-clean renders;
  `.8x.png` and `.debug.png` are regenerated with zero blocking findings.
- **AC-4 (FR-4):** Exactly two passes are machine-re-scored, each carrying
  `model=gemini-3.5-flash-lite` and the track note; no score/rationale hand-edited.
- **AC-5 (FR-5):** The verdict is `pass` with no failures, or an honest `fail`
  with failures listed and an explicit bounded-final ACCEPT.
- **AC-6 (FR-6):** Evidence shows one candidate scored and no re-roll; a fail
  is not chased with a second authored candidate.
- **AC-7 (FR-3):** The other five v2 recipes/sidecars and seven v1 originals are
  byte-identical; the ten unaffected passes are JSON-identical.
- **AC-8 (NFR-4):** `pnpm verify` exit 0 and coverage >= 80% on all four metrics.
- **AC-9 (NFR-7):** `verification/phase-1.md` records the primary's visual
  assessment of the humanoid A/B views against the baseline and either "no
  revision needed" or the single requested revision with its outcome.

## Edge Cases

- **Scorer 503/429/quota/non-JSON:** retry with backoff; if exhausted, record an
  honest blocked state — never fabricate, re-roll, or switch instruments.
- **Strict-lint regression:** re-materialize ramps via `deriveRamp(base,5)` and
  re-render; never weaken the linter.
- **Criterion regression on humanoid B:** re-check all six criteria on both
  passes and record the honest outcome; no second scoring round.
- **Visual revision request:** the subagent re-authors and re-renders once; the
  primary re-inspects; scoring still occurs exactly once.
- **A candidate fails to clear the floor:** accept the honest fail as the
  bounded final decision — no second candidate, no cross-instrument transfer.

## Dependencies

- Merged tracks `20261117-craft-application` and
  `20261118-gate-close-flash-lite` (baseline recipes, instrument of record).
- Credential at `C:\Users\Ansyar\.config\opencode\opencode.json`
  (`mcp.agent-vision.environment`).

## Open Questions & Assumptions

- **Assumption:** warm/cool hue-stepped ramps will lift humanoid A's
  `palette_craft` and, via warmer/cooler material separation, `edge_language`;
  this is a hypothesis to be confirmed by the single scoring round.
- **Assumption:** the inherited flash-lite quota can absorb two re-scores;
  probe before scoring, and honestly block if exhausted.
- **Open:** none blocking.

## References

- `conductor/archive/20261118-gate-close-flash-lite/verification/gate-decision.md`
- `conductor/archive/20261117-craft-application/verification/diagnostic.md`
- `test/art/scores.json`, `docs/rubric.md`
- `test/art/v2/humanoid/humanoid.design.md`
