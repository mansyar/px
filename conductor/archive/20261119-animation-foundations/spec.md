# Animation Foundations — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not renumber it. If a requirement is removed, mark it `Withdrawn` instead of deleting it.

## Overview

This track delivers the first deterministic Phase 2 animation slice: an additive, version-gated recipe field for additional frames, multi-frame compilation that reuses the existing op/PNG path, and an opt-in sprite-sheet PNG plus additive per-frame metadata. It proves the frame/sheet contract with a new golden fixture and leaves every Phase 1 recipe, golden digest, export byte, meta field and gate score unchanged.

## Problem / Motivation

Today a recipe compiles to exactly one static image (`compileRecipe` → `rasterizeSlots` → `encodePng`), and `render --export` writes one PNG plus one meta file. Animation, onion-skinning and sprite-sheet packing are explicit Phase 2 non-goals (`conductor/product.md:51`). Without a frame model, every animated asset would need either duplicated recipes (splitting the single-source-of-truth invariant) or a parallel sidecar format (splitting asset state). If foundations are not established now with version gating, later Phase 2 work risks silently changing Phase 1 byte digests or bypassing the proven determinism gates.

## Goals & Success Metrics

- **Goal:** prove that multi-frame recipes compile and export deterministically without altering Phase 1 behavior.
- **Metric:** a new 2-frame golden fixture renders twice to an identical sheet SHA-256; `pnpm verify` exits 0; scoped coverage stays ≥80%; `test/art/scores.json` SHA-256 remains `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`; `hero.sha256`, existing meta-export/parity tests, and all 18 archived tracks remain untouched.

## Scope

### In Scope

- New accepted recipe version `1.4` with an optional top-level `frames` array; `frames` is rejected on older versions with a structured error naming `1.4`.
- Frame model: top-level `layers` are frame 0; each `frames[i]` supplies additional frame `id` and `layers`; optional `duration` is recorded but not interpreted by this slice. All frames share the base canvas size, palette and design.
- Multi-frame compile: frame 0 output (`flattened`/`layers`/`owners`, render PNG, debug sheet, lint findings) stays byte-identical; additional frames compile through the same stateless op pipeline.
- Per-frame lint: each frame is linted independently; additive `frame` field on findings; existing severity/code/coord ordering preserved, with frame order as the outer sort.
- Opt-in sheet export: when a framed recipe is rendered with `--export`, additionally write `<stem>.sheet.png` and `<stem>.sheet.meta.json`; no new CLI verb or MCP tool.
- Additive sheet metadata: `sheet` block in generic metadata listing frame order, id, rect, trim, origin and duration; `v` unchanged; single-frame recipes emit no `sheet` field.
- One new golden fixture with committed sheet SHA-256, determinism test, updated CLI `--help`/MCP tool descriptions and a short `docs/animation.md`.

### Out of Scope

