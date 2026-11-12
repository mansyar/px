# Phase 1 — Static Sprite Drawing Engine — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

> **Amended in review round 1, 2026-11-13.** No IDs changed. `FR-6` dropped the
> `pixel_perfect` option: a two-point Bresenham segment cannot emit the L-shaped
> corner the flag claimed to remove, so the flag could never change a pixel
> (approved by the user rather than inventing new line semantics). `AC-5` lost
> its matching corner-removal clause. `FR-22` went from six MCP tools to seven,
> adding `px_validate`, because `validate` was reachable from the CLI but not
> from an MCP client, which left MCP-only agents unable to lint without writing
> a PNG.

## Overview

Deliver the Phase 1 of px: a deterministic pixel-art engine that compiles
declarative `.px.json` recipes into byte-identical PNG sprites, engine-ready
metadata, and symbolic feedback for AI agents. The track covers the recipe
format, an indexed slot canvas, the full static op set, the linter and debug
sheet, and both the CLI and MCP interfaces.

## Problem / Motivation

Generative image models fail at production pixel art structurally:
anti-aliased edges, inconsistent pixel grids, and hallucinated detail that
cannot be corrected one pixel at a time. An agent needs a surface where every
write is exact, every error is actionable, and every render is reproducible —
and where correcting a single pixel costs one call, not a regeneration.

## Goals & Success Metrics

- **Goal:** a fresh agent, given only tool documentation, authors all four
  benchmark assets.
- **Metric:** zero `OUT_OF_BOUNDS` and `ORPHAN_PIXEL` findings, silhouette rated
  ≥ 4/5, within **12 tool calls** per asset.
- **Goal:** provable determinism.
- **Metric:** identical PNG SHA-256 across repeated runs and across Windows and
  Linux CI.
- **Goal:** palette swaps are free.
- **Metric:** a palette swap produces a valid sprite with zero recipe edits.

## Scope

### In Scope

- `.px.json` recipe format, canonical serialization, validation.
- Indexed per-layer slot canvas; binary alpha only.
- Full static op set: geometry, fills, `ascii_blit`, `mirror`, `auto_outline`,
  `auto_shade`, `ramp_fill`, `replace_slot`, erase.
- 1× RGBA8 PNG export, optional indexed PNG.
- `asset.meta.json` with Godot 4 and generic blocks.
- Opt-in annotated debug sheet.
- ASCII region inspection with a returned legend.
- Four linter rules with severities and strict mode.
- CLI and MCP server over one core, sharing one op semantics.
- Package scaffold, build, and CI activation.
- Four benchmark recipes and calibration.

### Out of Scope

