# Frame Authoring for CLI and MCP — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Add first-class frame authoring to `px`: a `frame` CLI verb and an `px_frame` MCP tool that create, edit, list, retime, reorder, and remove animation frames in a v1.4 recipe. Authoring no longer requires hand-editing the `frames` JSON array.

## Problem / Motivation

`docs/animation.md` documents a `frames` format, and the renderer/export already consume it, but no CLI verb or MCP tool can write it. `draw`/`edit` touch only `recipe.layers`, so producing a walk cycle meant copying a recipe by hand in a throwaway script. Users cannot author animation through supported tools; the documented format is effectively unreachable.

## Goals & Success Metrics

- **Goal:** Every frame operation is available through both CLI and MCP with identical semantics.
- **Metric:** Automated tests cover all six subcommands plus `px_frame`; an end-to-end test builds a framed recipe from scratch through the CLI with no hand-edited JSON, and `render --export` still emits a sheet and a timeline.

## Scope

### In Scope

- `frame add` with `--from <index|id>` deep-clone and/or explicit `--ops`
- `frame edit` with `--op-index` targeted edits and `--replace` whole-frame replacement
- `frame remove`, `frame list`, `frame set-duration`, `frame move --to <index>`
- MCP `px_frame` parity; structural + op validation on write; deterministic output

### Out of Scope

- HTML/player UI, onion-skin export changes, render/export semantic changes, new op types or palette features

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | `frame add` creates a declared frame from `--from` clone and/or explicit `--ops`; `id`/`duration` optional | must |
| FR-2 | `frame edit` replaces ops by `--op-index` or all frame ops with `--replace` | must |
| FR-3 | `frame remove` deletes a declared frame by id/index and refuses to remove frame 0 | must |
| FR-4 | `frame list` reports index, id, duration, layer/ops counts for declared frames | must |
| FR-5 | `frame set-duration` sets or clears a declared frame's duration | should |
| FR-6 | `frame move --to <index>` reorders declared frames, keeping frame 0 as the base | should |
| FR-7 | MCP `px_frame` exposes the same operations with identical semantics and output | must |
| FR-8 | Invalid metadata/targets/ops fail with clear errors before any file write | must |
| FR-9 | Ops are normalized and the recipe structurally validated on write; output is byte-deterministic | must |
| FR-10 | Authored frames are consumed unchanged by `render --export` (sheet + timeline metadata) | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | Identical command sequences produce byte-identical recipe files |
| NFR-2 | No new runtime dependencies; CLI and MCP share one core implementation |
| NFR-3 | Backwards compatible with existing v1.4 recipes and exports |
| NFR-4 | Errors use the existing `E_*` vocabulary; failed writes leave the recipe unchanged |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `frame add --from 0` produces a frame whose layers deep-equal frame 0's; `validate` ok | FR-1 |
| AC-2 | `frame add --ops <json>` produces exactly the supplied layers/ops | FR-1 |
| AC-3 | `frame edit --op-index 3 --ops <json>` changes only op 3 | FR-2 |
| AC-4 | `frame edit --replace --ops <json>` replaces the full ops list | FR-2 |
| AC-5 | `frame remove` works by id/index; removing frame 0 errors | FR-3 |
| AC-6 | `frame list` prints one row per declared frame with index/id/duration/counts | FR-4 |
| AC-7 | `set-duration 120` updates duration; `0` and `1.5` fail | FR-5 |
| AC-8 | `frame move --to 0` reorders declared frames; out-of-range fails | FR-6 |
| AC-9 | Each `px_frame` call produces the same recipe bytes as its CLI equivalent | FR-7 |
| AC-10 | Duplicate ids, unknown clone/edit/remove/move targets, and malformed ops fail before writing | FR-8 |
| AC-11 | Repeated identical sequences yield identical bytes and a valid recipe | FR-9 |
| AC-12 | `render --export` emits `<stem>.sheet.png` and `sheet.meta.json` with `timeline.total_ms` = sum of declared durations | FR-10 |

## Edge Cases

- Frame 0 is immutable via frame commands; `--from 0` is a read-only clone source.
- Empty `frames`, removing the last frame, moving within a single-frame list, moving to the same index.
- Unknown/clashing ids, index bounds, `--from` missing target, malformed `--ops` JSON.
- Durations must be positive integers; absent duration omitted from JSON.
- No file locking; concurrent writers use last-write-wins.

## Dependencies

- **Tracks:** none
- **External:** none

## Open Questions & Assumptions

- **Assumption:** Frame 0 remains the top-level `layers` with no `id`/`duration`, per `docs/animation.md`.
- **Assumption:** `product.md` lists animation as a deferred Phase 2 non-goal, but animation work is already complete; this track is authorized by your explicit direction.
- **Assumption:** Ids are non-empty, unique, case-sensitive strings; no character-pattern restriction.
- **Open question:** none blocking.

## References

- `docs/animation.md`; `src/core/recipe/` (types, parse, serialize); `src/cli/commands.ts` (`runDraw`/`runEdit`); `src/mcp/tools.ts`; `conductor/workflow.md`, `conductor/product.md`