- Onion-skin debug view, playback runtime, frame interpolation, event/animation timelines.
- New CLI command or new MCP tool; new `--sheet`/`--frames` flag.
- Tilemaps, GUI surfaces, translucent alpha, RNG, npm publishing, non-Godot exports.
- Any change to engine ops, linter rule thresholds, rubric, CI config, `scores.json`, archived tracks, product/guideline/spec documents, or new dependencies.
- Re-baselining `hero.sha256` or any existing golden; recipes over ~2,000 ops per frame.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Accept recipe version `1.4`; reject `frames` on versions `<1.4` with a structured error naming the required version; reject empty `frames` arrays and duplicate/empty frame ids. | must |
| FR-2 | Canonicalize and round-trip `frames` byte-identically; v1.4 recipes without `frames` behave as v1.3 recipes apart from the version literal. | must |
| FR-3 | Compile frame 0 identically to today and compile each additional frame with the same op pipeline, sharing the base canvas size, palette and design. | must |
| FR-4 | Lint every frame independently; add an optional `frame` field to findings and keep deterministic order (frame order, then existing severity/code/coord). | must |
| FR-5 | When `--export` is used on a framed recipe, write a deterministic single-row sheet PNG using the existing PNG encoder, plus a sibling sheet meta file; omit both when `--export` is absent or the recipe is single-frame. | must |
| FR-6 | Add an additive `sheet` block to generic metadata with frame index, id, x/y/width/height, trim, origin and duration; keep existing top-level metadata fields and `v` unchanged. | must |
| FR-7 | Ship a new 2-frame golden fixture plus committed sheet SHA-256; prove two identical renders and keep all existing goldens/gates green. | must |
| FR-8 | Update `--help`/MCP `px_render` descriptions and `docs/animation.md` to describe the frame/sheet contract without changing the response envelope. | should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No change to Phase 1 byte digests: existing recipes, `hero.sha256`, meta-export/parity assertions, `scores.json`, archived files and CI config stay byte-identical. |
| NFR-2 | `pnpm verify` exits 0; scoped coverage `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` stays ≥80% on all four metrics. |
| NFR-3 | Determinism: sheet output is a pure function of the recipe; no RNG, timestamps, absolute paths or host-dependent ordering. |
| NFR-4 | No new dependency; version-gated additive schema; recipe op count stays <~2,000 per frame; expensive sheet output remains opt-in via `--export`. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `version: "1.4"` parses; `frames` on v1.3 is rejected with an error naming 1.4; empty/duplicate frame ids fail validation. | FR-1 |
| AC-2 | A v1.4 recipe with frames canonicalizes and re-parses byte-identically; v1.4-without-frames round-trips and renders as v1.3. | FR-2 |
| AC-3 | Frame 0 render SHA equals the legacy single-frame render of the same layers; additional frames compile to expected pixel hashes. | FR-3 |
| AC-4 | Each frame's lint findings are reported with the correct `frame` id and deterministic ordering; `--strict` gates on any frame. | FR-4 |
| AC-5 | `--export` on the fixture writes `<stem>.sheet.png` and `<stem>.sheet.meta.json`; without `--export` or on single-frame recipes neither file is created. | FR-5 |
| AC-6 | Sheet PNG is a single left-to-right row of full canvases; two renders produce the same committed SHA-256; existing PNG encoder untouched. | FR-5, FR-7 |
| AC-7 | Sheet meta contains ordered per-frame rect/trim/origin/duration; existing `v`, anchors, offset, palette and recipe_hash fields unchanged. | FR-6 |
| AC-8 | New fixture has a committed sheet SHA-256 and passes the goldens determinism test twice; `hero.sha256` is unchanged. | FR-7 |
| AC-9 | CLI `--help` and MCP `px_render` tool description mention framed sheet export; `docs/animation.md` exists; response envelope unchanged. | FR-8 |
| AC-10 | `pnpm verify` exit 0; scoped coverage ≥80%; `scores.json` SHA unchanged; no tracked changes outside the approved scope. | NFR-1, NFR-2 |
| AC-11 | Final record states an honest pass/fail with evidence; no score, rationale, digest, archive or golden was re-baselined. | NFR-1, NFR-3 |

## Edge Cases

- `v1.4` with no `frames` must be a pure additive version bump, not a behavior change.
- `frames` present with an empty array is rejected; ids must be non-empty and unique within the recipe.
- All frames inherit base canvas size/palette/design; a frame op that writes outside the canvas clips and warns exactly as today.
- `--export` is the only trigger for sheet artifacts; `--debug` remains a separate opt-in view for frame 0 only.
- Sheet meta is additive: consumers that ignore unknown fields see the old shape.
- If any frame fails `--strict` lint, render exits 3 and sheet artifacts are not written.
- No cross-instrument scoring, no score re-rolls, no rationalization of judge output.

## Dependencies

- **Tracks:** `20261118-gate-publishable-pass`, `20261118-phase1-closeout-audit`, `20261119-engineering-debt-sweep`, `20261119-godot-export-validation` (all complete; merge commits ancestors of base `d082eae`).
- **External:** none. No credentials, network, Godot runtime, or VLM scoring needed.

## Open Questions & Assumptions

- **Assumption:** frame 0 is the existing top-level `layers`/`render` output; `frames` lists only additional frames, avoiding duplicated ops and preserving all Phase 1 callers.
- **Assumption:** sheet packing is a single left-to-right row of full canvases; packing parameters are not configurable in this slice.
- **Assumption:** `duration` is metadata for future playback; this slice records it but does not interpret it.
- **Assumption:** version literal is `1.4`; `LATEST_RECIPE_VERSION` remains `1.1` because it controls `px init` write defaults, not the highest accepted version.
- **Assumption:** additive metadata fields do not require bumping meta `v`, following the project's additive-only envelope rule.

## References

- `conductor/product.md:49-57` (Phase 2 deferred scope), `:77` (scope-creep risk), `:98` (Phase 1 closeout note).
- `conductor/tech-stack.md:161-168` (schema 1.2 additive-version precedent), `:109-113,131-133` (determinism/tooling constraints).
- `conductor/workflow.md` (verification layers, coverage gate, evidence paths, git/review/PR rules).
- `src/core/recipe/types.ts:526,529,590-600`; `src/core/recipe/normalize.ts:1760-1944`; `src/core/recipe/serialize.ts:284-304`; `src/core/compile.ts:104-281`; `src/render/png.ts:102-127`; `src/meta/index.ts:106-150`; `src/mcp/tools.ts:38-50,64-321`; `test/mcp/meta-export.test.ts:39-81`; `test/goldens/render.test.ts:10-33`.
- `docs/art-profiles.md`, `docs/lint-thresholds.md`, `conductor/product-guidelines.md:30-41,43-61`.