- Animation, onion-skinning, sprite-sheet packing.
- Tilemaps and auto-tiling.
- Interactive GUI editor.
- Translucent alpha (`alpha_mode: "translucent"` is rejected).
- Any randomized op — no RNG in the engine.
- npm publication, semver, changelog.
- Engine exports other than Godot 4 and the generic schema.
- HTTP transport (stdio only).

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | A recipe declares `version`, `meta` (name, width, height, alpha_mode), `palette`, `anchors`, and ordered `layers[]` of `ops[]` | must |
| FR-2 | Recipes serialize canonically: expanded JSON objects, stable key order, and round-trip byte-identically. Compact tuples are accepted on input and normalized on save | must |
| FR-3 | Validation rejects unknown slots, non-binary alpha, canvas sizes outside 8–256, malformed legends, duplicate layer ids, and missing params, each with a distinct error code, an op index where applicable, and a corrective hint | must |
| FR-4 | The canvas is an indexed per-layer buffer of slot references; RGBA is resolved only at export, so palette swaps require no recipe change | must |
| FR-5 | Alpha is binary. Any colour resolving to an alpha value other than 0 or 255 is rejected at parse time | must |
| FR-6 | Geometry ops: `set_pixels`, `line` (Bresenham), `rect`, `ellipse`, `polygon` (scanline, zero anti-aliasing) | must |
| FR-7 | Fill ops: `flood_fill` with 4- or 8-connectivity, and `dither_fill` with `checker_50` and `bayer_25` patterns over an arbitrary region | must |
| FR-8 | `ascii_blit` stamps a character matrix using a caller-supplied legend, for micro-detail such as faces and icons | must |
| FR-9 | `mirror` reflects the active layer across an integer or half-pixel pivot | must |
| FR-10 | Any geometry or fill op accepts `"color": null` to erase to transparent. An omitted colour is an error; an explicit null is an erase | must |
| FR-11 | `auto_outline` adds a 1px border around non-transparent pixels, 4- or 8-way, inside or outside the silhouette, optionally selective by taking each family's `outline` role | must |
| FR-12 | `auto_shade` applies a 1px rim only: light-facing edge pixels to `highlight`, opposite edge pixels to `shadow` | must |
| FR-13 | `ramp_fill` assigns ramp roles within a region by distance from the light-facing edge, bucketed into a caller-specified band count | must |
| FR-14 | `replace_slot` rewrites every pixel of one slot to another within the active layer | should |
| FR-15 | Post-passes read from `target_layer` (default: their own layer) and always write into the layer that contains them | must |
| FR-16 | `render` produces a 1× RGBA8 PNG that is byte-identical for identical recipes. An indexed-colour PNG is available opt-in | must |
| FR-17 | `render --export` writes `asset.meta.json` containing the trim bounding box, trim origin, anchors, palette manifest, recipe hash, and both a Godot 4 block and a generic block | must |
| FR-18 | An annotated debug sheet is produced only on explicit request: panel A 8× with coordinate rulers, pixel grid, checkerboard and anchor crosshairs; panel B 1× with optional backdrop; panel C silhouette | must |
| FR-19 | `inspect` returns an ASCII matrix for one or more regions in a single call, plus a full-canvas summary mode. It always returns the legend mapping | must |
| FR-20 | The linter reports `OUT_OF_BOUNDS`, `ORPHAN_PIXEL`, `JAGGY_LINE`, and `LOW_CONTRAST` with `error`/`warning`/`info` severities. Strict mode promotes warnings to failures | must |
| FR-21 | A CLI exposes `init`, `draw`, `edit`, `anchor`, `inspect`, `render`, `validate`, each with a `--pretty` and `--color` variant | must |
| FR-22 | An MCP server exposes the same verbs as seven tools (`px_init`, `px_draw`, `px_edit`, `px_anchor`, `px_inspect`, `px_validate`, `px_render`), over stdio. The write verbs accept a batched `ops` array, and every tool accepts an optional `strict` flag | must |
| FR-23 | Every response uses the `{ v, ok, ... }` envelope with structured error objects. Exit codes are 0 success, 1 caller error, 2 internal, 3 lint gate | must |
| FR-24 | Ops accept an optional stable `id`; writes may address an op by id or index, and every write response returns the op index map | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Byte-identical PNG output across repeated runs, and across Windows and Linux |
| NFR-2 | Exactly one runtime dependency (`@modelcontextprotocol/sdk`); everything else is a Node built-in |
| NFR-3 | A 256×256 render with 2,000 ops completes in under 250 ms |
| NFR-4 | Responses are bounded: ASCII output and tables are capped, and truncation is stated |
| NFR-5 | No network calls, no telemetry, no data leaves the machine |
| NFR-6 | Node 24, ESM, strict TypeScript; no browser surface |
| NFR-7 | ≥80% coverage on new code in `src/core` and `src/lint` |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | A minimal recipe parses, renders, and round-trips to byte-identical JSON | FR-1, FR-2 |
| AC-2 | Each validation failure returns its distinct code, op index, and hint | FR-3 |
| AC-3 | Swapping a recipe's palette changes every pixel's colour and leaves every slot identity intact | FR-4 |
| AC-4 | A translucent colour in an op is rejected at parse time | FR-5 |
| AC-5 | Each geometry op produces its expected golden PNG | FR-6 |
| AC-6 | `flood_fill` respects 4- vs 8-connectivity boundaries; `dither_fill` patterns are exact | FR-7 |
| AC-7 | `ascii_blit` stamps a 3×3 legend exactly; an uncovered character errors | FR-8 |
| AC-8 | `mirror` at an odd and at an even pivot both match goldens, with no double-writing at the seam | FR-9 |
| AC-9 | `"color": null` clears only the geometry it targets, and an omitted colour errors | FR-10 |
| AC-10 | `auto_outline` inside vs outside differ in silhouette size by exactly the border width | FR-11 |
| AC-11 | `auto_shade` changes only pixels adjacent to the silhouette edge | FR-12 |
| AC-12 | `ramp_fill` with N bands produces exactly N-1 role transitions along the light vector | FR-13 |
| AC-13 | A post-pass in layer 2 naming layer 1 as target leaves layer 1's pixels unchanged | FR-15 |
| AC-14 | Re-rendering the same recipe twice yields identical SHA-256, and the CI matrix agrees across OSes | FR-16, NFR-1 |
| AC-15 | Exported metadata reproduces the trim bounds and anchor coordinates for a known sprite | FR-17 |
| AC-16 | The debug sheet contains all three panels, with rulers and anchor crosshairs at the declared coordinates | FR-18 |
| AC-17 | A multi-region inspect returns every requested region plus the legend in one call | FR-19 |
| AC-18 | Each linter rule fires on a crafted fixture and stays silent on a clean sprite; strict mode changes the exit code | FR-20 |
| AC-19 | CLI and MCP produce the same output for the same recipe | FR-21, FR-22 |
| AC-20 | Editing an op by id succeeds after earlier ops are inserted, proving ids are stable | FR-24 |
| AC-21 | All four benchmark assets meet the 12-call, zero-finding, 4/5 bar | Goals |
| AC-22 | `pnpm verify` passes and CI is green on both OSes | NFR-7 |

