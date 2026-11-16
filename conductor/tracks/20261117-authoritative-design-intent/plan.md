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
- **Status:** in_progress

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
- **Touches:** `src/brief/**`, `src/render/**`, `src/cli/**`, `src/mcp/**`, `test/brief/**`
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** pending

- [ ] **P3.T1: Built-in subject templates** — covers: FR-9, NFR-5
  - [ ] **P3.T1.1:** structured scaffolds for at least three subjects with parts, proportion ranges, hero part and value hierarchy
  - [ ] **P3.T1.2:** `E_SUBJECT_UNKNOWN` lists known subjects; templates are local data only
- [ ] **P3.T2: Brief verb and MCP tool** — covers: FR-9, AC-7
  - [ ] **P3.T2.1:** `px brief <subject> --size N` emits a design scaffold in the same commit as its MCP tool
- [ ] **P3.T3: Blockout and posterise render modes** — covers: FR-10, AC-8
  - [ ] **P3.T3.1:** `--blockout` and `--values N` render views without writing a recipe or changing the committed digest

## Phase 4: Critique and Fix

- **Goal:** Feedback becomes a ranked whole-image gap report with applyable fixes, bounded at 256×256 and fully reachable from both tool surfaces.
- **Depends on:** Phase 3
- **Covers:** FR-11, FR-12, FR-13, FR-14, NFR-4, NFR-5, AC-9, AC-10, AC-11, AC-15
- **Touches:** `src/critique/**`, `src/cli/**`, `src/mcp/**`, `test/critique/**`, `vitest.config.ts`
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** pending

- [ ] **P4.T1: Gap report** — covers: FR-11, AC-9
  - [ ] **P4.T1.1:** intended vs observed per criterion, ranked, each fix with `{op, why, expected_delta}` and an index
  - [ ] **P4.T1.2:** empty canvas reports `W_CRITIQUE_EMPTY`, never a fabricated fix
- [ ] **P4.T2: Fix verb and stale detection** — covers: FR-12, AC-9
  - [ ] **P4.T2.1:** `px fix --finding N` applies the op and re-renders; `E_FIX_STALE` and `W_FIX_NOOP` pinned
- [ ] **P4.T3: Stagnation signal** — covers: FR-13, AC-10
  - [ ] **P4.T3.1:** appears after the configured number of unchanged calls, clears when the picture changes
- [ ] **P4.T4: Bounded response** — covers: NFR-4, AC-15
  - [ ] **P4.T4.1:** fixes capped at 20 at 256×256 with a true total and truncated marker
- [ ] **P4.T5: Tool parity** — covers: FR-14, NFR-5, AC-11
  - [ ] **P4.T5.1:** every new CLI flag published as an MCP parameter and every MCP parameter emitted as argv, asserted in both directions against `inputSchema.properties`

## Phase 5: Re-authoring the Seven Assets

- **Goal:** All seven benchmark assets exist again as new files carrying `design` blocks and project style, with the originals and their digests untouched.
- **Depends on:** Phase 4
- **Covers:** FR-18, AC-12
- **Touches:** `test/art/**`, `docs/**`
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** pending

- [ ] **P5.T1: The four weak assets** — covers: FR-18, AC-12
  - [ ] **P5.T1.1:** humanoid, scene, sword and character re-authored with declared light, hierarchy, values and edges
- [ ] **P5.T2: The three passing assets** — covers: FR-18, AC-12
  - [ ] **P5.T2.1:** potion, chest and prop re-authored defensively, without trading a passing asset for a regression

## Phase 6: Re-scoring, Budget and Evidence

- **Goal:** The re-authored set is scored with the unchanged instrument and the honest verdict is recorded; the performance and coverage budgets still hold.
- **Depends on:** Phase 5
- **Covers:** FR-19, FR-20, NFR-3, NFR-6, NFR-7, AC-13, AC-14, AC-16, AC-17
- **Touches:** `test/art/**`, `test/benchmarks/**`, `scripts/**`, `docs/rubric.md`, `verification/**`, `vitest.config.ts`
- **Verification:** `pnpm verify` and `pnpm vitest run --coverage`
- **Status:** pending

- [ ] **P6.T1: Re-score with the same instrument** — covers: FR-19, FR-20, AC-13, AC-14
  - [ ] **P6.T1.1:** two passes per asset, schema 3 record, criteria anchors and views unchanged from before this track
  - [ ] **P6.T1.2:** recompute the verdict from the record; record failure honestly if mean < 4.0 or any criterion < 3 — never lower the bar or select a pass
- [ ] **P6.T2: Performance and coverage** — covers: NFR-3, NFR-6, NFR-7, AC-16, AC-17
  - [ ] **P6.T2.1:** 256×256 with 2,000 ops, `light` and `harmonize` under 500 ms median of five runs
  - [ ] **P6.T2.2:** coverage gate on the enlarged include list with no threshold or exclude change, no new runtime dependency
- [ ] **P6.T3: Evidence** — covers: FR-20
  - [ ] **P6.T3.1:** per-asset before/after table with pass means, criterion means and the honest verdict, plus the unchanged-original digest proof
