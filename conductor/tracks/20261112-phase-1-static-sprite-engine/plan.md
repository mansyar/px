# Phase 1 — Static Sprite Drawing Engine — Implementation Plan

> **Branch:** `feat/20261112-phase-1-static-sprite-engine`
> **Base:** `main` @ `60582b28cbe0dc9cd8c1f892817872ed2e7b3dc4`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Scaffold and Vertical Slice

- **Goal:** A recipe authored from scratch compiles to a golden-verified PNG and
  can be inspected as ASCII, end to end through the CLI.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-16, FR-19, FR-21, FR-23,
  NFR-1, NFR-2, NFR-6, AC-1, AC-2, AC-3, AC-4, AC-5, AC-14, AC-22
- **Touches:** `package.json`, `tsconfig*.json`, `biome.json`, `vitest.config.ts`,
  `.node-version`, `src/core/**`, `src/render/**`, `src/cli/**`, `test/**`,
  `.github/workflows/ci.yml`
- **Verification:** `pnpm verify`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 4e00fe3
- **Evidence:** conductor/tracks/20261112-phase-1-static-sprite-engine/verification/phase-1.md

- [x] **P1.T1: Package scaffold** — covers: NFR-2, NFR-6
  - [x] **P1.T1.1:** `package.json` with pinned versions, `engines.node >=24 <25`,
    ESM, bins `px` and `px-mcp`, scripts matching the workflow config
  - [x] **P1.T1.2:** tsconfig for typecheck and build; `.node-version`;
    `pnpm-lock.yaml` committed
  - [x] **P1.T1.3:** Biome config and Vitest projects (`unit`, `integration`,
    `smoke`, `goldens`)
  - [x] **P1.T1.4:** Remove the CI `detect` guard so the real matrix runs
- [x] **P1.T2: Recipe model and canonical serializer** — covers: FR-1, FR-2, AC-1
  - [x] **P1.T2.1:** Type definitions for recipe, layer, op, palette, anchors
  - [x] **P1.T2.2:** Canonical writer — stable key order, expanded objects,
    round-trip identity
  - [x] **P1.T2.3:** Compact tuple reader that normalizes on save
- [x] **P1.T3: Validation and error codes** — covers: FR-3, FR-5, AC-2, AC-4
  - [x] **P1.T3.1:** Error code registry with corrective hints
  - [x] **P1.T3.2:** Structural validation, including canvas bounds and duplicate
    layers
  - [x] **P1.T3.3:** Binary-alpha enforcement at parse time
- [x] **P1.T4: Indexed canvas and palette resolution** — covers: FR-4, AC-3
  - [x] **P1.T4.1:** Per-layer `Int16Array` slot buffers with clipping
  - [x] **P1.T4.2:** Slot resolution for ramp families and flat palettes
- [x] **P1.T5: Minimal op set** — covers: FR-6, AC-5
  - [x] **P1.T5.1:** `set_pixels`, `rect`
  - [x] **P1.T5.2:** `line` with Bresenham, endpoint-inclusive
- [x] **P1.T6: Deterministic PNG encoder** — covers: FR-16, NFR-1, AC-14
  - [x] **P1.T6.1:** CRC-32, chunk writer, filter 0 per scanline, fixed zlib
    strategy, single IDAT, no timestamp chunk
  - [x] **P1.T6.2:** RGBA8 output; golden harness asserting SHA-256
- [x] **P1.T7: CLI vertical slice and inspector** — covers: FR-19, FR-21, FR-23, AC-17
  - [x] **P1.T7.1:** Argument parsing, response envelope, exit codes
  - [x] **P1.T7.2:** `init`, `draw`, `inspect`, `render` wired to the core

## Phase 2: Feedback Tooling

- **Goal:** An agent can render, read lint findings, and receive an annotated
  debug sheet — the full correction loop.
- **Depends on:** Phase 1
- **Covers:** FR-18, FR-20, NFR-4, AC-16, AC-18
- **Touches:** `src/lint/**`, `src/render/debug/**`, `src/cli/**`, `test/lint/**`
- **Verification:** `pnpm verify`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 689c638
- **Evidence:** conductor/tracks/20261112-phase-1-static-sprite-engine/verification/phase-2.md

