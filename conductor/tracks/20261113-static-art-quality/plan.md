# Static Art Quality — Implementation Plan

> **Branch:** feat/20261113-static-art-quality
> **Base:** main @ dbee897fd6eb37a30fa2481b7ff6a2bf1b66ad28

> Phase states are `pending`, `in_progress`, `verified`, `failed`, `blocked`. Only the primary
> agent writes this file; subagents report and the primary records.

## Phase 1: Schema 1.1 — Parts and Materials

- **Goal:** A recipe can declare parts, tag painting ops, and replay to identical masks and bytes, while every 1.0 recipe still renders byte-identically.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, NFR-1, NFR-2, NFR-6, AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- **Touches:** src/core/**, src/cli/**, src/mcp/**, test/parts/**, vitest.config.ts
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** f238f92
- **Evidence:** conductor/tracks/20261113-static-art-quality/verification/phase-1.md

- [x] **P1.T1: Version 1.1 and types** — covers: FR-1
  - [x] **P1.T1.1:** Accept `version: "1.1"`, keep 1.0 loading and rendering unchanged
  - [x] **P1.T1.2:** Type the optional `parts` map and the `part` key on painting ops
- [x] **P1.T2: Parts and materials validation** — covers: FR-2, FR-5, FR-6
  - [x] **P1.T2.1:** `E_PART_UNKNOWN` naming declared parts
  - [x] **P1.T2.2:** Material resolves to a palette family; missing role keeps `E_NO_RAMP` with the `--derive-ramps` hint
  - [x] **P1.T2.3:** Closed gloss set with `E_GLOSS_UNKNOWN`
- [x] **P1.T3: Derived masks and ownership** — covers: FR-3, FR-4
  - [x] **P1.T3.1:** Last-writer ownership per pixel, replayed from ops rather than stored
  - [x] **P1.T3.2:** `E_EMPTY_PART` and `W_PART_OVERWRITE`
- [x] **P1.T4: Canonical serialisation** — covers: FR-1
  - [x] **P1.T4.1:** Stable key order for `parts`, materials and gloss on write
  - [x] **P1.T4.2:** Round-trip fixture proving a 1.0 recipe serialises identically
- [x] **P1.T5: Surface plumbing** — covers: FR-2, FR-3
  - [x] **P1.T5.1:** `part` accepted by `px draw` and `px_draw`
  - [x] **P1.T5.2:** Inspect and render responses expose part names without breaking the existing envelope

## Phase 2: Lighting Pass

- **Goal:** `light` produces bevel or round form, ambient occlusion, cast shadow and selective rim, with gloss-specific behaviour.
- **Depends on:** Phase 1
- **Covers:** FR-7, FR-8, FR-9, FR-10, FR-11, AC-7, AC-8, AC-9, AC-10
- **Touches:** src/core/ops/light.ts, src/core/ops/index.ts, src/core/compile.ts, src/core/errors.ts, test/light/**
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** afce9a6
- **Evidence:** conductor/tracks/20261113-static-art-quality/verification/phase-2.md

- [x] **P2.T1: Form** — covers: FR-7
  - [x] **P2.T1.1:** `flat`, `bevel` and `round` shading of a part's own silhouette
  - [x] **P2.T1.2:** Snapshot-then-write so the pass never reads its own output
- [x] **P2.T2: Ambient occlusion** — covers: FR-8
  - [x] **P2.T2.1:** One ramp step darker at boundaries with a higher `z`
  - [x] **P2.T2.2:** Never across transparency; clamp at canvas edges
- [x] **P2.T3: Cast shadow** — covers: FR-9
  - [x] **P2.T3.1:** Offset along the light vector, 1–4 px, caster family `shadow`
  - [x] **P2.T3.2:** Clip at canvas; never overwrite a higher-`z` owner
- [x] **P2.T4: Rim** — covers: FR-10
  - [x] **P2.T4.1:** `edge` highlights light-facing boundary, shadows opposite
  - [x] **P2.T4.2:** `selective` defers to the neighbouring family `outline`
- [x] **P2.T5: Gloss profiles** — covers: FR-11
  - [x] **P2.T5.1:** `metal` hard diagonal specular, no diffuse banding
  - [x] **P2.T5.2:** `gem` core and emissive rim; `cloth` dithered falloff; `matte` stepped bands

## Phase 3: Scale Profiles

- **Goal:** One data table drives thresholds, cluster minimums, dither eligibility, outline thickness and debug zoom from 8 to 256 px.
- **Depends on:** Phase 2
- **Covers:** FR-12, FR-13, FR-14, AC-11
- **Touches:** src/core/profile.ts, src/lint/**, src/render/debug/**, docs/art-profiles.md, test/profiles/**
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 13cbd95
- **Evidence:** conductor/tracks/20261113-static-art-quality/verification/phase-3.md

- [x] **P3.T1: Profile derivation** — covers: FR-12, FR-14
  - [x] **P3.T1.1:** `tiny`/`small`/`medium`/`large` from canvas size
  - [x] **P3.T1.2:** Explicit override with `W_PROFILE_MISMATCH`
- [x] **P3.T2: Threshold table** — covers: FR-13
  - [x] **P3.T2.1:** Move every constant into one table keyed by profile
  - [x] **P3.T2.2:** Wire all eleven lint codes and the cluster/dither/outline rules to it
- [x] **P3.T3: Debug zoom** — covers: FR-13
  - [x] **P3.T3.1:** Zoom per profile so a 256×256 sheet stays legible
- [x] **P3.T4: Documentation** — covers: FR-13
  - [x] **P3.T4.1:** `docs/art-profiles.md` with every value, its rationale and its fixtures

## Phase 4: Palette Intelligence

- **Goal:** Ramps can be synthesised in OKLCH with cool shadows and swapped at material level without touching the recipe.
- **Depends on:** Phase 3
- **Covers:** FR-15, FR-16, FR-17, FR-18, AC-13, AC-14
- **Touches:** src/palettes/**, src/core/**, src/render/**, src/meta/**, src/cli/**, src/mcp/**, test/palettes/**, vitest.config.ts
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** b290764
- **Evidence:** conductor/tracks/20261113-static-art-quality/verification/phase-4.md

- [x] **P4.T1: Synthesis** — covers: FR-15, FR-16
  - [x] **P4.T1.1:** sRGB ↔ OKLCH conversion and N-step expansion, no dependency
  - [x] **P4.T1.2:** Cool shadows, warm highlights, clamped chroma, grey input shifts luminance only
- [x] **P4.T2: Canonicalisation** — covers: FR-15
  - [x] **P4.T2.1:** Synthesised steps written explicitly into the recipe
- [x] **P4.T3: Step bounds** — covers: FR-17
  - [x] **P4.T3.1:** `E_RAMP_STEPS_RANGE` for counts outside 3–6
- [x] **P4.T4: Material swap** — covers: FR-18
  - [x] **P4.T4.1:** `--swap` in render, export and preview; recipe untouched
  - [x] **P4.T4.2:** `E_SWAP_INCOMPATIBLE` on tone-count mismatch

## Phase 5: Art Lint and Cleanup

- **Goal:** Seven art-direction codes with part attribution, plus deterministic `seal`, `strays` and `deband`.
- **Depends on:** Phase 4
- **Covers:** FR-19, FR-20, FR-21, AC-12, AC-15, AC-16, AC-17
- **Touches:** src/lint/**, src/core/**, src/cli/**, docs/lint-thresholds.md, test/art-lint/**, test/lint/**, test/benchmarks/benchmarks.test.ts, vitest.config.ts
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 841c09c
- **Evidence:** conductor/tracks/20261113-static-art-quality/verification/phase-5.md

- [x] **P5.T1: Value separation** — covers: FR-19, FR-20
  - [x] **P5.T1.1:** `VALUE_COLLISION` between adjacent parts within one step
- [x] **P5.T2: Shading shape** — covers: FR-19
  - [x] **P5.T2.1:** `BANDING` and `PILLOW_SHADE`
- [x] **P5.T3: Texture noise** — covers: FR-19
  - [x] **P5.T3.1:** `DITHER_NOISE` and `CLUSTER_THIN`
- [x] **P5.T4: Ramp and silhouette** — covers: FR-19
  - [x] **P5.T4.1:** `RAMP_NONMONOTONIC`
  - [x] **P5.T4.2:** `SILHOUETTE_LOSS` per background
- [x] **P5.T5: Attribution** — covers: FR-20
  - [x] **P5.T5.1:** Findings name the part; original codes keep severities
- [x] **P5.T6: Cleanup ops** — covers: FR-21
  - [x] **P5.T6.1:** `seal`, `strays`, `deband` with change reports and `W_CLEANUP_NOOP`

## Phase 6: Agent Ergonomics

- **Goal:** An agent can address pixels by name, prove an edit landed, and read per-part statistics.
- **Depends on:** Phase 5
- **Covers:** FR-22, FR-23, FR-24, NFR-4, AC-18, AC-19
- **Touches:** src/core/**, src/cli/**, src/mcp/**, src/render/debug/**, src/lint/**, test/ergonomics/**, test/mcp/**, docs/**, vitest.config.ts
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** verified
- **Result:** verified
- **Checkpoint:** 2c7513f
- **Evidence:** conductor/tracks/20261113-static-art-quality/verification/phase-6.md

- [x] **P6.T1: Named refs** — covers: FR-22
  - [x] **P6.T1.1:** `part.top|bottom|left|right|center|edge` and anchor refs with `dx`/`dy`
  - [x] **P6.T1.2:** `E_PART_UNKNOWN` for an unknown part
- [x] **P6.T2: Diff** — covers: FR-23
  - [x] **P6.T2.1:** `px diff` against a PNG or recipe hash: count, bbox, per-part breakdown
  - [x] **P6.T2.2:** `px_diff` as the eighth MCP tool, parity asserted
- [x] **P6.T3: Per-part statistics** — covers: FR-24
  - [x] **P6.T3.1:** Inspect returns bounds, pixel count, tone and value histograms
  - [x] **P6.T3.2:** Debug sheet adds per-part crops with bounded output

## Phase 7: Benchmarks and Rubric

- **Goal:** Seven assets scored blind against the rubric meet ≥4.0 mean with no criterion below 3, and the 256×256 budget holds.
- **Depends on:** Phase 6
- **Covers:** FR-25, NFR-3, NFR-7, AC-20
- **Touches:** test/art/**, test/benchmarks/**, test/benchmarks/performance.test.ts, scripts/**, docs/rubric.md, docs/art-profiles.md, vitest.config.ts
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** blocked
- **Result:** Tasks delivered, AC-20 **not met**: mean 3.79 against a 4.0 bar, with four criteria below 3 (humanoid lighting; scene lighting, edge_language and cluster_discipline). The bar was not lowered and no pass was selected over another; every pass is recorded in `test/art/scores.json` and checked by `test/art/rubric.test.ts`. Blocked on the decision of whether to ship with the criterion unmet or open a follow-on track for the authoring primitives the failures point at.
- **Evidence:** conductor/tracks/20261113-static-art-quality/verification/phase-7.md, conductor/tracks/20261113-static-art-quality/verification/phase-7-scoring.md
- **Checkpoint:** see `verification/phase-7-scoring.md`

- [x] **P7.T1: New benchmarks** — covers: FR-25
  - [x] **P7.T1.1:** 48×128 character, 64×64 mixed-material prop, 256×256 scene element
- [x] **P7.T2: Re-authored originals** — covers: FR-25
  - [x] **P7.T2.1:** Potion, sword, humanoid and chest rebuilt on the new surface as new files
  - [x] **P7.T2.2:** Original fixtures untouched; their hashes unchanged
- [x] **P7.T3: Rubric harness** — covers: FR-25, AC-20
  - [x] **P7.T3.1:** Six criteria, two model passes, human tiebreak, scores recorded
  - [x] **P7.T3.2:** `docs/rubric.md` defining each criterion and its anchors
- [x] **P7.T4: Performance** — covers: NFR-7
  - [x] **P7.T4.1:** 256×256 / 2,000 ops / full light pass, median of five runs
- [x] **P7.T5: Evidence** — covers: NFR-3
  - [x] **P7.T5.1:** Coverage, digests, rubric table and call counts in `verification/phase-7.md`
