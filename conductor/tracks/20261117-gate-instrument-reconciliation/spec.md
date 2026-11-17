# Gate and Instrument Reconciliation — Specification

> **Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not renumber it. If a requirement is removed, mark it `Withdrawn` instead of deleting it.**

> **Amended 2026-11-17, no IDs changed.** NFR-3 and AC-12 name `pnpm vitest run --coverage`. During Phase 2 that command was replaced by `pnpm coverage`, which runs the same v8 coverage provider and the same 80% thresholds over the same included files but omits the benchmarks project because v8 instrumentation inflates the wall-clock NFR-7 measurement. NFR-7 remains enforced uninstrumented by `pnpm verify`. The coverage gate is unchanged in scope and strength; only its command name moved.

## Overview

This track does not add drawing capability. It settles the quality contract and establishes one reproducible measurement of the current engine.

The project has ten merged tracks, a mature CLI/MCP engine, and a current art record that says **FAIL: mean 3.39 against 4.0**. At the same time, `docs/rubric.md` already records an owner decision that the 4.0 exceptional tier is unreachable and defines a owner-approved publishable tier at mean ≥ 3.5 with a per-criterion floor of 3.0. Recent track specs nevertheless kept hard 4.0 acceptance criteria, so capable work kept ending as recorded failure.

The measurement itself has drifted: the 3.69 pre-intent record used `gemini-3.5-flash-lite`, while the current 3.39 record used the `agent-vision` instrument. Those two judges disagree by as much as 1.33 on an asset mean, so the apparent decline is not a like-for-like regression. This track binds the publishable tier, freezes one scoring instrument, re-scores the seven current v2 assets, preserves all earlier records as provenance, and publishes an honest baseline.

## Problem / Motivation

- The engine is production-grade by engineering measures: byte-identical rendering, cross-OS determinism, one runtime dependency, 1,024 tests, ~95% statement coverage, 11 MCP tools, and a 256×256 / 2,000-op budget of about 121 ms.
- The quality record is the only persistent red mark: current mean **3.39**, eight scores below the floor of 3, with criterion means silhouette 4.86, cluster discipline 3.86, value separation 3.21, palette craft 3.21, edge language 3.00, lighting 2.21.
- The 4.0 bar is documented as unreachable in `docs/rubric.md`, with a target vector that cannot arithmetically reach it. Continuing to impose it as a hard AC makes every quality track fail by construction.
- Two different judging instruments produced the two most recent records. A 0.21 gap against the bar is smaller than the observed instrument spread, so further feature work cannot be judged reliably until the instrument is fixed.
- The right next investment is a decision and a baseline, not another primitive.

## Goals & Success Metrics

- **One binding gate.** The publishable tier (mean ≥ 3.5, floor ≥ 3.0) is the shipping gate; 4.0 remains an explicitly unreachable aspiration and no future AC fails solely for missing it.
- **One frozen instrument.** The baseline is scored with `scripts/rubric.mjs`, using the Gemini API model `gemini-4-hydrogen` through the existing local credential; if that model cannot be used after one attempt, `gemini-3.5-flash-lite` is used and the substitution is recorded as a deviation.
- **One honest baseline.** All seven current v2 assets are scored in two faithful views, with the verdict recomputed from the recorded scores. A failing verdict is recorded as failure; scores are never revised upward to pass.
- **Provenance kept.** The current agent-vision record and the earlier flash-lite record remain as immutable files in the repository.
- **No engine change.** Every committed render digest stays byte-identical; the engine and its test suite take no network dependency.

## Scope

### In Scope

- Update `docs/rubric.md` with a dated decision making the publishable tier the binding shipping gate and explicitly stating that the exceptional 4.0 tier is unreachable, not a failing criterion for future tracks.
- Extend the gate-contract test so the documented gate and the score record's `threshold_mean` / `min_allowed` cannot drift apart silently, and so the exceptional tier must remain declared unreachable with dated evidence.
- Preserve the current `test/art/scores.json` byte-for-byte as `test/art/scores-agent-vision.json` before writing the new baseline. Keep `test/art/scores-before-intent.json` unchanged.
- Record an explicit instrument block in the new `scores.json`: script, model, optional fallback model, faithful views, asset set, date, and the gate decision it is scored against.
- Re-score the seven assets under `test/art/v2/`, two passes per asset: pass A on the exact factor-8 nearest-neighbour upscale, pass B on the engine debug sheet. Raw 1× PNGs remain refused.
- Use `scripts/rubric.mjs` with `gemini-4-hydrogen` (Gemini API model id) and the existing local credential source. After one failed attempt, fall back to `gemini-3.5-flash-lite`, record the reason and model in the evidence, and never invent scores.
- Recompute the verdict from the recorded scores. If the result fails the publishable gate, record the failing assets and criteria exactly.
- Write `verification/baseline.md` with the gate decision, instrument, model actually used, per-asset means, per-criterion means, instrument spread note, provenance paths, and the pass/fail verdict.
- Keep schema version 3 for the score record so the existing integrity suite can validate it.
- Verify with `pnpm verify` and `pnpm vitest run --coverage`.

