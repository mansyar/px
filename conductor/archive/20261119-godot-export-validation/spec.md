# Godot 4 Export Validation — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

An evidence-only track that proves the Godot 4 export metadata produced by `render --export` is consumable by a real Godot 4 engine. The golden `hero` fixture will be exported with its `.meta.json`, imported into a temporary headless Godot 4 project, and checked with GDScript assertions covering the texture, `filter`/`centered` flags, the negated-trim `offset` rule, and anchor-to-local coordinate mapping. The outcome is an honest PASS with a complete evidence record, or a FAIL with an explicit follow-up — no product behavior changes.

## Problem / Motivation

`conductor/product.md:66` names Godot 4 the "first validated export target," and `:84` records the assumption that Godot pivot conventions map to px anchors via one offset rule, "confirmed when the exporter is written." Today `src/meta/index.ts` computes that rule (`offset = -trim origin`) and `test/mcp/meta-export.test.ts` verifies only that the emitted JSON matches `buildMetadata` and that the PNG hash is unchanged. No test involves Godot itself. If the rule is wrong in the engine context, integrators will build on an unverified contract. Because the workspace has a real Godot binary (`C:\Godot\godot.exe`, 4.7.2.stable.mono), the assumption can be closed cheaply before Phase 2.

## Goals & Success Metrics

- **Goal:** Validate the exported Godot metadata against real Godot 4 headlessly and record the result honestly.
- **Metric:** `verification/godot-validation.md` records every command, exit code, Godot version, hash, and assertion; PASS requires exported PNG hash equal to the golden, metadata JSON equal to `buildMetadata`, Godot script exit 0 with all numeric assertions true, and final checks green. Any discrepancy is recorded as FAIL with a follow-up, never hidden or forced to pass.

## Scope

### In Scope

- Render `test/goldens/fixtures/hero.px.json` with `render --export` in an isolated workspace; record PNG SHA-256 and `.meta.json`.
- Create a temporary Godot 4 project under gitignored `.conductor/evidence/godot-export/` with `project.godot`, the exported PNG, its `.meta.json`, the source recipe, and a GDScript validation script.
- Run Godot headlessly and assert: texture loads with expected trimmed dimensions; `texture_path` matches the copied PNG; `filter: false`; `centered: false`; `godot.offset == generic.origin == [-trim.x, -trim.y]`; and for every recipe anchor, `anchor + offset == anchor - trim` and the local coordinate lies inside the trimmed texture. For hero specifically, pivot `(8,8)` must map to local `(4,4)` inside an 8×8 trimmed texture.
- Confirm in the primary process that `--export` did not change the rendered PNG bytes, that Godot import left the PNG hash unchanged, and that `generic.recipe_hash` matches the canonical recipe bytes.
- Record the honest PASS/FAIL decision, exact commands/exits, Godot version, hashes, evidence paths, and any follow-up. No engine change.
- Final verification snapshot: `pnpm verify`, scoped coverage, determinism goldens, rubric report, `scores.json` hash, and code-delta scope.

### Out of Scope

