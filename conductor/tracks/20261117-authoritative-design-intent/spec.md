# Authoritative Design Intent — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Add an authoritative **intent layer** above the geometry layer of `px`. A recipe may carry a versioned `design` block describing the picture as a whole — subject, one light direction, part hierarchy, target values, a three-class edge vocabulary and named material ramps — and a project `px.style.json` supplies set-level defaults. The shading passes read those decisions as defaults, an explicit op flag overrides them and the override is reported, and a new `harmonize` pass rewrites the whole sprite from them. Four additions to the tool surface (`brief`, blockout/value render modes, `critique`, `fix`) let an agent plan before drawing and receive a gap report with applyable corrections instead of local lint codes alone. The seven benchmark assets are then re-authored on this surface and re-scored with the **same** rubric and instrument, so the track ends with a measurable answer rather than another capability claim.

## Problem / Motivation

Six merged tracks after the original quality failure added authoring primitives — facing, stroke, texture, surface fidelity, surface resolution, lighting recovery — and the rubric mean moved **3.79 → 3.73 → 3.71 → 3.69**. The later rubric tracks changed the instrument rather than the art: calibration found only 3 of 6 criteria separate reliably, a ceiling probe found a 4-anchor on `palette_craft`, and view comparison refused the 1× view at every size (mean |Δ| 0.42 and 0.58 against a 0.25 tolerance), settling on 8× and the debug sheet.

Current criterion means across all 84 recorded scores: `silhouette` 4.79, `cluster_discipline` 4.07, `value_separation` 3.79, `palette_craft` 3.36, `lighting` 3.07, `edge_language` 3.07. Shape and pixel grouping are solved. The three weak criteria are all **global design decisions** — does one light hold across every part, does an edge mean the same thing at the silhouette and at a material boundary, do the ramps belong to the same object.

The root cause is structural: a recipe records *marks* (coordinates, slots, parts) and has no object that represents the *picture*. The agent therefore holds the design in its context window and re-derives it at every call, so it drifts. The engine can only check local legality; it cannot say "op 14 contradicts your declared light", because no light was declared. Every low-score rationale repeats the same whole-picture complaint — symmetric vertical bands, detail edges indistinguishable from silhouette, arbitrary ramps — which no new op can fix.

If this is not solved, the project keeps shipping primitives that test green and do not improve the art, and the quality claim stays unmet indefinitely.

## Goals & Success Metrics

- **Goal:** the whole-picture decisions become validated data that the agent authors once and the engine enforces everywhere.
- **Metric:** seven re-authored assets reach rubric mean ≥ 4.0 with no criterion below 3, on the same instrument used to record 3.69.
- **Goal:** a tool-only agent can author intent without hand-editing a recipe, and receives an actionable correction instead of a code.
- **Metric:** every `design` field and every new verb reachable through both CLI and MCP, asserted by a bidirectional reachability test; every `critique` finding carries an applyable op.
- **Goal:** compatibility preserved.
- **Metric:** every committed 1.0 and 1.1 recipe renders byte-identically, with no silent version promotion.
- **Goal:** the correction loop gets shorter.
- **Metric:** the re-authoring transcript records calls per asset against the previous round, with the authoring/inspection split reported rather than hidden.

## Scope

### In Scope

