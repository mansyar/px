# Authoritative Design Intent — Implementation Plan

> **Branch:** `feat/20261117-authoritative-design-intent`
> **Base:** `main` @ `77de1e56d5c88c976a13f43d9677b22addaa09d6`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.
>
> Every phase verifies with **both** `pnpm verify` and `pnpm vitest run --coverage`.
> The hero digest `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb`
> and every committed 1.0/1.1 digest must stay byte-identical until Phase 5
> re-authors assets as **new** files.

## Phase 1: Intent Schema and Compatibility

- **Goal:** A 1.2 recipe can declare a `design` block, inherit a project style file, validate its intent, round-trip canonically, and be authored through both CLI and MCP — while every 1.0/1.1 recipe renders byte-identically.
- **Depends on:** none
- **Covers:** FR-1, FR-3, FR-4, FR-15, FR-16, FR-17, NFR-1, NFR-2, NFR-6, AC-1, AC-2, AC-3
- **Touches:** `src/core/recipe/**`, `src/core/design.ts`, `src/core/errors.ts`, `src/style/**`, `src/cli/**`, `src/mcp/**`, `test/design/**`, `vitest.config.ts`
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** verified
- **Result:** verified — a 1.2 design block is canonical, validated and authorable through both surfaces; no legacy digest moved
- **Checkpoint:** 27d7a2a
- **Evidence:** conductor/tracks/20261117-authoritative-design-intent/verification/phase-1.md

- [x] **P1.T1: Version 1.2 and the design type** — covers: FR-1, FR-17
  - [x] **P1.T1.1:** accept `1.2`, model `subject`, `light`, `hierarchy`, `values`, `edges`, `materials`, `style`
  - [x] **P1.T1.2:** reject `design` on `1`/`"1.0"`/`"1.1"` with `E_BAD_VERSION`; no silent promotion
- [x] **P1.T2: Project style file and inheritance** — covers: FR-3, AC-3
  - [x] **P1.T2.1:** parse `px.style.json` with allowed ramps, edge vocabulary, default light, minimum contrast and value rules
  - [x] **P1.T2.2:** resolve `"style": "@project"` deterministically; `E_STYLE_MISSING` when absent
- [x] **P1.T3: Intent validation** — covers: FR-4
  - [x] **P1.T3.1:** `E_INTENT_*` codes and hints for unknown light, edge, undeclared hierarchy part, values outside 1–5, unknown ramp
- [x] **P1.T4: Canonical serialisation and hashing** — covers: FR-16, AC-1
  - [x] **P1.T4.1:** fixed `design` key order, untouched on round-trip, included in recipe hash
- [x] **P1.T5: Authoring surface and compatibility proof** — covers: FR-15, NFR-1, NFR-2, NFR-6, AC-2
  - [x] **P1.T5.1:** every `design` field authorable through CLI and `px_init` in the same commit; reachability test covers the new parameters
  - [x] **P1.T5.2:** digest sweep proving every committed 1.0/1.1 recipe renders byte-identically

## Phase 2: Intent-Driven Passes

- **Goal:** Declared intent drives the shading passes, explicit flags override it visibly, and `harmonize` rewrites the whole sprite without touching geometry or ownership.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-5, FR-6, FR-7, FR-8, AC-4, AC-5, AC-6
- **Touches:** `src/core/ops/**`, `src/core/recipe/**`, `src/core/compile.ts`, `src/core/design.ts`, `src/core/errors.ts`, `src/cli/**`, `src/mcp/**`, `docs/**`, `test/intent-passes/**`, `vitest.config.ts`
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** verified
- **Result:** verified — declared intent drives light, edges and value targets; overrides are reported; harmonize rewrites tones without touching geometry or ownership
- **Checkpoint:** 57a246f
- **Evidence:** conductor/tracks/20261117-authoritative-design-intent/verification/phase-2.md

- [x] **P2.T1: Default resolution and deviation reporting** — covers: FR-2, AC-4
  - [x] **P2.T1.1:** passes read declared defaults; explicit op flags win and are reported in response deviations
  - [x] **P2.T1.2:** a flag equal to the default records no deviation
- [x] **P2.T2: Light and outline read design** — covers: FR-5, FR-6, AC-4, AC-5
  - [x] **P2.T2.1:** `light` defaults its angle to `design.light`
  - [x] **P2.T2.2:** `auto_outline` produces distinct silhouette/material/detail treatments from `design.edges`