- Changes to engine, CLI, MCP, ops, linter, rubric, CI, `test/art/**`, `scores.json`, recipes, goldens, or the Godot metadata format/anchor semantics.
- Product or guideline edits; a discrepancy is recorded, not silently fixed.
- Visual GUI screenshots, all seven v2 assets, external Godot downloads/installs, network calls, credentials.
- Phase 2 features, GitHub issue creation, merges, or re-scoring the published gate.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Export the golden hero fixture with `--export` in an isolated workspace; record PNG hash and `.meta.json`; PNG hash equals the committed golden digest. | must |
| FR-2 | Build a temporary Godot 4 project in gitignored evidence and run a headless GDScript validator that loads the exported texture and parses the metadata. | must |
| FR-3 | Assert Godot block fields in-engine: `texture_path`, `filter: false`, `centered: false`, and `offset == generic.origin == [-trim.x, -trim.y]`. | must |
| FR-4 | Assert the anchor transform in-engine: for each recipe anchor, `anchor + offset == anchor - trim` and the local coordinate lies inside the trimmed texture; hero pivot maps to `(4,4)`. | must |
| FR-5 | Confirm primary-side integrity: `--export` and Godot import leave PNG bytes unchanged; `recipe_hash` matches canonical recipe bytes. | must |
| FR-6 | Record an honest PASS/FAIL decision with exact commands, exits, Godot version, hashes, evidence paths, and explicit follow-up on any discrepancy; no engine change. | must |
| FR-7 | Record final verification: `pnpm verify`, scoped coverage, goldens, rubric report, scores hash, and empty code delta. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No product behavior change: only Conductor state/verification and gitignored evidence may change. |
| NFR-2 | Use configured commands exactly; `pnpm verify` exit 0 and scoped coverage ≥80% on all four metrics. |
| NFR-3 | Use the local Godot 4.7.2 binary headlessly; no download, install, credential, or network call. |
| NFR-4 | Evidence must record exact commands, exit codes, Godot version, hashes, and paths; no fabricated result. |
| NFR-5 | At most one bounded retry for transient environment startup failure; no re-rolls or fishing for favorable results. |
| NFR-6 | Archived tracks and `test/art/scores.json` remain byte-identical; published gate untouched. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | Exported hero PNG SHA-256 equals the committed golden digest and `.meta.json` exists and equals `buildMetadata` output. | FR-1 |
| AC-2 | Godot headless validation exits 0 and prints every assertion as passing. | FR-2, FR-3, FR-4 |
| AC-3 | The offset rule is verified: `godot.offset == generic.origin == [-trim.x,-trim.y]`, and hero pivot maps to local `(4,4)` inside the 8×8 trimmed texture. | FR-3, FR-4 |
| AC-4 | PNG bytes are unchanged after export and after Godot import; `recipe_hash` matches the canonical recipe bytes. | FR-5 |
| AC-5 | The decision is honestly recorded as PASS or FAIL with an explicit follow-up if any discrepancy exists; no engine or metadata change was made. | FR-6 |
| AC-6 | Final checks green: `pnpm verify` exit 0, scoped coverage ≥80% all four metrics, goldens exit 0, rubric report `mean 3.82 · pass`, scores hash unchanged. | FR-7, NFR-2, NFR-6 |
| AC-7 | Code delta is empty: only `conductor/**`, verification docs, and gitignored `.conductor/evidence/**` changed. | NFR-1 |
| AC-8 | Evidence docs contain exact commands, exit codes, Godot version, hashes, and artifact paths. | NFR-4 |

## Edge Cases

- Godot cannot start headlessly: record the environment failure as blocked with exact stderr; do not claim the product rule failed.
- Godot version differs from 4.7.2: record the actual version; do not claim cross-version validation.
- Trim is empty (no offset): not exercised by hero; record as a limitation, not a pass of that case.
- Anchor falls outside the trimmed texture: the GDScript assertion fails and is recorded as a real discrepancy.
- A required command is denied to a phase subagent: primary runs the exact command and re-invokes once with the output; no workaround.
- Godot writes `.import/` cache files: they stay under gitignored `.conductor/evidence/`; no tracked file changes.

## Dependencies

- **Tracks:** `20261118-gate-publishable-pass`, `20261118-phase1-closeout-audit`, `20261119-engineering-debt-sweep` — all archived complete.
- **External:** Local Godot 4.7.2 at `C:\Godot\godot.exe`; no credentials or network.

## Open Questions & Assumptions

- **Assumption:** Hero trims to an 8×8 region at `(4,4)` in a 16×16 canvas, so offset is `(-4,-4)` and pivot local is `(4,4)`; the track verifies this rather than trusting it.
- **Assumption:** `centered: false` draws from the texture's top-left, so anchor-to-local is `anchor + offset`; the GDScript assertion tests this arithmetic, not pixel colors.
- **Assumption:** `godot --headless --path <project> --script <file>` works in 4.7.2; if the flag form differs, the track records the exact failure and uses the documented equivalent once.
- **Assumption:** Any real engine/metadata defect requires a separate track; this one stays evidence-only.

## References

- `conductor/product.md:66` (Godot first validated export target), `:84` (pivot offset assumption).
- `src/meta/index.ts` (canonical Godot/generic metadata projection).
- `test/mcp/meta-export.test.ts` (existing shape-only export test).
- `test/goldens/fixtures/hero.px.json`, `hero.png`, `hero.sha256`.
- `conductor/tech-stack.md:113` (dated determinism/network note).
