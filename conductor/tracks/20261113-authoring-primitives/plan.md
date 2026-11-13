# Authoring Primitives — Implementation Plan

> **Branch:** feat/20261113-authoring-primitives
> **Base:** main @ f0850a201a9ed87ebcc83af56e5779c49416523b
>
> Phase states: `pending`, `in_progress`, `verified`, `failed`, `blocked`. Only the primary agent writes this file; phase subagents report back.

## Phase 1: Plane Shading

- **Goal:** A part can declare `facing`, and `light` gives each plane a distinct base tone from the light vector.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, NFR-1, NFR-6, AC-1, AC-2, AC-3, AC-4
- **Touches:** `src/core/**`, `src/cli/**`, `src/mcp/**`, `test/facing/**`, `vitest.config.ts`
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** verified
- **Result:** verified — a declared `facing` earns a per-plane role from `dot(facing, towardLight)`, `flat` still plane-shades, and an undeclared part keeps its bytes
- **Checkpoint:** dbcd353
- **Evidence:** conductor/tracks/20261113-authoring-primitives/verification/phase-1.md

- [x] **P1.T1: Facing in the schema** — covers: FR-1, FR-4
    - [x] **P1.T1.1:** `facing` on a part, accepting the six names or a 3-vector; omitted means viewer-facing
    - [x] **P1.T1.2:** `E_FACING_UNKNOWN` for an unknown name and `E_BAD_PARAM` for a zero or non-unit vector, both with hints
    - [x] **P1.T1.3:** canonical serialisation and round-trip of both forms
- [x] **P1.T2: Plane tone resolution** — covers: FR-2, AC-1, AC-2
    - [x] **P1.T2.1:** `dot(facing, towardLight)` mapped onto the family's tone set, most-facing lightest, least darkest
    - [x] **P1.T2.2:** a part without `facing` keeps today's tone exactly
- [x] **P1.T3: Light integration** — covers: FR-3, AC-3
    - [x] **P1.T3.1:** plane tone applied before the existing stage order, with `form` still refining within each part
    - [x] **P1.T3.2:** `form: "flat"` plane-shades with `facing` and shades nothing without it
- [x] **P1.T4: Surface and compatibility** — covers: NFR-1, NFR-6, AC-4
    - [x] **P1.T4.1:** `facing` authorable through the recipe, CLI `--parts` and `px_init`
    - [x] **P1.T4.2:** hero and all committed digests unchanged; `test/facing/**` in the unit project

## Phase 2: Stroke

- **Goal:** `stroke` draws a path that cleans its own steps, with closure, smoothing, width and erase.
- **Depends on:** Phase 1
- **Covers:** FR-5, FR-6, FR-7, FR-8, AC-5, AC-6, AC-7, AC-8
- **Touches:** `src/core/ops/**`, `src/core/recipe/**`, `src/cli/**`, `src/mcp/**`, `test/stroke/**`, `vitest.config.ts`
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** verified
- **Result:** verified — L-turn doubles are dropped, the 256 px diagonal's 126-step cadence becomes gaps of 1–4 with no run longer than two, and closure, smoothing, width and erase are pinned by fixtures
- **Checkpoint:** cab8949
- **Evidence:** conductor/tracks/20261113-authoring-primitives/verification/phase-2.md

- [x] **P2.T1: Path rasteriser** — covers: FR-5, AC-5
    - [x] **P2.T1.1:** polyline segments between consecutive points, deduplicating repeats, `E_BAD_PATH` below two points
    - [x] **P2.T1.2:** `closed` joining last to first with no missing pixel at the seam
- [x] **P2.T2: Self-cleanup (the point of the op)** — covers: FR-6, AC-5
    - [x] **P2.T2.1:** remove L-turn double pixels along the whole path
    - [x] **P2.T2.2:** detect and break repeating step runs, documented, with a fixture proving `line` stairsteps and `stroke` does not on the same 256 px diagonal
- [x] **P2.T3: Width, smoothing and erase** — covers: FR-7, FR-8, AC-7, AC-8
    - [x] **P2.T3.1:** `width` 1 or 2, overhang clipped with one warning
    - [x] **P2.T3.2:** `smooth: true` rounding interior points while staying one connected path with no gaps
    - [x] **P2.T3.3:** `color: null` erases along the path and clears ownership

## Phase 3: Texture