- [x] **P2.T3: Value targets for ramps** — covers: FR-7
  - [x] **P2.T3.1:** `ramp_fill` and `auto_shade` resolve tones from `design.values` for the owning part
- [x] **P2.T4: Harmonize pass** — covers: FR-8, AC-6
  - [x] **P2.T4.1:** rewrite light, edge and value structure across all parts
  - [x] **P2.T4.2:** prove geometry and ownership arrays byte-identical before/after, including cast shadows and cleanup ops; `W_HARMONIZE_NOOP` on no-op

## Phase 3: Brief and Blockout

- **Goal:** An agent can plan a subject and judge masses and values before drawing detail, with no network dependency and no recipe writes.
- **Depends on:** Phase 2
- **Covers:** FR-9, FR-10, NFR-5, AC-7, AC-8
- **Touches:** `src/brief/**`, `src/core/design.ts`, `src/render/**`, `src/cli/**`, `src/mcp/**`, `test/brief/**`, `test/mcp/**`, `vitest.config.ts`
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** verified
- **Result:** verified — `px brief` plans locally with nine-tool parity, and value views leave recipes and committed digests untouched
- **Checkpoint:** 758fa53
- **Evidence:** conductor/tracks/20261117-authoritative-design-intent/verification/phase-3.md

- [x] **P3.T1: Built-in subject templates** — covers: FR-9, NFR-5
  - [x] **P3.T1.1:** structured scaffolds for at least three subjects with parts, proportion ranges, hero part and value hierarchy
  - [x] **P3.T1.2:** `E_SUBJECT_UNKNOWN` lists known subjects; templates are local data only
- [x] **P3.T2: Brief verb and MCP tool** — covers: FR-9, AC-7
  - [x] **P3.T2.1:** `px brief <subject> --size N` emits a design scaffold in the same commit as its MCP tool
- [x] **P3.T3: Blockout and posterise render modes** — covers: FR-10, AC-8
  - [x] **P3.T3.1:** `--blockout` and `--values N` render views without writing a recipe or changing the committed digest

## Phase 4: Critique and Fix

- **Goal:** Feedback becomes a ranked whole-image gap report with applyable fixes, bounded at 256×256 and fully reachable from both tool surfaces.
- **Depends on:** Phase 3
- **Covers:** FR-11, FR-12, FR-13, FR-14, NFR-4, NFR-5, AC-9, AC-10, AC-11, AC-15
- **Touches:** `src/critique/**`, `src/core/**`, `src/cli/**`, `src/mcp/**`, `test/critique/**`, `test/mcp/**`, `vitest.config.ts`
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** verified
- **Result:** verified — ranked symbolic critique, stale-checked fixes, caller-supplied stagnation and a bounded 20-fix response are all reachable from CLI and MCP; no digest moved
- **Checkpoint:** b90cd20
- **Evidence:** conductor/tracks/20261117-authoritative-design-intent/verification/phase-4.md

- [x] **P4.T1: Gap report** - covers: FR-11, AC-9
  - [x] **P4.T1.1:** intended vs observed per criterion, ranked, each fix with `{op, why, expected_delta}` and an index
  - [x] **P4.T1.2:** empty canvas reports `W_CRITIQUE_EMPTY`, never a fabricated fix
- [x] **P4.T2: Fix verb and stale detection** — covers: FR-12, AC-9
  - [x] **P4.T2.1:** `px fix --finding N` applies the op and re-renders; `E_FIX_STALE` and `W_FIX_NOOP` pinned
- [x] **P4.T3: Stagnation signal** — covers: FR-13, AC-10
  - [x] **P4.T3.1:** appears after the configured number of unchanged calls, clears when the picture changes
- [x] **P4.T4: Bounded response** — covers: NFR-4, AC-15
  - [x] **P4.T4.1:** fixes capped at 20 at 256×256 with a true total and truncated marker
- [x] **P4.T5: Tool parity** — covers: FR-14, NFR-5, AC-11
  - [x] **P4.T5.1:** every new CLI flag published as an MCP parameter and every MCP parameter emitted as argv, asserted in both directions against `inputSchema.properties`

## Phase 5: Re-authoring the Seven Assets

