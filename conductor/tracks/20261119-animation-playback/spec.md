# Animation Inspection & Playback — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not renumber it. If a requirement is removed, mark it `Withdrawn` instead of deleting it.

## Overview

This track delivers the second Phase 2 animation increment: an opt-in onion-skin inspection view and a duration-driven timeline contract. It builds directly on the shipped v1.4 frame model — which records `duration` but never interprets it — by adding a deterministic neighbor-strip view for agents and an additive timeline projection in export metadata. It proves both with new golden evidence while leaving every existing frame-0 byte, sheet digest, gate score and archive untouched.

## Problem / Motivation

Animation Foundations (PR #20) shipped framed recipes, multi-frame compile, per-frame lint, and sprite-sheet export, but deliberately left `duration` uninterpreted and shipped no way to inspect motion. An agent authoring a two-frame animation today can render the sheet, but cannot see a frame next to its neighbors to judge whether a movement reads correctly, and cannot read back a timing table. If this is not solved now, later playback/GUI work will invent its own duration semantics and risk conflicting with the recorded field. Establishing the inspection and timeline contracts now, additively, keeps the frame model the single source of truth and preserves the byte-identical determinism gates.

## Goals & Success Metrics

- **Goal:** prove that framed recipes can be inspected frame-by-frame and export a deterministic timing table without altering any existing render, export byte, or gate.
- **Metric:** a new onion-view golden renders twice to an identical SHA-256; a timeline assertion proves `duration` flows through unchanged; `pnpm verify` exits 0; scoped coverage stays ≥80%; `test/art/scores.json` SHA-256 remains `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`; `hero.sha256`, `anim-duo.sha256` and `anim-duo.sheet.sha256` remain byte-identical.

## Scope

### In Scope

- New opt-in `--onion <index>` value flag on `px render` and the `px_render` MCP tool; integer index over compiled frames (0-based, including frame 0).
- New view kind producing a deterministic **3-panel neighbor strip**: previous | selected | next, each at full canvas size, with deterministic blank (transparent) panels at boundaries. Sibling output `<stem>.onion<index>.png`, never overwriting `--out`.
- Additive `timeline` block in `<stem>.meta.json` when `--export` is used on a framed recipe: per-frame `index`, `id` (when declared), `duration_ms` (when declared), `start_ms`, plus `total_ms`. Existing `v` and all existing fields unchanged; single-frame exports emit no `timeline` and stay byte-identical.
- New golden evidence: onion-view SHA-256 sidecar with a two-render determinism assertion and a timeline field-flow assertion.
- Updated CLI `--help`, MCP `px_render` description/schema and argument mapping, and `docs/animation.md`; extended CLI/MCP parity coverage. No new CLI verb or MCP tool.

### Out of Scope

- Ghosted/tinted overlay onion mode, interpolation, tweening, easing, or frame generation.
- Playback runtime, player UI, event/animation timelines with tracks or keyframes, GIF/APNG/video encoders, static HTML preview.
- Any change to the frame schema, recipe version, frame-0 compile path, sprite-sheet packing, linter rules/thresholds, rubric, CI config, `scores.json`, archives, product/spec docs, or new dependencies.
- New top-level recipe fields, a `--frame <id>` selector, or allowing onion to combine with `--debug`/`--export`.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Accept `--onion <index>` on `px render` and `px_render`; require a framed recipe (≥1 additional frame); validate an integer index in `[0, frames.length]` and reject non-integer/negative/out-of-range values with an error naming the valid range. No new verb or tool. | must |
| FR-2 | Render a deterministic 3-panel neighbor strip (prev | selected | next) at full canvas size using the existing rasterizer/encoder; emit deterministic blank panels at frame 0 (no prev) and last frame (no next); write a sibling `<stem>.onion<index>.png` and never overwrite `--out`; preserve the existing rule that views cannot combine with `--debug`/`--export`. | must |
| FR-3 | When `--export` is used on a framed recipe, add an optional `timeline` block to generic metadata: an ordered per-frame array with `index`, `id` (additional frames), `duration_ms` (when declared), `start_ms`, and a `total_ms`; keep `v` and every existing field unchanged; emit no `timeline` for single-frame recipes. | must |
| FR-4 | Define `duration` as milliseconds; frame 0 declares no duration, so its entry omits `duration_ms` and contributes 0 to cumulative time; `start_ms` is the sum of declared durations of preceding frames and `total_ms` is the sum of all declared durations. | must |
| FR-5 | Ship a new golden SHA-256 sidecar for the onion view with a two-render determinism assertion, and a test proving timeline values equal the recipe's declared durations; keep all existing golden digests and the publishable gate unchanged. | must |
| FR-6 | Update CLI `--help`, MCP `px_render` description/input schema and argument mapping, and `docs/animation.md`; extend CLI/MCP parity coverage; keep the response envelope additive-only. | should |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No change to any Phase 1 or Animation Foundations byte: frame-0 PNG, `hero.sha256`, `anim-duo.sha256`, `anim-duo.sheet.sha256`, `scores.json`, archives and CI config stay byte-identical. |
| NFR-2 | `pnpm verify` exits 0; scoped coverage `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` stays ≥80% on all four metrics. |
| NFR-3 | Onion view and timeline output are pure functions of the recipe: no RNG, timestamps, absolute paths, locale-dependent ordering or host-dependent behavior. |
| NFR-4 | No new dependency, no new image encoder, no new CLI verb or MCP tool, no recipe schema change; expensive output remains opt-in; `v:1` envelope additive-only. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `--onion 1` on the two-frame fixture succeeds; non-integer, negative, out-of-range and single-frame-recipe cases fail with an actionable error naming the valid range or the need for frames. | FR-1 |
| AC-2 | The onion view writes `<stem>.onion<index>.png` beside `--out`, never overwrites `--out`, and two renders produce the committed SHA-256; frame 0's panel is blank on the left and the last frame's is blank on the right. | FR-2, FR-5 |
| AC-3 | `--onion` combined with `--debug` or `--export` is rejected with the existing usage error; the normal render bytes are unchanged when no onion flag is passed. | FR-2, NFR-1 |
| AC-4 | CLI and MCP `px_render --onion` produce byte-identical envelopes and the same sibling onion PNG; no new tool appears in `ListTools`. | FR-1, FR-6 |
| AC-5 | Framed `--export` emits `timeline` with correct per-frame index/id/duration_ms/start_ms and total_ms; frame 0 omits `duration_ms` and starts at 0; single-frame export emits no `timeline` and stays byte-identical. | FR-3, FR-4 |
| AC-6 | Existing `v`, `sheet`, anchors, offset, palette and `recipe_hash` fields in metadata are unchanged; the sheet PNG bytes are unchanged. | FR-3, NFR-1 |
| AC-7 | New onion golden passes the double-render test twice; `hero.sha256`, `anim-duo.sha256` and `anim-duo.sheet.sha256` are unchanged. | FR-5, NFR-1 |
| AC-8 | CLI `--help` and MCP `px_render` description mention `--onion`; `docs/animation.md` documents the view and timeline contract; response envelope unchanged. | FR-6 |
| AC-9 | `pnpm verify` exit 0; scoped coverage ≥80%; `scores.json` SHA unchanged; tracked diff limited to approved Touches. | NFR-1, NFR-2 |
| AC-10 | Final record states an honest pass/fail with evidence; no score, rationale, digest, golden, archive or CI value was re-baselined. | NFR-1, NFR-3 |

## Edge Cases

- Selecting index 0 emits a blank (transparent) previous panel; selecting the last frame emits a blank next panel; both panels are full canvas size.
- A recipe with no `frames` cannot use `--onion`; it fails before writing any file.
- Non-integer, negative and out-of-range indices fail with `E_BAD_PARAM` (or the project's equivalent) naming `[0, frames.length]`.
- Frames that omit `duration` produce no `duration_ms` entry and contribute 0 to cumulative time; a fully undurated recipe still emits a `timeline` with `start_ms: 0` for every frame and `total_ms: 0`.
- Onion output is a sibling of `--out`; if a file already exists at that path it is overwritten deterministically, as with existing views.
- Existing view restrictions hold: onion cannot combine with `--debug` or `--export`; backdrop only affects `--debug` as today.
- No new MCP tool: `onion` is a new property on `px_render`, and the sibling PNG is returned via the envelope's `out` authority already used for other views.

## Dependencies

- **Tracks:** `20261119-animation-foundations` (complete; merge commit `b3f984f` is the current base and an ancestor).
- **External:** none. No credentials, network, Godot runtime or VLM scoring.

## Open Questions & Assumptions

- **Assumption:** `duration` is expressed in milliseconds, matching the recorded fixture value `120`; the timeline uses `_ms` suffixes to make this explicit.
- **Assumption:** frame 0 has no declared duration; its timeline entry omits `duration_ms` and contributes 0 to cumulative time. Consumers decide how to display frame 0; this slice does not invent a default.
- **Assumption:** a blank onion panel is a fully transparent canvas of the recipe's width × height, rasterized through the same deterministic path as real frames.
- **Assumption:** sibling naming follows the existing view convention (`<stem>.onion<index>.png`, analogous to `.blockout.png`/`.valuesN.png`).
- **Assumption:** additive metadata fields do not require bumping `v`, following the project's additive-only envelope rule.

## References

- `conductor/archive/20261119-animation-foundations/spec.md` (frame model, sheet contract, protected baselines).
- `conductor/product.md:49-57` (Phase 2 deferrals), `:77` (scope-creep risk).
- `conductor/tech-stack.md` 2026-11-19 animation-foundations dated note (currently declares onion-skin/timeline out of scope; this track supersedes it with a new dated note).
- `conductor/product-guidelines.md:20-37,43-61,74` (determinism, opt-in expense, envelope, terminology, MCP descriptions).
- `src/render/views.ts:1-9,37-50,163-172`; `src/core/compile.ts:290-316`; `src/core/recipe/types.ts:526-543,611-612`; `src/core/recipe/normalize.ts:1740-1796`; `src/meta/index.ts:41-63,86-111,205-207`; `src/cli/args.ts:77-122`; `src/cli/commands.ts:865-879,1071-1104,1110-1162`; `src/cli/main.ts:41-95`; `src/mcp/tools.ts:263-300,479-494,540-547`; `test/goldens/render.test.ts:41-112`; `test/mcp/parity.test.ts`; `docs/animation.md`.
