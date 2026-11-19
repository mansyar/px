# Animation Inspection & Playback — Implementation Plan

> **Branch:** `feat/20261119-animation-playback`
> **Base:** `main` @ `b3f984f49374b8ba394afa4d3a708f4a93af67ca`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`. Only the primary agent writes this file; phase subagents report results and the primary records them.

## Phase 1: Onion-skin neighbor-strip view

- **Goal:** `--onion <index>` on a framed recipe produces a deterministic prev | current | next sibling PNG with blank boundary panels, without changing any normal render byte.
- **Depends on:** none
- **Covers:** FR-1, FR-2, NFR-1, NFR-3, NFR-4, AC-1, AC-2, AC-3
- **Touches:** `src/render/views.ts`, `src/cli/args.ts`, `src/cli/commands.ts`, `test/render/views.test.ts`, `test/cli/`, `test/goldens/fixtures/anim-duo.onion<index>.sha256`, `test/goldens/render.test.ts`, `verification/onion-view.md`, `verification/phase-1.md`
- **Verification:** `pnpm verify`; `pnpm exec vitest run test/render/views.test.ts test/goldens/render.test.ts`
- **Status:** verified

- [x] **P1.T1: Onion view primitive** — covers: FR-2
  - [x] **P1.T1.1:** Add `{kind:'onion', index:number}` to `ViewSpec`, a sibling path suffix in `viewPath`, and a frames-aware renderer that composites prev | selected | next through the existing rasterizer/encoder with blank transparent boundary panels.
  - [x] **P1.T1.2:** Reuse the already-computed `compileRecipeFrames(effective)` rather than recompiling; keep `renderView`/`renderDebugSheet` single-compiled contracts intact via a separate dispatch path.
- [x] **P1.T2: Flag and CLI plumbing** — covers: FR-1, AC-1, AC-3
  - [x] **P1.T2.1:** Add `--onion <index>` value flag to `args.ts` (`VALUE_FLAGS`, `ParsedArgs`, setter); require a framed recipe and validate integer `[0, frames.length]` with an actionable error.
  - [x] **P1.T2.2:** Wire `renderViewSpec`/`runRender` to select the onion view, write the sibling PNG, preserve the no-`--debug`/no-`--export` rule, and report the view in the envelope.
- [x] **P1.T3: Golden evidence and Phase 1 regression proof** — covers: FR-5 (partial), AC-2, AC-3
  - [x] **P1.T3.1:** Add a committed onion-view SHA-256 sidecar and a double-render assertion mirroring `render.test.ts:50-70`; assert strip geometry and blank boundaries.
  - [x] **P1.T3.2:** Confirm `hero.sha256`, `anim-duo.sha256`, `anim-duo.sheet.sha256`, frame-0 bytes and `scores.json` unchanged; record evidence in `verification/onion-view.md` and `verification/phase-1.md`.

**Result:** verified
**Checkpoint:** 3285f28
**Evidence:** conductor/tracks/20261119-animation-playback/verification/phase-1.md

## Phase 2: Timeline metadata and agent-facing surfaces

- **Goal:** framed `--export` emits an additive, deterministic `timeline` block and the onion flag is documented consistently across CLI, MCP and docs, with unchanged envelope and single-frame bytes.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-4, FR-5 (timeline assertion), FR-6, NFR-1, NFR-2, NFR-3, NFR-4, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9
- **Touches:** `src/meta/index.ts`, `src/cli/commands.ts`, `src/cli/main.ts`, `src/mcp/tools.ts`, `docs/animation.md`, `test/mcp/meta-export.test.ts`, `test/mcp/parity.test.ts`, `verification/timeline.md`, `verification/phase-2.md`
- **Verification:** `pnpm verify`; `pnpm exec vitest run test/mcp/meta-export.test.ts test/mcp/parity.test.ts`; deterministic double render of framed export.
- **Status:** verified

- [x] **P2.T1: Additive timeline metadata** — covers: FR-3, FR-4, AC-5, AC-6
  - [x] **P2.T1.1:** Derive an ordered `timeline` array from the existing sheet-frame/duration source with per-frame `index`, `id`, `duration_ms`, `start_ms` and `total_ms`; frame 0 omits `duration_ms` and contributes 0.
  - [x] **P2.T1.2:** Add `timeline?` to generic metadata using the conditional-spread pattern so single-frame exports emit no key and stay byte-identical; keep `v` and all existing fields unchanged.
- [x] **P2.T2: Agent-facing descriptions and parity** — covers: FR-6, AC-4, AC-8
  - [x] **P2.T2.1:** Add `--onion` to CLI `--help` usage/flags and to `px_render`'s description, input schema and `argvFor` mapping; no new tool, envelope additive-only.
  - [x] **P2.T2.2:** Extend CLI/MCP parity tests for the onion sibling PNG and timeline metadata; add `docs/animation.md` sections for the view and timeline contract.
- [x] **P2.T3: Evidence and regression proof** — covers: FR-5, AC-7, AC-9
  - [x] **P2.T3.1:** Assert timeline values equal declared durations and that double-rendered framed exports are byte-identical; keep all protected digests and the publishable gate unchanged.
  - [x] **P2.T3.2:** Record command results, hashes and scope proof in `verification/timeline.md` and `verification/phase-2.md`.

**Result:** verified
**Checkpoint:** 8b80d91
**Evidence:** conductor/tracks/20261119-animation-playback/verification/phase-2.md

## Phase 3: Closeout decision and integrated record

- **Goal:** record an honest pass/fail with final checks and prove no protected artifact, score, golden or archive changed.
- **Depends on:** Phase 2
- **Covers:** NFR-1, NFR-2, NFR-4, AC-9, AC-10
- **Touches:** `verification/decision.md`, `verification/phase-3.md`
- **Verification:** `pnpm verify`; scoped coverage; `pnpm vitest run --project goldens`; `node scripts/rubric-report.mjs`; scores hash; `git diff --name-only b3f984f..HEAD`.
- **Status:** verified

- [x] **P3.T1: Record the honest closeout decision** — covers: AC-10
  - [x] **P3.T1.1:** State pass/fail from measured Phase 1/2 evidence with exact commands, exits, digests and paths.
  - [x] **P3.T1.2:** Record limitations honestly (no playback runtime, interpolation, overlay, HTML/GIF/APNG, no new tool); no forced pass or re-baseline.
- [x] **P3.T2: Final verification snapshot** — covers: NFR-1, NFR-2, NFR-4, AC-9
  - [x] **P3.T2.1:** Re-run all configured checks at final HEAD and record results.
  - [x] **P3.T2.2:** Confirm `scores.json`, goldens, archives, CI config and tracked-change scope are unchanged.

**Result:** verified
**Checkpoint:** c69576e
**Evidence:** conductor/tracks/20261119-animation-playback/verification/phase-3.md

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes
...
-->