- **Goal:** All seven benchmark assets exist again as new files carrying `design` blocks and project style, with the originals and their digests untouched.
- **Depends on:** Phase 4
- **Covers:** FR-18, AC-12
- **Touches:** `test/art/**`, `px.style.json`, `docs/**`, `vitest.config.ts`
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** verified
- **Result:** verified — seven fresh v2 recipes carry real hero-first design blocks and inherit the root project style; every original asset, digest, score and rubric file is untouched
- **Checkpoint:** bc25828
- **Evidence:** conductor/tracks/20261117-authoritative-design-intent/verification/phase-5.md

- [x] **P5.T1: The four weak assets** — covers: FR-18, AC-12
  - [x] **P5.T1.1:** humanoid, scene, sword and character re-authored with declared light, hierarchy, values and edges
- [x] **P5.T2: The three passing assets** — covers: FR-18, AC-12
  - [x] **P5.T2.1:** potion, chest and prop re-authored defensively, without trading a passing asset for a regression

## Phase 6: Re-scoring, Budget and Evidence

- **Goal:** The re-authored set is scored with the unchanged instrument and the honest verdict is recorded; the performance and coverage budgets still hold.
- **Depends on:** Phase 5
- **Covers:** FR-19, FR-20, NFR-3, NFR-6, NFR-7, AC-13, AC-14, AC-16, AC-17
- **Touches:** `test/art/**`, `test/benchmarks/**`, `scripts/**`, `docs/rubric.md`, `verification/**`, `vitest.config.ts`
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** verified
- **Result:** verified for delivery — all six phases and budgets complete; **AC-14 failed** (mean 3.39 against 4.0, eight scores below the floor), recorded honestly in `test/art/scores.json` and `verification/phase-6-scoring.md` with no bar lowered or pass selected
- **Checkpoint:** c888977
- **Evidence:** conductor/tracks/20261117-authoritative-design-intent/verification/phase-6.md

- [x] **P6.T1: Re-score with the same instrument** — covers: FR-19, FR-20, AC-13, AC-14
  - [x] **P6.T1.1:** two passes per asset, schema 3 record, criteria anchors and views unchanged from before this track
  - [x] **P6.T1.2:** recompute the verdict from the record; record failure honestly if mean < 4.0 or any criterion < 3 — never lower the bar or select a pass
- [x] **P6.T2: Performance and coverage** — covers: NFR-3, NFR-6, NFR-7, AC-16, AC-17
  - [x] **P6.T2.1:** 256×256 with 2,000 ops, `light` and `harmonize` under 500 ms median of five runs
  - [x] **P6.T2.2:** coverage gate on the enlarged include list with no threshold or exclude change, no new runtime dependency
- [x] **P6.T3: Evidence** — covers: FR-20
  - [x] **P6.T3.1:** per-asset before/after table with pass means, criterion means and the honest verdict, plus the unchanged-original digest proof

## Phase R1: Review Fixes

- **Goal:** Close the one High and one Low finding from review round 1, making the coverage evidence true rather than restating it.
- **Depends on:** Phase 6
- **Covers:** F1, F2, NFR-3, AC-9, AC-17
- **Touches:** `vitest.config.ts`, `src/critique/**`, `test/**`, `docs/**`, `conductor/tracks/20261117-authoritative-design-intent/verification/**`
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** verified
- **Result:** verified — both review findings closed at the cause: new modules are inside the coverage gate with real tests above 80% statements and branches, and the critique rationale names the op it emits
- **Checkpoint:** 7bc868d
- **Evidence:** conductor/tracks/20261117-authoritative-design-intent/verification/phase-R1.md

- [x] **R1.T1: Enlarge the coverage scope** — covers: F1, NFR-3, AC-17
  - [x] **R1.T1.1:** add `src/brief/**`, `src/critique/**` and `src/render/views.ts` to the v8 coverage include list; add real tests until statements AND branches are at least 80% on every new module; leave thresholds, excludes and ignore comments unchanged
  - [x] **R1.T1.2:** correct the P6.T2.2 claim and the phase-4 evidence line so they describe the actual include list
- [x] **R1.T2: Make the fix rationale name its op** — covers: F2, AC-9
  - [x] **R1.T2.1:** rewrite the `edge_language` finding's `why` to describe the emitted `auto_outline` edge pass and pin it with a test