- [x] **P2.T1: Linter framework** — covers: FR-20
  - [x] **P2.T1.1:** Rule interface, severities, deterministic ordering, bounded
    output
- [x] **P2.T2: Bounds and connectivity rules** — covers: AC-18
  - [x] **P2.T2.1:** `OUT_OF_BOUNDS`
  - [x] **P2.T2.2:** `ORPHAN_PIXEL`
- [x] **P2.T3: Shape and contrast rules** — covers: AC-18
  - [x] **P2.T3.1:** `JAGGY_LINE`
  - [x] **P2.T3.2:** `LOW_CONTRAST` against the default backdrop
- [x] **P2.T4: Annotated debug sheet** — covers: FR-18, AC-16
  - [x] **P2.T4.1:** Embedded bitmap font for rulers
  - [x] **P2.T4.2:** Panel A 8× with grid, checkerboard, coordinate rulers, anchor
    crosshairs
  - [x] **P2.T4.3:** Panel B 1× with optional backdrop; Panel C silhouette
- [x] **P2.T5: Strict mode and validate** — covers: FR-20, FR-23
  - [x] **P2.T5.1:** `--strict` promotes warnings; exit code 3
  - [x] **P2.T5.2:** `validate` command rendering nothing

## Phase 3: Full Op Surface

- **Goal:** Every drawing and post-pass op in the spec exists, with golden
  coverage and correct layer semantics.
- **Depends on:** Phase 2
- **Covers:** FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-24,
  AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-20
- **Touches:** `src/core/**`, `src/cli/**`, `test/ops/**`, `vitest.config.ts`
- **Verification:** `pnpm verify`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 5c455ae
- **Evidence:** conductor/tracks/20261112-phase-1-static-sprite-engine/verification/phase-3.md

- [x] **P3.T1: Curved and polygonal geometry** — covers: FR-6, AC-5
  - [x] **P3.T1.1:** `ellipse` via midpoint algorithm, pinned by golden
  - [x] **P3.T1.2:** `polygon` scanline fill with a documented half-open edge rule
- [x] **P3.T2: Fills** — covers: FR-7, AC-6
  - [x] **P3.T2.1:** `flood_fill` with 4/8 connectivity
  - [x] **P3.T2.2:** `dither_fill` with `checker_50` and `bayer_25`
- [x] **P3.T3: Detail and symmetry ops** — covers: FR-8, FR-9, AC-7, AC-8
  - [x] **P3.T3.1:** `ascii_blit` with legend validation
  - [x] **P3.T3.2:** `mirror` with integer and half-pixel pivots, seam written once
- [x] **P3.T4: Erase via null colour** — covers: FR-10, AC-9
  - [x] **P3.T4.1:** Null resolution across every geometry and fill op
  - [x] **P3.T4.2:** Distinguish omitted from explicit null at parse time
- [x] **P3.T5: Post-pass layer semantics** — covers: FR-15, AC-13
  - [x] **P3.T5.1:** `target_layer` read resolution with own-layer writes
- [x] **P3.T6: Outlining** — covers: FR-11, AC-10
  - [x] **P3.T6.1:** `auto_outline`, 4/8-way, inner and outer
  - [x] **P3.T6.2:** Selective outline using family `outline` roles
- [x] **P3.T7: Rim shading** — covers: FR-12, AC-11
  - [x] **P3.T7.1:** `auto_shade` touching only silhouette-adjacent pixels
- [x] **P3.T8: Banded ramps** — covers: FR-13, AC-12
  - [x] **P3.T8.1:** `ramp_fill` with band count and light direction
  - [x] **P3.T8.2:** `E_NO_RAMP` on flat families with a `--derive-ramps` hint
- [x] **P3.T9: Slot remapping** — covers: FR-14
  - [x] **P3.T9.1:** `replace_slot` within the active layer
- [x] **P3.T10: Op addressing** — covers: FR-24, AC-20
  - [x] **P3.T10.1:** Optional `id`, edit by id or index, `E_NO_SUCH_OP`
  - [x] **P3.T10.2:** Op index map in every write response

## Phase 4: Engine Metadata, MCP Parity, Palettes