### Out of Scope

- No new drawing op, renderer change, MCP tool, or CLI verb.
- No change to the six rubric criteria, their 1/3/5 anchors, or the two faithful views.
- No network call in the engine, engine tests, or CI; `scripts/rubric.mjs` remains the only networked component and stays human-run.
- No lowering of a bar by editing anchors, excluding failures, deleting below-floor scores, or re-running the judge until a desirable number appears.
- No modification of archived tracks, their specs, or their recorded outcomes.
- No re-scoring of the seven original v1 art assets; they stay as provenance under `test/art/`.
- No animation, sprite sheets, tilemaps, GUI, translucent alpha, style transfer, or generated reference images.

## Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | `docs/rubric.md` declares the publishable tier (mean ≥ 3.5, floor ≥ 3.0) as the binding shipping gate and records, with a dated decision, that the 4.0 exceptional tier is unreachable and not a track-failing criterion. | must |
| FR-2 | A gate-contract test parses the documented tiers and rejects drift between the documented publishable mean/floor and `scores.json`'s `threshold_mean` / `min_allowed`; it also keeps the "exceptional unreachable with dated evidence" check. | must |
| FR-3 | Before the new baseline is written, the current `test/art/scores.json` is copied byte-for-byte to `test/art/scores-agent-vision.json`; `test/art/scores-before-intent.json` is unchanged. | must |
| FR-4 | The new `scores.json` records an explicit instrument object naming `scripts/rubric.mjs`, the model used, any fallback model, the two faithful views, the asset set, the date, and the gate decision. Every vision pass names the model actually used. | must |
| FR-5 | All seven assets under `test/art/v2/` are scored twice: pass A on the exact factor-8 nearest-neighbour upscale and pass B on the debug sheet; a raw 1× PNG path remains invalid. | must |
| FR-6 | Scoring first attempts `gemini-4-hydrogen`. If that call fails or returns invalid scores, one fallback attempt uses `gemini-3.5-flash-lite`, and the reason plus replacement model are recorded in `verification/baseline.md`. | must |
| FR-7 | The verdict is recomputed by the existing record logic from the scores actually written; failures list exactly the below-floor criteria. No verdict or score is hand-adjusted to pass. | must |
| FR-8 | The hero digest, four v1 benchmark digests, seven v1 art digests, and seven v2 art digests are unchanged. | must |
| FR-9 | The scored asset set is exactly the seven v2 assets: potion, sword, humanoid, chest, character, prop, scene. | must |
| FR-10 | `verification/baseline.md` reports the gate decision, instrument, model used, per-asset means, per-criterion means, instrument-spread caveat, provenance paths, and the honest pass/fail verdict. | must |
| FR-11 | Documentation states that future tracks must use the publishable gate in their acceptance criteria and that 4.0 remains an aspiration only. | must |
| FR-12 | No new runtime dependency is added; the engine and its test suite contain no network-capable imports, and `scripts/rubric.mjs` remains the only networked file. | must |

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-1 | Byte identity holds for every committed render digest; no recipe, PNG or `.sha256` fixture changes. |
| NFR-2 | `package.json` and `pnpm-lock.yaml` are unchanged; exactly one production dependency remains. |
| NFR-3 | `pnpm verify` and `pnpm vitest run --coverage` both exit 0. |
| NFR-4 | No coverage threshold is lowered, no exclude is widened, no ignore comment is added, and no existing assertion is weakened to make the gate pass. |
| NFR-5 | `test/art/scores.json` stays schema 3-compatible and is validated by the existing integrity suite, extended only for the new instrument metadata. |
| NFR-6 | Networked scoring is never imported by the engine, tests, or CI; credentials are read in place and never written to the repository. |

## Acceptance Criteria