- **Goal:** `texture` lays five patterns whose marks clear the profile's cluster floor by construction.
- **Depends on:** Phase 2
- **Covers:** FR-9, FR-10, FR-11, FR-12, FR-13, NFR-2, NFR-4, AC-9, AC-10, AC-11
- **Touches:** `src/core/**`, `src/lint/**`, `src/cli/**`, `src/mcp/**`, `docs/art-profiles.md`, `test/texture/**`, `vitest.config.ts`
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** pending

- [ ] **P3.T1: Patterns** — covers: FR-9, FR-11, AC-9, AC-10
    - [ ] **P3.T1.1:** `stipple`, `hatch`, `grain`, `brick`, `mottle` over a part mask, deterministic and position-stable
    - [ ] **P3.T1.2:** `density` 1–3 scaling spacing, `E_PATTERN_UNKNOWN` and `E_BAD_PARAM` per FR-12
- [ ] **P3.T2: Cluster floor** — covers: FR-10, AC-9, AC-10
    - [ ] **P3.T2.1:** mark size and spacing derived from `profile.minCluster` (a `textureSpacing` field if a pattern needs its own), marks grow with the profile
    - [ ] **P3.T2.2:** no legal texture produces `CLUSTER_THIN` at any profile
- [ ] **P3.T3: Lint acceptance without weakening** — covers: FR-13, AC-11
    - [ ] **P3.T3.1:** `DITHER_NOISE`/`CLUSTER_THIN` silent for texture-produced marks
    - [ ] **P3.T3.2:** `dither_fill` below the floor still fires, proven by fixture
- [ ] **P3.T4: Range and emptiness** — covers: FR-12, NFR-4, AC-9
    - [ ] **P3.T4.1:** empty part no-ops with `W_CLEANUP_NOOP`; missing role raises `E_NO_RAMP`; report counts, not pixels

## Phase 4: Feedback and Compatibility

- **Goal:** The debug sheet shows plane boundaries and texture spacing, and every older recipe still renders byte-identically.
- **Depends on:** Phase 3
- **Covers:** FR-14, FR-15, NFR-4, AC-12
- **Touches:** `src/render/debug/**`, `src/lint/**`, `src/core/recipe/**`, `test/feedback/**`, `test/parts/**`
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** pending

- [ ] **P4.T1: Sheet** — covers: FR-14
    - [ ] **P4.T1.1:** plane boundary edges labelled where two facings meet, legible at the profile zoom
    - [ ] **P4.T1.2:** texture spacing visible in the 8× panel without adding an unbounded panel
- [ ] **P4.T2: Compatibility** — covers: FR-15, AC-12
    - [ ] **P4.T2.1:** a pre-track recipe renders byte-identically, asserted against a committed hash
    - [ ] **P4.T2.2:** a recipe using all three primitives round-trips through the canonical writer unchanged

## Phase 5: Re-authoring

- **Goal:** The same seven assets are re-authored on the new surface, addressing the criteria that failed.
- **Depends on:** Phase 4
- **Covers:** FR-16, AC-13
- **Touches:** `test/art/**`, `docs/rubric.md`
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** pending

- [ ] **P5.T1: The four weak assets** — covers: FR-16
    - [ ] **P5.T1.1:** humanoid, character, sword, scene re-authored with facing, stroke and texture where they address the failing criterion
    - [ ] **P5.T1.2:** design notes record what changed, why, and what still does not work
- [ ] **P5.T2: The three passing assets** — covers: FR-16
    - [ ] **P5.T2.1:** potion, chest, prop touched only where the primitives clearly help; a pass must not be traded for a regression
    - [ ] **P5.T2.2:** digests re-baselined with the reason for each change; `px diff` shows a bounded region per asset

## Phase 6: Re-scoring

- **Goal:** Seven re-authored assets score a mean of at least 4.0 with no criterion below 3, and the budget holds.
- **Depends on:** Phase 5
- **Covers:** FR-17, NFR-3, NFR-7, AC-14, AC-15, AC-16
- **Touches:** `test/art/**`, `test/benchmarks/**`, `scripts/**`, `docs/rubric.md`, `verification/**`
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** pending

- [ ] **P6.T1: Score** — covers: FR-17, AC-14
    - [ ] **P6.T1.1:** two passes per asset, rationale per criterion, recorded in `scores.json`
    - [ ] **P6.T1.2:** integrity test recomputes the verdict; a sub-4.0 mean fails the track rather than being softened
- [ ] **P6.T2: Budget and coverage** — covers: NFR-3, NFR-7, AC-15, AC-16
    - [ ] **P6.T2.1:** 256×256 with 2,000 ops plus light and texture under 500 ms median of five
    - [ ] **P6.T2.2:** new modules in the coverage numerator, gate unchanged
