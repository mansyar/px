# Craft Application — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This track closes the failed publishable quality gate by applying lighting, palette, and edge techniques the engine already ships to the scored v2 art assets. No engine capability or rubric changes: first a cheap, gated diagnostic on the worst asset with the frozen instrument establishes which craft levers move which criteria, then only validated levers are applied to the below-floor assets and the gate is re-scored honestly.

## Problem / Motivation

`test/art/scores.json` verdict is `fail`: mean **3.25** against the 3.5 publishable threshold, with **22 below-floor scores** across seven assets × two views. All 22 sit in lighting (mean 2.07), edge_language (2.64), and palette_craft (2.64); the form criteria are strong (silhouette 4.29, cluster_discipline 4.07, value_separation 3.79). Chest is the worst asset at 2.50. Inspection of the v2 recipes shows they are almost entirely `ascii_blit` + `auto_outline`: only 1/7 uses `light`, 2/7 use `harmonize`, and `ramp_fill` / `auto_shade` / `deband` are effectively unused. This is an **application gap, not a capability gap**. The ceiling probe hints that hue-ramp and warm-cool treatments can reach 4/4 and 4/3, but it ran on a different instrument and scores do not transfer across instruments, so the hypothesis must be re-validated on the frozen one. If unaddressed, the shipped asset set remains below publishable tier and the project's headline result is a failed gate.

## Goals & Success Metrics

- **Goal:** Empirically establish which craft levers move the three weak criteria on the frozen instrument.
- **Goal:** Bring all seven v2 assets to publishable tier — mean ≥ 3.5 **and** no criterion < 3 on any asset/pass.
- **Metric:** Frozen-instrument verdict changes `fail → pass` with 0 below-floor scores.
- **Metric:** Digests of assets not intentionally re-authored stay byte-identical.

## Scope

### In Scope

- Build 2–3 chest diagnostic candidates applying a hue-ramp palette, warm-cool directional light, and deliberate edge hierarchy, using only existing engine ops.
- Render faithful A/B views (exact 8× nearest-neighbour on `#808080` and the engine debug sheet) for the baseline and each candidate.
- Score baseline and candidates with the frozen `gemini-4-hydrogen` instrument and record per-criterion deltas, including which levers clear the floor of 3.
- Apply validated levers to the below-floor assets' v2 recipes.
- Re-render and re-score all 14 passes, regenerate `scores.json` through the documented scorer, and recompute the verdict honestly.
- Record diagnostic evidence, lever selection, digests, and the Phase 2 decision under `verification/`.

### Out of Scope

- Changes to rubric weights, anchors, views, instrument, or scoring methodology.
- Changes to `src/core` engine operations; only existing ops may be used.
- New dependencies.
- Hand edits, rerolls, rationale rewrites, or score selection in `test/art/scores.json`.
- New assets or Phase 2 product features.
- Chasing the exceptional tier (4.0), which is documented as unreachable in `docs/rubric.md`.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Produce 2–3 chest diagnostic candidates using only existing engine ops, isolating or combining hue-ramp palette, warm-cool directional light, and edge hierarchy | must |
| FR-2 | Render faithful A/B views for the chest baseline and each candidate | must |
| FR-3 | Score baseline and candidates on the frozen instrument; record per-criterion deltas and which levers clear floor ≥ 3 | must |
| FR-4 | Select levers with measured evidence and apply them to every below-floor asset's v2 recipe | must |
| FR-5 | Re-render and re-score all 14 passes; regenerate `scores.json` via the scorer only | must |
| FR-6 | Recompute the verdict honestly; if still `fail`, record an explicit invest-vs-accept decision with evidence | must |
| FR-7 | Verify that digests of untouched assets remain byte-identical | should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Use the frozen `gemini-4-hydrogen` instrument only; no cross-instrument comparison in gate evidence |
| NFR-2 | `scores.json` is machine-generated; no manual edits, rerolls, or rationale rewrites |
| NFR-3 | No new dependencies; recipes stay under ~2,000 ops |
| NFR-4 | `pnpm verify` and the scoped coverage gate (80%) remain green |
| NFR-5 | The credential is used for scoring but never printed or written; scoring stays human-run via `scripts/rubric.mjs` |
| NFR-6 | Diagnostic evidence is reproducible and recorded under `verification/` |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `verification/diagnostic.md` records at least 2 chest candidates with A/B artifacts and frozen-instrument per-criterion scores against the baseline | FR-1, FR-2, FR-3 |
| AC-2 | A lever-selection decision ties each applied lever to a measured score of at least 3 on its target criterion | FR-4 |
| AC-3 | All 14 passes are re-scored and `scores.json` is regenerated by the scorer | FR-5 |
| AC-4 | The verdict is `pass`, or a documented invest/accept decision exists if it is still `fail` | FR-6 |
| AC-5 | A digest comparison shows unchanged assets are byte-identical | FR-7 |
| AC-6 | `pnpm verify` and scoped coverage pass; no new runtime dependencies | NFR-3, NFR-4 |

## Edge Cases

- A candidate improves one criterion but drops another below the floor: decide on the total floor across passes, not the asset mean.
- The scorer returns 503/429: retry with backoff; never switch instrument.
- A lever clears 3 on one view but not the other: not validated — the floor clause applies per asset/pass.
- edge_language remains capped at 3 across treatments: acceptable while it clears the floor; do not chase 4.
- The gate still fails after validated levers: never force a pass; record the decision.
- A re-authored recipe exceeds ~2,000 ops: simplify it.

## Dependencies

- **Tracks:** `20261117-gate-instrument-reconciliation` (merged at `b0ea365`; prerequisite, satisfied).
- **External:** Anthropic credential for `scripts/rubric.mjs` (human-run, ~2–4 min per call, with 503/429 retries).

## Open Questions & Assumptions

- **Assumption:** The ceiling-probe levers measured on the old instrument transfer directionally to the frozen instrument. This is unproven; Phase 0 exists to test it.
- **Assumption:** `scores.json` regenerates with the same schema 3 and two faithful views.
- **Assumption:** edge_language at 3 is acceptable because the floor is 3 and 4 is unreachable for this drawing.
- **Question (deferred to Phase 3):** if the gate still fails after validated levers, accept 3.25 as current quality or invest further? This is a user decision at that gate.

## References

- `test/art/scores.json` and `docs/rubric.md`
- `conductor/archive/20261117-gate-instrument-reconciliation/`
- `conductor/archive/20261113-rubric-ceiling-probe/verification/ceiling/probe.md`
- `test/art/v2/*/*.px.json`