| ID | Criterion | Verifies |
|---|---|---|
| AC-1 | The target table names publishable mean 3.5 and publishable floor 3.0 as the binding gate, and declares the exceptional tier unreachable with dated evidence. | FR-1, FR-11 |
| AC-2 | `scores.json` has `threshold_mean: 3.5` and `min_allowed: 3.0`, and the gate-contract test fails if either drifts from the document. | FR-2, NFR-5 |
| AC-3 | `scores-agent-vision.json` is byte-identical to the pre-track `scores.json`, and `scores-before-intent.json` is unchanged. | FR-3 |
| AC-4 | The instrument block names `scripts/rubric.mjs` and the model actually used; every vision pass names that model or the recorded fallback, and no credential value appears in the repository. | FR-4, NFR-6 |
| AC-5 | The record contains exactly seven assets with two passes A/B each, all artifact paths faithful (`.8x.png` for pass A, `.debug.png` for pass B), and `test/art/rubric.test.ts` passes. | FR-5, FR-9, NFR-5 |
| AC-6 | Either `gemini-4-hydrogen` produced all 14 passes, or `verification/baseline.md` names the failure and the `gemini-3.5-flash-lite` fallback used instead. | FR-6 |
| AC-7 | The recorded verdict exactly matches what the recorded scores imply at the publishable gate; a failing result lists every below-floor score and none of them was removed. | FR-7 |
| AC-8 | All 19 committed digests remain unchanged and no file under `test/goldens/`, `test/benchmarks/*/`, `test/art/*/`, or `test/art/v2/*/` with a `.sha256` extension is modified. | FR-8, NFR-1 |
| AC-9 | The dependency manifest and lockfile are unchanged, and one production dependency remains. | FR-12, NFR-2 |
| AC-10 | No networked import appears in `src/`, `test/` or CI; only `scripts/rubric.mjs` retains network access. | FR-12, NFR-6 |
| AC-11 | `verification/baseline.md` records the full baseline and explicitly states whether the publishable gate was met. | FR-10 |
| AC-12 | Both `pnpm verify` and `pnpm vitest run --coverage` exit 0 with no threshold, exclude, or ignore-comment change. | NFR-3, NFR-4 |

## Edge Cases

- If `gemini-4-hydrogen` returns malformed JSON, that is a failed attempt: record it, fall back once to `gemini-3.5-flash-lite`, and never hand-edit a score to make the reply valid.
- If the fallback also fails, stop the track as blocked; do not fall back to `agent-vision` or invent scores.
- If a pass artifact is missing, regenerate it with the deterministic local upscaler/renderer; do not score a raw 1× PNG.
- If a below-floor score is a single-criterion outlier, keep it; the instrument spread is documented, not used as a reason to delete evidence.
- If the recomputed verdict passes the publishable gate, say so plainly; if it fails, say so plainly. Neither result is revised by re-running the model.
- If a future spec still states 4.0 as a hard AC, documentation must make clear it is an aspirational tier, not the shipping gate; this track does not edit archived specs.
- If the gate test cannot parse the target table, fail loudly rather than defaulting to old numbers.
- If the current `scores.json` is already modified before provenance copy, stop and report rather than copying an unexpected file.

## Dependencies

- **Tracks:** none outstanding. All ten archived tracks are merged into `main`.
- **External:** a local Gemini API credential is available through the existing opencode config; `scripts/rubric.mjs` reads it in place. No new credential is committed.

## Open Questions & Assumptions

- **Assumption:** the owner-approved publishable tier in `docs/rubric.md` is authoritative for shipping decisions; this track makes that explicit rather than inventing a new bar.
- **Assumption:** `gemini-4-hydrogen` is reachable through the configured Gemini OpenAI-compatible endpoint with id `gemini-4-hydrogen` (verified from Google's model documentation on 2026-11-17).
- **Assumption:** the seven v2 assets are the correct current representation of the engine's authoring path because they carry design intent and project style; the v1 assets remain provenance.
- **Assumption:** a single instrument with one recorded model is enough to decide the publishable gate; the historical 3.69 and 3.39 records are provenance, not comparable data points after the model change.
- **Resolved during definition:** preserve both prior records; bind publishable 3.5/3.0; use Gemini 4 Hydrogen first with a recorded flash-lite fallback; keep schema 3.
- **Open:** none blocking.

## References

- `docs/rubric.md` — six criteria, anchors, target vector, publishable/exceptional tiers.
- `test/art/scores.json` — current agent-vision baseline at mean 3.39.
- `test/art/scores-before-intent.json` — earlier flash-lite record at mean 3.69.
- `test/art/rubric.test.ts` — schema-3 integrity checks and verdict recomputation.
- `scripts/rubric.mjs` — the only networked scorer, human-run and imported by nothing.
- `conductor/archive/20261113-rubric-calibration/`, `conductor/archive/20261113-rubric-ceiling-probe/`, `conductor/archive/20261113-rubric-view-comparison/` — calibration evidence for the unreachable 4.0 tier and view rules.
- `conductor/archive/20261117-authoritative-design-intent/verification/phase-6-scoring.md` — the current rejected baseline and its instrument caveat.