- Recipe schema `1.2` with a `design` block: `subject`, `light`, `hierarchy`, `values`, `edges` (`silhouette`, `material`, `detail`), `materials`, and a `style` reference.
- **Authoritative semantics:** `design` supplies defaults for the shading passes; an explicit op flag overrides it; every override is reported as a deviation in responses, never silently accepted.
- Project-level `px.style.json`: allowed ramps, edge vocabulary, default light, minimum contrast and value-hierarchy rules; assets inherit via `"style": "@project"`.
- Intent validation in `validate` and at parse time, with `E_INTENT_*` codes and actionable hints.
- `light`, `auto_outline`, `ramp_fill` and `auto_shade` read `design` defaults; a new `harmonize` pass rewrites light, edge treatment and value structure across the whole sprite without touching geometry or ownership.
- `px brief <subject> --size N` — built-in structured design scaffolds (part list, proportion ranges, hero part, value hierarchy) for known subjects; no network, no generated images.
- Render modes `--blockout` and `--values N` — masses and a grey posterisation, no recipe writes, no new raster ops.
- `px critique` — whole-image gap report with intended vs observed per criterion, ranked fixes, each carrying `{op, why, expected_delta}`, plus a stagnation signal.
- `px fix --finding N` applies a suggested fix and re-renders; stale fixes raise `E_FIX_STALE`.
- MCP parity for every new verb and parameter **in the same commit** as the CLI, with a bidirectional `inputSchema.properties` reachability test.
- Canonical serialisation and round-trip of `design`, with a fixed key order and recipe hashing.
- Seven assets re-authored with `design` blocks and style inheritance, written as **new files** so the previous assets and their digests remain intact.
- Re-scoring with the unchanged rubric, unchanged criteria anchors, unchanged 8×/debug views and two passes per asset; verdict recomputed from the record.
- Determinism, coverage, bounded-response and performance guarantees listed in NFRs.

### Out of Scope