## Edge Cases

- Erasing with `color: null` from an already-transparent pixel is a no-op, not
  an error.
- `polygon` with fewer than three points is an error; `ellipse` with width or
  height of 1 degrades to a line.
- `ascii_blit` rows of unequal length, or a character absent from the legend,
  are errors.
- An op writing partly outside the canvas clips and warns; fully outside warns
  once and writes nothing.
- `ramp_fill` on a flat-palette family returns `E_NO_RAMP` and suggests
  `--derive-ramps`.
- `auto_outline` or `auto_shade` on an empty layer is a no-op that reports
  `W_PASS_NOOP` in `warnings`. It is deliberately not a fifth lint code: FR-20's
  four codes are a closed surface. *(Amended in review round 1 — the earlier
  draft said "an `info` finding", which would have needed a fifth code.)*
- A recipe with no ops renders a fully transparent PNG with zero bounds and no
  trim.
- An anchor outside the canvas is recorded with a warning, not rejected.
- `mirror` where source and destination overlap writes each pixel once,
  deterministically.
- Editing a non-existent op id or an out-of-range index returns `E_NO_SUCH_OP`.

## Dependencies

- **Tracks:** none.
- **External:** none. A GitHub remote exists for CI only; it is not a published
  package.

## Open Questions & Assumptions

- **Assumption:** Godot 4 pivot mapping reduces to one documented offset rule
  from px anchors, confirmed when the exporter is built.
- **Assumption:** linter thresholds are tunable in calibration without changing
  the recipe format.
- **Assumption:** `#808080` is the default contrast backdrop.
- **Assumption:** recipes stay under ~2,000 ops, so full re-render per edit is
  negligible.
- **Assumption:** zlib output is stable across Node 24 patch releases; CI fails
  loudly otherwise.
- ~~**Assumption:** "pixel-perfect" line corner removal follows the standard
  pixel-art algorithm, documented in code and pinned by goldens.~~ Withdrawn in
  review round 1: `pixel_perfect` was a no-op and the flag is gone. Corner
  removal belongs to a future stroke op that can reason about the whole path.
- **Question:** should indexed PNG become the default export after Phase 1? Not
  blocking.

## References

- The Phase 1 PRD supplied for this project, and the decisions recorded during
  project definition.
- `conductor/product.md`, `conductor/product-guidelines.md`,
  `conductor/tech-stack.md`, `conductor/workflow.md`.
