# Animation Foundations — Implementation Plan

> **Branch:** `feat/20261119-animation-foundations`
> **Base:** `main` @ `d082eae6b958da29bf67cada67b46d3b3b86684a`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`. Only the primary agent writes this file; phase subagents report results and the primary records them.

## Phase 1: Version-gated frame schema and compile

- **Goal:** v1.4 recipes with an optional `frames` array parse, canonicalize and compile deterministically, with frame 0 byte-identical to today and every frame linted in stable order.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, NFR-1, NFR-3, NFR-4, AC-1, AC-2, AC-3, AC-4, AC-10
- **Touches:** `src/core/recipe/types.ts`, `src/core/recipe/normalize.ts`, `src/core/recipe/serialize.ts`, `src/core/compile.ts`, `src/lint/types.ts`, `src/lint/index.ts`, `test/recipe/version-1-4.test.ts`, `test/unit/recipe.test.ts`, `test/unit/compile.test.ts`, `verification/schema-frames.md`, `verification/phase-1.md`
- **Verification:** `pnpm verify`; `pnpm exec vitest run test/recipe/version-1-4.test.ts test/unit/recipe.test.ts test/unit/compile.test.ts`
- **Status:** in_progress

- [ ] **P1.T1: Add version 1.4 and `frames` validation** — covers: FR-1, AC-1
  - [ ] **P1.T1.1:** Extend `RecipeVersion`/`ACCEPTED_VERSIONS` and `versionRank`; add the `frames` key to `RECIPE_KEYS` and gate it to ≥1.4 with an error naming the required version.
  - [ ] **P1.T1.2:** Validate frame shape: non-empty unique `id`, optional integer `duration`, required `layers`; reject empty `frames` arrays.
- [ ] **P1.T2: Canonical frame serialization** — covers: FR-2, AC-2
  - [ ] **P1.T2.1:** Emit `frames` in `canonicalRecipe` at a fixed position only when present; preserve existing key order for all other recipes.
  - [ ] **P1.T2.2:** Prove byte-identical round-trip for framed v1.4 and unchanged round-trip for v1.3/v1.4-without-frames.
- [ ] **P1.T3: Multi-frame compile preserving frame 0** — covers: FR-3, AC-3
  - [ ] **P1.T3.1:** Compile top-level `layers` as frame 0 and each `frames[i].layers` through the same stateless op pipeline, sharing base canvas/palette/design.
  - [ ] **P1.T3.2:** Assert frame 0 flattened/layers/owners and render SHA equal the legacy single-frame result; assert additional-frame pixel hashes.
- [ ] **P1.T4: Per-frame lint and Phase 1 regression proof** — covers: FR-4, NFR-1, NFR-3, AC-4, AC-10
  - [ ] **P1.T4.1:** Add an optional `frame` field to `LintFinding`; order by frame index, then existing severity/code/coord; keep frame-0 findings unchanged.
  - [ ] **P1.T4.2:** Keep version-1.2/1.3 tests, `hero.sha256`, goldens and gate scores unchanged; record evidence in `verification/schema-frames.md` and `verification/phase-1.md`.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261119-animation-foundations/verification/phase-1.md
-->

## Phase 2: Sheet export, additive metadata, fixture and docs

- **Goal:** a framed recipe rendered with `--export` produces a deterministic sheet PNG and additive sheet metadata without changing any single-frame export byte or envelope.
- **Depends on:** Phase 1
- **Covers:** FR-5, FR-6, FR-7, FR-8, NFR-1, NFR-2, NFR-3, NFR-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10
- **Touches:** `src/cli/commands.ts`, `src/meta/index.ts`, `src/mcp/tools.ts`, `src/cli/main.ts`, `docs/animation.md`, `test/goldens/fixtures/anim-duo.px.json`, `test/goldens/fixtures/anim-duo.sha256`, `test/goldens/fixtures/anim-duo.sheet.sha256`, `test/goldens/render.test.ts`, `test/mcp/meta-export.test.ts`, `test/mcp/parity.test.ts`, `verification/export-sheet.md`, `verification/phase-2.md`
- **Verification:** `pnpm verify`; `pnpm exec vitest run test/goldens/render.test.ts test/mcp/meta-export.test.ts test/mcp/parity.test.ts`; deterministic double render of the new fixture.
- **Status:** pending

- [ ] **P2.T1: Deterministic sheet PNG export** — covers: FR-5, AC-5, AC-6
  - [ ] **P2.T1.1:** When `--export` is used on a framed recipe, pack all frame canvases left-to-right into one row using the existing `encodePng` and write `<stem>.sheet.png`.
  - [ ] **P2.T1.2:** Emit no sheet artifacts without `--export` or for single-frame recipes; keep `asset.png` bytes equal to frame 0.
- [ ] **P2.T2: Additive sheet metadata** — covers: FR-6, AC-7
  - [ ] **P2.T2.1:** Add a `sheet` block to generic metadata with frame index, id, x/y/width/height, trim, origin and optional duration; keep `v` and all existing fields unchanged.
  - [ ] **P2.T2.2:** Write `<stem>.sheet.meta.json` beside the sheet PNG only when the sheet PNG is written.
- [ ] **P2.T3: Golden fixture and determinism proof** — covers: FR-7, AC-6, AC-8
  - [ ] **P2.T3.1:** Add a 2-frame `anim-duo` fixture with committed single-frame and sheet SHA-256 files; never re-baseline `hero.sha256`.
  - [ ] **P2.T3.2:** Render twice and assert both digests match; extend the goldens determinism test without changing existing golden assertions.
- [ ] **P2.T4: Agent-facing descriptions and docs** — covers: FR-8, AC-9
  - [ ] **P2.T4.1:** Update `render` usage in `--help` and the MCP `px_render` tool description to mention framed sheet export; keep the response envelope unchanged.
  - [ ] **P2.T4.2:** Add `docs/animation.md` describing the frame/sheet contract in canonical terminology; extend meta-export and parity tests for the additive field.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261119-animation-foundations/verification/phase-2.md
-->

## Phase 3: Closeout decision and integrated record

- **Goal:** record an honest pass/fail decision with final checks and prove that no Phase 1 artifact, score, golden or archive changed.
- **Depends on:** Phase 2
- **Covers:** NFR-1, NFR-2, NFR-4, AC-10, AC-11
- **Touches:** `verification/decision.md`, `verification/phase-3.md`
- **Verification:** `pnpm verify`; scoped coverage; `pnpm vitest run --project goldens`; `node scripts/rubric-report.mjs`; scores hash; `git diff --name-only d082eae..HEAD`.
- **Status:** pending

- [ ] **P3.T1: Record the honest closeout decision** — covers: AC-11
  - [ ] **P3.T1.1:** State the pass/fail verdict from measured Phase 1/2 evidence, with exact commands, exits, digests and paths.
  - [ ] **P3.T1.2:** Record any limitation honestly; no forced pass, no re-roll, no score or digest edit.
- [ ] **P3.T2: Final verification snapshot** — covers: NFR-1, NFR-2, NFR-4, AC-10
  - [ ] **P3.T2.1:** Re-run all configured checks at final HEAD and record results.
  - [ ] **P3.T2.2:** Confirm `scores.json`, goldens, archives and tracked-change scope are unchanged.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261119-animation-foundations/verification/phase-3.md
-->

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes
...
-->
