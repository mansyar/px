# Product Definition — px

## Vision

px is a **deterministic pixel-art rendering engine for AI agents**. Generative image models fail at production game art for structural reasons: anti-aliased edges, inconsistent pixel grids ("mixels"), and invented detail that cannot be corrected one pixel at a time. px replaces prompting with authoring — agents compose sprites from declarative drawing operations, and the engine compiles those operations to exact, reproducible pixels.

The organizing principle is that **the recipe is the source of truth and the canvas is indexed, not colored**. Every pixel knows which palette slot painted it, so palette swaps are free, shading and outlining are exact, and byte-identical output is provable rather than hoped for.

## Target Users

| Persona | Need |
|---|---|
| **AI coding/creative agent** (primary) | A tool surface it can operate reliably with few round-trips, precise symbolic feedback, and errors that tell it how to self-correct |
| **Solo game developer** (secondary) | Placeholder and production-adjacent sprites without commissioning an artist; clean git diffs; engine-ready output |
| **Pixel artist** (tertiary) | A hand-editable, diff-friendly format for templating, palette variants, and batch recolors |

## Core Use Cases

1. **Agent-authored sprite production** — an LLM builds a 32×32 sword from ops, inspects the result as an ASCII matrix, and fixes individual pixels.
2. **Palette exploration** — one recipe, many palette swaps (PICO-8 vs Endesga-32) with zero re-authoring.
3. **Template families** — a humanoid base recipe varied by offset and slot substitution to produce a character set.
4. **Corrective iteration** — an agent edits a specific historical op by index or id rather than regenerating the sprite.
5. **Asset QA** — a linter flags orphan pixels, jaggies, out-of-bounds writes, and low-contrast edges before the asset reaches a game.

## Goals & Success Metrics

- **Determinism:** identical recipes produce byte-identical PNGs, verified by hash across runs and operating systems.
- **Production readiness:** strict integer grids, binary alpha, named palette slots, and engine-consumable anchor metadata.
- **Agent legibility:** a fresh agent, given only tool documentation, completes each benchmark asset (16×16 potion, 32×32 sword, 32×32 humanoid, 48×48 chest) with **zero `OUT_OF_BOUNDS` and `ORPHAN_PIXEL` findings, a silhouette rated 4/5 or better, within 12 tool calls per asset.**
- **Iteration cost:** a single-pixel correction costs one tool call and no full re-authoring.

## Core Flows

**Authoring loop:** `init` → `draw` (batched ops) → `render` → symbolic feedback (ASCII region + lint JSON) → `edit` → repeat.

**Delivery:** `render --export` produces `asset.png` (RGBA8), `asset.meta.json`, and, on request, `asset.debug.png`.

## Scope & Non-Goals

**In scope (Phase 1):**

- Static sprite rendering, single-frame.
- CLI and MCP server sharing one engine core.
- Indexed slot canvas with dual palette model (ramp families and flat lists).
- Full drawing op set including `auto_outline`, `auto_shade`, `ramp_fill`, `dither_fill`, `ascii_blit`, `mirror`, `replace_slot`, and explicit erase.
- Annotated debug sheet, pixel-art linter, ASCII region inspection.
- Godot 4 metadata plus a generic schema.

**Out of scope (deferred):**

- Animation, onion-skinning, sprite-sheet packing (Phase 2).
- Tilemap auto-tiling and multi-tile world editing.
- Interactive human GUI editor.
- Translucent alpha (`alpha_mode: translucent` removed from Phase 1 entirely).
- Any randomized operation (no RNG in the engine, so determinism needs no seed concept).
- Public npm/registry publication, semver and changelog discipline (local-only in Phase 1).
- Engine exports beyond Godot 4 and the generic schema.

## Constraints

Solo developer, no external deadline, quality-first. Scope may be cut but not rushed. No budget or compliance constraints. Development host is Windows; cross-platform determinism must nonetheless be provable.

## Integrations & External Dependencies

- **MCP clients** (OpenCode and other MCP hosts) as the agent transport.
- **Godot 4** as the first validated export target; generic metadata for everything else.
- **Node.js** runtime with `node:zlib` for PNG deflate — no third-party image or raster dependency.

## Risks & Unknowns

| Risk | Impact | Mitigation |
|---|---|---|
| **zlib output differs across Node versions** | Byte-identical claim fails silently | Pin the Node major in `engines` and CI; hash-pinned golden fixtures per op |
| **`auto_shade` produces rim-light, not form shading** | Agents outgrow it immediately on organic shapes | Ship explicit `ramp_fill`/`dither_fill` alongside it; treat it as a first pass |
| **VLM feedback is unreliable at 1-pixel resolution** | Debug sheet becomes a human-only tool | Keep ASCII region inspection as the primary channel; debug sheet is secondary |
| **MCP image payload cost** | Slow, expensive loops at 8× zoom of 256² | `render` returns 1× PNG + JSON; annotated debug sheet only on explicit request |
| **Scope creep toward animation** | Phase 1 never ships | Explicit non-goal; Phase 2 boundary stated in the product definition |
| **Chatty tool surface** | Agents blow the 12-call budget | Batched `ops: []` on every write; op-index map returned from writes |

## Open Questions & Assumptions

**Assumptions:**

1. Godot 4 pivot conventions map onto px anchors with one documented offset rule — confirmed when the exporter is written.
2. Recipes stay small (< ~2,000 ops), so full re-render per edit is negligible at ≤256².
3. Linter thresholds are tunable during calibration without changing the recipe format.
4. `#808080` is the right default backdrop for contrast checks.

**Resolved during definition:**

- `render` returns 1× PNG + JSON by default; the annotated debug sheet is opt-in.
- Per-`draw` calls return JSON and ASCII only, never images.
- Binary alpha is sufficient for Phase 1; dithering is the documented idiom for partial transparency, and Phase 2 can add per-layer alpha without redesign.
- `inspect` accepts multiple regions per call and offers a full-canvas summary mode, so the call budget is not dominated by inspection.

**Open:** none blocking. Calibration records the authoring/inspection call split as a metric.