- New raster primitives. The geometry layer is not the bottleneck.
- Changing rubric criteria, anchors, scoring views, pass counts or the 4.0 threshold.
- Network calls or generated reference imagery inside the engine; `brief` templates are built-in data.
- Style transfer, animation, onion skinning, sprite sheets, tilemaps, a GUI, translucent alpha, or other engine export formats.
- Republishing the package or changing semver.
- Lowering the quality bar, selecting a favourable pass, or re-baselining an original asset digest.
- Changing how a 1.0 or 1.1 recipe renders.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Recipe version `1.2` accepts a `design` block with `subject`, `light`, `hierarchy`, `values`, `edges` (`silhouette`, `material`, `detail`), `materials` and `style`. | must |
| FR-2 | `design` is authoritative: its values are pass defaults; an explicit op flag overrides them; every override is reported as a deviation in the response. | must |
| FR-3 | `px.style.json` at the project root declares allowed ramps, edge vocabulary, default light, minimum contrast and value rules; `"style": "@project"` inherits it. | must |
| FR-4 | Intent validation rejects unknown light, unknown edge treatment, a hierarchy naming an undeclared part, values outside 1–5, a missing style file and an unknown ramp, with `E_INTENT_*` codes and hints. | must |
| FR-5 | `light` uses `design.light` as its default angle; an explicit `angle` on the op still wins. | must |
| FR-6 | `auto_outline` resolves `design.edges` by edge class so silhouette, material and detail boundaries are distinct, deterministic treatments. | must |
| FR-7 | `ramp_fill` and `auto_shade` resolve their target tones from `design.values` for the owning part. | must |
| FR-8 | `harmonize` rewrites light, edge treatment and value structure across every part from `design`, leaving geometry and ownership arrays unchanged, and reporting `W_HARMONIZE_NOOP` when nothing changes. | must |
| FR-9 | `px brief <subject> --size N` emits a structured scaffold from built-in templates with parts, proportion ranges, hero part and value hierarchy; an unknown subject raises `E_SUBJECT_UNKNOWN` listing known subjects. | should |
| FR-10 | `--blockout` and `--values N` render masses and a grey posterisation without writing a recipe or changing the committed PNG. | should |
| FR-11 | `px critique` returns a gap report: intended vs observed per criterion, ranked, each fix carrying `{op, why, expected_delta}` and an index. | must |
| FR-12 | `px fix --finding N` applies a fix and re-renders; a fix that no longer applies raises `E_FIX_STALE`; a no-op raises `W_FIX_NOOP`. | must |
| FR-13 | `critique` reports a stagnation signal when a configured number of consecutive calls produces no silhouette or value-structure change. | should |
| FR-14 | Every new verb and parameter exists in the MCP tool set in the same commit as the CLI path; the reachability test asserts both that each CLI flag is emitted and that each MCP parameter is published in `inputSchema.properties`. | must |
| FR-15 | Every `design` field is authorable through CLI and MCP without hand-editing a recipe. | must |
| FR-16 | Canonical serialisation writes `design` in a fixed key order, round-trips unchanged and contributes to the recipe hash. | must |
| FR-17 | A `design` block requires version `1.2`; a 1.0/1.1 document declaring one is rejected with `E_BAD_VERSION`, never silently promoted; 1.0/1.1 recipes render byte-identically. | must |
| FR-18 | Seven assets are re-authored as new files with `design` blocks and style inheritance; their originals and digests remain untouched. | must |
| FR-19 | The seven assets are re-scored with the unchanged rubric, criteria anchors and views, two passes each, and the verdict is recomputed from the record rather than trusted. | must |
| FR-20 | The measured result is recorded honestly: if the mean is below 4.0 or any criterion below 3, AC-14 fails and the bar is not lowered. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Rendering stays byte-identical across the Windows and Linux CI matrix; a `design` change is a byte-level change and is versioned accordingly. |
| NFR-2 | Exactly one runtime dependency (`@modelcontextprotocol/sdk`); brief templates, intent validation and harmonisation are hand-written. |
| NFR-3 | Coverage ≥ 80 % statements and branches over `src/core`, `src/lint` and any new pure module; thresholds, excludes and ignore comments unchanged. |
| NFR-4 | Responses stay bounded at 256×256: `critique` caps fixes at 20 with a total count and truncated marker, and never emits an unbounded panel. |
| NFR-5 | No network calls, telemetry or data leaving the machine; vision scoring remains a human-run script imported by nothing. |
| NFR-6 | Node 24, ESM, strict TypeScript; no new build tool. |
| NFR-7 | 256×256 with 2,000 ops and a full `light` + `harmonize` pass stays under 500 ms median of five runs after warm-up. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | A `design` block round-trips canonically and the recipe records version `1.2`. | FR-1, FR-16 |
| AC-2 | Every committed 1.0 and 1.1 recipe renders byte-identically; declaring `design` under 1.0 raises `E_BAD_VERSION` with no promotion. | FR-17 |
| AC-3 | An asset inheriting `@project` resolves a named ramp from `px.style.json`; a disallowed ramp raises an intent error naming the style file. | FR-3, FR-4 |
| AC-4 | `light` uses `design.light` by default, an explicit `angle` overrides it, and the override appears in the response deviations. | FR-2, FR-5 |
| AC-5 | `auto_outline` produces three distinguishable treatments for silhouette, material and detail edges from `design.edges`. | FR-6 |
| AC-6 | `harmonize` changes shade, edge and value structure across all parts while the geometry and ownership arrays are byte-for-byte unchanged. | FR-8 |
| AC-7 | `px brief` emits parts, proportion ranges and a hero part for at least three known subjects without network access; an unknown subject lists the known ones. | FR-9 |
| AC-8 | `--blockout` and `--values 5` produce the requested views without writing a recipe or changing the committed PNG digest. | FR-10 |
| AC-9 | Every `critique` fix carries an op, a rationale and an expected delta, and applying it through `px fix` changes the render. | FR-11, FR-12 |
| AC-10 | `critique` reports stagnation after the configured number of unchanged calls and stops reporting it once the picture changes. | FR-13 |
| AC-11 | Every new verb and parameter is reachable through MCP and asserted in `inputSchema.properties` in both directions. | FR-14, FR-15 |
| AC-12 | All seven re-authored assets exist as new files with `design` blocks, and every original digest is unchanged. | FR-18 |
| AC-13 | The re-score record uses the rubric schema version current before this track, contains two passes per asset, and its verdict matches a recomputation from its own scores. | FR-19 |
| AC-14 | **The measured mean reaches at least 4.0 with no criterion below 3.** This criterion can fail the track. | FR-20 |
| AC-15 | A 256×256 critique response caps its fix list at 20 and reports the true total. | NFR-4 |
| AC-16 | A 256×256 scene with 2,000 ops, `light` and `harmonize` renders under 500 ms median of five runs. | NFR-7 |
| AC-17 | No new runtime dependency, and the coverage gate passes on the enlarged include list. | NFR-2, NFR-3 |