- **Goal:** An MCP agent gets identical capability to the CLI, and exported
  metadata loads in Godot.
- **Depends on:** Phase 3
- **Covers:** FR-17, FR-19, FR-22, NFR-5, AC-15, AC-17, AC-19
- **Touches:** `src/meta/**`, `src/mcp/**`, `src/palettes/**`, `src/cli/**`,
  `test/mcp/**`, `test/palettes/**`, `vitest.config.ts`
- **Verification:** `pnpm verify`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** dca204b
- **Evidence:** conductor/tracks/20261112-phase-1-static-sprite-engine/verification/phase-4.md

- [x] **P4.T1: Generic and Godot metadata** — covers: FR-17, AC-15
  - [x] **P4.T1.1:** Trim bounds, origin offset, anchors, palette manifest, recipe
    hash
  - [x] **P4.T1.2:** Godot 4 block via one documented offset rule
- [x] **P4.T2: Full inspector** — covers: FR-19, AC-17
  - [x] **P4.T2.1:** Multi-region queries and full-canvas summary mode
  - [x] **P4.T2.2:** Role-code legend with numeric disambiguation
- [x] **P4.T3: MCP server** — covers: FR-22, NFR-5, AC-19
  - [x] **P4.T3.1:** Six tools over stdio with batched ops and optional `strict`
  - [x] **P4.T3.2:** 1× PNG plus JSON from `render`; debug sheet opt-in
- [x] **P4.T4: Curated palettes** — covers: FR-4
  - [x] **P4.T4.1:** PICO-8, Endesga-32, Arne16, Game Boy as flat palettes
  - [x] **P4.T4.2:** `--derive-ramps` lifting ramps by luminance
- [x] **P4.T5: CLI/MCP parity suite** — covers: AC-19
  - [x] **P4.T5.1:** Same recipe through both surfaces yields identical output

## Phase 5: Calibration

- **Goal:** The four benchmarks meet the 12-call, zero-finding, 4/5 bar, and the
  thresholds are documented.
- **Depends on:** Phase 4
- **Covers:** AC-21, NFR-3, NFR-7
- **Touches:** `test/benchmarks/**`, `test/goldens/**`, `docs/**`, `src/lint/thresholds.ts`, `vitest.config.ts`
- **Verification:** `pnpm verify`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** da41e80
- **Evidence:** conductor/tracks/20261112-phase-1-static-sprite-engine/verification/phase-5.md

- [x] **P5.T1: Benchmark recipes** — covers: AC-21
  - [x] **P5.T1.1:** 16×16 potion, 32×32 sword, 32×32 humanoid, 48×48 chest as
    authored recipes
- [x] **P5.T2: Calibration harness** — covers: AC-21
  - [x] **P5.T2.1:** Call counting and a strict-mode assertion per asset
- [x] **P5.T3: Threshold tuning** — covers: AC-21
  - [x] **P5.T3.1:** Tune `JAGGY_LINE` and `LOW_CONTRAST`, then document the
    chosen values and rationale
- [x] **P5.T4: Performance proof** — covers: NFR-3, NFR-7
  - [x] **P5.T4.1:** 256×256 with 2,000 ops under 250 ms, asserted in a test

## Phase R1: Review Fixes

- **Goal:** Every finding from review round 1 is resolved or recorded, and the
  two user-approved spec amendments are implemented.
