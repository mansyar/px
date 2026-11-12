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
- **Status:** in_progress

- [ ] **P2.T1: Linter framework** — covers: FR-20
  - [ ] **P2.T1.1:** Rule interface, severities, deterministic ordering, bounded
    output
- [ ] **P2.T2: Bounds and connectivity rules** — covers: AC-18
  - [ ] **P2.T2.1:** `OUT_OF_BOUNDS`
  - [ ] **P2.T2.2:** `ORPHAN_PIXEL`
- [ ] **P2.T3: Shape and contrast rules** — covers: AC-18
  - [ ] **P2.T3.1:** `JAGGY_LINE`
  - [ ] **P2.T3.2:** `LOW_CONTRAST` against the default backdrop
- [ ] **P2.T4: Annotated debug sheet** — covers: FR-18, AC-16
  - [ ] **P2.T4.1:** Embedded bitmap font for rulers
  - [ ] **P2.T4.2:** Panel A 8× with grid, checkerboard, coordinate rulers, anchor
    crosshairs
  - [ ] **P2.T4.3:** Panel B 1× with optional backdrop; Panel C silhouette
- [ ] **P2.T5: Strict mode and validate** — covers: FR-20, FR-23
  - [ ] **P2.T5.1:** `--strict` promotes warnings; exit code 3
  - [ ] **P2.T5.2:** `validate` command rendering nothing

## Phase 3: Full Op Surface

- **Goal:** Every drawing and post-pass op in the spec exists, with golden
  coverage and correct layer semantics.
- **Depends on:** Phase 2
- **Covers:** FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-13, FR-14, FR-15, FR-24,
  AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12, AC-13, AC-20
- **Touches:** `src/core/ops/**`, `src/render/**`, `src/cli/**`, `test/ops/**`
- **Verification:** `pnpm verify`
- **Status:** pending

- [ ] **P3.T1: Curved and polygonal geometry** — covers: FR-6, AC-5
  - [ ] **P3.T1.1:** `ellipse` via midpoint algorithm, pinned by golden
  - [ ] **P3.T1.2:** `polygon` scanline fill with a documented half-open edge rule
- [ ] **P3.T2: Fills** — covers: FR-7, AC-6
  - [ ] **P3.T2.1:** `flood_fill` with 4/8 connectivity
  - [ ] **P3.T2.2:** `dither_fill` with `checker_50` and `bayer_25`
- [ ] **P3.T3: Detail and symmetry ops** — covers: FR-8, FR-9, AC-7, AC-8
  - [ ] **P3.T3.1:** `ascii_blit` with legend validation
  - [ ] **P3.T3.2:** `mirror` with integer and half-pixel pivots, seam written once
- [ ] **P3.T4: Erase via null colour** — covers: FR-10, AC-9
  - [ ] **P3.T4.1:** Null resolution across every geometry and fill op
  - [ ] **P3.T4.2:** Distinguish omitted from explicit null at parse time
- [ ] **P3.T5: Post-pass layer semantics** — covers: FR-15, AC-13
  - [ ] **P3.T5.1:** `target_layer` read resolution with own-layer writes
- [ ] **P3.T6: Outlining** — covers: FR-11, AC-10
  - [ ] **P3.T6.1:** `auto_outline`, 4/8-way, inner and outer
  - [ ] **P3.T6.2:** Selective outline using family `outline` roles
- [ ] **P3.T7: Rim shading** — covers: FR-12, AC-11
  - [ ] **P3.T7.1:** `auto_shade` touching only silhouette-adjacent pixels
- [ ] **P3.T8: Banded ramps** — covers: FR-13, AC-12
  - [ ] **P3.T8.1:** `ramp_fill` with band count and light direction
  - [ ] **P3.T8.2:** `E_NO_RAMP` on flat families with a `--derive-ramps` hint
- [ ] **P3.T9: Slot remapping** — covers: FR-14
  - [ ] **P3.T9.1:** `replace_slot` within the active layer
- [ ] **P3.T10: Op addressing** — covers: FR-24, AC-20
  - [ ] **P3.T10.1:** Optional `id`, edit by id or index, `E_NO_SUCH_OP`
  - [ ] **P3.T10.2:** Op index map in every write response

## Phase 4: Engine Metadata, MCP Parity, Palettes

- **Goal:** An MCP agent gets identical capability to the CLI, and exported
  metadata loads in Godot.
- **Depends on:** Phase 3
- **Covers:** FR-17, FR-19, FR-22, NFR-5, AC-15, AC-17, AC-19
- **Touches:** `src/meta/**`, `src/mcp/**`, `src/palettes/**`, `src/cli/**`,
  `test/mcp/**`
- **Verification:** `pnpm verify`
- **Status:** pending

- [ ] **P4.T1: Generic and Godot metadata** — covers: FR-17, AC-15
  - [ ] **P4.T1.1:** Trim bounds, origin offset, anchors, palette manifest, recipe
    hash
  - [ ] **P4.T1.2:** Godot 4 block via one documented offset rule
- [ ] **P4.T2: Full inspector** — covers: FR-19, AC-17
  - [ ] **P4.T2.1:** Multi-region queries and full-canvas summary mode
  - [ ] **P4.T2.2:** Role-code legend with numeric disambiguation
- [ ] **P4.T3: MCP server** — covers: FR-22, NFR-5, AC-19
  - [ ] **P4.T3.1:** Six tools over stdio with batched ops and optional `strict`
  - [ ] **P4.T3.2:** 1× PNG plus JSON from `render`; debug sheet opt-in
- [ ] **P4.T4: Curated palettes** — covers: FR-4
  - [ ] **P4.T4.1:** PICO-8, Endesga-32, Arne16, Game Boy as flat palettes
  - [ ] **P4.T4.2:** `--derive-ramps` lifting ramps by luminance
- [ ] **P4.T5: CLI/MCP parity suite** — covers: AC-19
  - [ ] **P4.T5.1:** Same recipe through both surfaces yields identical output

## Phase 5: Calibration

- **Goal:** The four benchmarks meet the 12-call, zero-finding, 4/5 bar, and the
  thresholds are documented.
- **Depends on:** Phase 4
- **Covers:** AC-21, NFR-3, NFR-7
- **Touches:** `test/benchmarks/**`, `test/goldens/**`, `docs/**`
- **Verification:** `pnpm verify`
- **Status:** pending

- [ ] **P5.T1: Benchmark recipes** — covers: AC-21
  - [ ] **P5.T1.1:** 16×16 potion, 32×32 sword, 32×32 humanoid, 48×48 chest as
    authored recipes
- [ ] **P5.T2: Calibration harness** — covers: AC-21
  - [ ] **P5.T2.1:** Call counting and a strict-mode assertion per asset
- [ ] **P5.T3: Threshold tuning** — covers: AC-21
  - [ ] **P5.T3.1:** Tune `JAGGY_LINE` and `LOW_CONTRAST`, then document the
    chosen values and rationale
- [ ] **P5.T4: Performance proof** — covers: NFR-3, NFR-7
  - [ ] **P5.T4.1:** 256×256 with 2,000 ops under 250 ms, asserted in a test