## Edge Cases

- `design.light` names an unknown direction → `E_INTENT_LIGHT` with the legal list.
- `hierarchy` names an undeclared part → `E_INTENT_HIERARCHY` naming the part.
- A `values` entry is outside 1–5 or non-integer → `E_INTENT_VALUE`.
- A `design` block on a `1` / `"1.0"` / `"1.1"` recipe → `E_BAD_VERSION`, no promotion, no write.
- `"style": "@project"` with no `px.style.json` → `E_STYLE_MISSING` with the expected path.
- An explicit op flag equal to the design default → no deviation reported; only real divergences count.
- `harmonize` on a part-less or unfaced recipe → `W_HARMONIZE_NOOP`, no byte change.
- `px brief` for an unknown subject → `E_SUBJECT_UNKNOWN` listing known subjects.
- `critique` on an empty canvas → no fixes and `W_CRITIQUE_EMPTY`, not a fabricated report.
- A fix applied after the picture changed → `E_FIX_STALE` naming the finding and the current digest.
- A re-scored asset scores lower than before → recorded as-is, never rolled back or re-rolled.
- A style file change invalidates an existing asset → the next `validate` reports it without rewriting the asset.
- A critique at 256×256 with thousands of candidate fixes → capped list plus a true total and truncated marker.
- `harmonize` never changes geometry or ownership, including with cast shadows, cleanup ops and named refs present.

## Dependencies

- **Tracks:** none outstanding. All nine prior tracks are complete and merged; specifically `20261113-rubric-view-comparison` (PR #10) settled the 8× and debug scoring views this track must reuse. Dependency satisfaction is verified live against `origin/main` before materialisation.
- **External:** none. Vision scoring runs as a human-invoked script with credentials supplied at run time; the engine and test suite take no network dependency.

## Open Questions & Assumptions

- **Assumption (load-bearing and unproven):** the missing whole-picture object, not another primitive, is what limits quality. This track is the experiment. If AC-14 still fails, the result is recorded and the bar is not lowered — the next investigation changes the hypothesis, not the score.
- **Assumption:** built-in brief templates are sufficient to remove proportion guesswork; subject-specific reference images and network access stay out of scope.
- **Assumption:** rubric noise (up to 1.33 on an asset mean) is tolerable for a before/after comparison because the same instrument, views and criteria anchors are used on both sides; a 0.2 difference remains indistinguishable from the bar and must be reported as such.
- **Assumption:** `design` describes the whole sprite; per-part plane orientation remains the existing `facing` field, so the two layers do not conflict.
- **Assumption:** one project-level `px.style.json` is enough for the seven-asset benchmark set; multi-style projects are a later concern.
- **Assumption:** explicit op overrides are legitimate authoring, so they are reported rather than rejected; authoritative means *defaults come from design*, not *no escape hatch*.
- **Resolved during definition:** track type `feature`, priority `high`, full loop including re-scoring, and the authoritative (not advisory) semantics were decided with the user before drafting.

## References

- This design discussion: authoritative `design` block, three-layer model (intent / geometry / feedback), four-verb loop, five-phase structure.
- `conductor/product.md`, `conductor/product-guidelines.md`, `conductor/tech-stack.md`, `conductor/workflow.md`.
- `test/art/scores.json` — current record, mean 3.69, criterion means and the single below-floor cell.
- `docs/rubric.md` — six criteria, 1/3/5 anchors, schema 3 record shape, view decision.
- `conductor/archive/20261113-static-art-quality/verification/phase-7-scoring.md` — original failure diagnosis.
- `conductor/archive/20261113-authoring-primitives/`, `.../20261113-surface-fidelity/`, `.../20261113-surface-resolution/`, `.../20261113-lighting-recovery/` — the four primitive tracks whose scores did not improve.
- `conductor/archive/20261113-rubric-calibration/`, `.../20261113-rubric-ceiling-probe/`, `.../20261113-rubric-view-comparison/` — the instrument tracks whose conclusions this track must reuse rather than revisit.