- **Depends on:** Phase 5
- **Covers:** F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11, F12
- **Touches:** src/**, test/**, .github/workflows/ci.yml, docs/**,
  conductor/tracks/20261112-phase-1-static-sprite-engine/verification/**
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 7bd6365
- **Evidence:** conductor/tracks/20261112-phase-1-static-sprite-engine/verification/phase-R1.md

- [x] **R1.T1: Exit-code contract** — covers: F1, FR-23
  - [x] **R1.T1.1:** Caller errors exit 1, internal errors exit 2, lint 3; help
    map and the four tests corrected, plus a test that forces an internal error
- [x] **R1.T2: `px_validate` and flag reachability** — covers: F2, FR-22, AC-19
  - [x] **R1.T2.1:** Seventh MCP tool mapping to `validate`
  - [x] **R1.T2.2:** Table-driven parity test asserting every CLI value flag has a
    tool parameter that reaches argv
- [x] **R1.T3: `ORPHAN_PIXEL` adjacency** — covers: F3, FR-20
  - [x] **R1.T3.1:** 8-way connectivity, with `line` diagonal and `dither_fill`
    fixtures proving a correct sprite is not flagged
- [x] **R1.T4: Withdraw `pixel_perfect`** — covers: F4, FR-6, AC-5
  - [x] **R1.T4.1:** Remove the option from the recipe type, validator, serializer,
    and `line`; delete the dead `removeCorners` path; drop the flag from fixtures
- [x] **R1.T5: `replaced` field** — covers: F5, FR-24
  - [x] **R1.T5.1:** Rename to `replaced_index`, keep `added`, and cover index 0
- [x] **R1.T6: `ramp_fill` thin regions** — covers: F6, AC-12
  - [x] **R1.T6.1:** Reject a band count the region's light axis cannot display,
    with a coded error naming the maximum, so AC-12 stays unconditionally true
- [x] **R1.T7: Coverage in CI** — covers: F7, NFR-7
  - [x] **R1.T7.1:** Add the coverage step to the verify job
- [x] **R1.T8: Debug backdrop flag** — covers: F8, FR-18
  - [x] **R1.T8.1:** `--backdrop <hex|null>` on the CLI and on `px_render`
- [x] **R1.T9: Warnings on write verbs** — covers: F9, FR-23
  - [x] **R1.T9.1:** `draw` and `edit` return source and parse warnings like `anchor`
- [x] **R1.T10: Write failures** — covers: F10, FR-23
  - [x] **R1.T10.1:** An unwritable `--out` path is a caller error with a hint, not
    `E_INTERNAL`
- [x] **R1.T11: `W_PASS_NOOP` as a finding** — covers: F11, FR-20
  - [x] **R1.T11.1:** Surface the no-op post-pass through `findings`, not only warnings
- [x] **R1.T12: Process record** — covers: F12
  - [x] **R1.T12.1:** Record `pnpm-workspace.yaml`, `opencode.json` and the agent
    file in the evidence deviations table

## Phase R2: Review Fixes (Round 2)

- **Goal:** close the two Medium findings round 2 left open — `ramp_fill`'s band gap and `ORPHAN_PIXEL`'s false positive on `bayer_25` — plus the five Lows.
- **Depends on:** Phase R1
- **Covers:** AC-12, FR-20, AC-18, FR-22, FR-23, FR-18
- **Touches:** src/core/**, src/lint/**, src/cli/**, src/mcp/**, test/**, docs/**
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** in_progress

- [ ] **R2.T1: Bands from occupied positions** — covers: AC-12
  - [ ] **R2.T1.1:** `ramp_fill` ranks painted pixels by their projection among *occupied* positions, not by bounding-box extent, so a gap cannot swallow a band
  - [ ] **R2.T1.2:** `E_REGION_TOO_THIN` guards the distinct occupied count; disjoint-cluster fixture with two 3×1 blocks and `bands: 3`
- [ ] **R2.T2: Neighbour radius for orphan pixels** — covers: FR-20, AC-18
  - [ ] **R2.T2.1:** `ORPHAN_PIXEL` searches Chebyshev radius 2, documented as the sparsest lattice the engine emits
  - [ ] **R2.T2.2:** `bayer_25`-over-transparency fixture yields zero findings; a lone pixel 3 px from anything still flags
- [ ] **R2.T3: Stale tool counts** — covers: FR-22
  - [ ] **R2.T3.1:** Unknown-tool hint says seven, not six
- [ ] **R2.T4: Drop the dead classifier** — covers: FR-23
  - [ ] **R2.T4.1:** `isUsageError` and its unit test are gone rather than left to invite the old mapping back
- [ ] **R2.T5: Backdrop alpha is binary** — covers: FR-18
  - [ ] **R2.T5.1:** `--backdrop` rejects alpha other than `00`/`ff`, and both hint sites state the same accepted forms
- [ ] **R2.T6: Reachability asserts the schema** — covers: FR-22, AC-19
  - [ ] **R2.T6.1:** Each mapping must appear in the tool's `inputSchema.properties`, and every declared property must have a mapping
