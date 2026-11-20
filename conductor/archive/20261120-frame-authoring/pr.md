## Summary

This track adds first-class frame authoring to `px`: a pure core engine plus a
`px frame` CLI verb and a byte-parity `px_frame` MCP tool, covering add, edit,
remove, list, set-duration, and move. Recipes remain v1.4-compatible, mutations
validate before writing, and `render --export` continues to produce frame sheets
and `timeline.total_ms`.

## Track

- **ID:** `20261120-frame-authoring`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261120-frame-authoring/spec.md`](conductor/archive/20261120-frame-authoring/spec.md)
- **Plan:** [`conductor/archive/20261120-frame-authoring/plan.md`](conductor/archive/20261120-frame-authoring/plan.md)
- **Review:** [`conductor/archive/20261120-frame-authoring/review.md`](conductor/archive/20261120-frame-authoring/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Core frame authoring engine | Pure add/edit/remove/list/duration/move with validation | verified | `7beee441` | 27 unit tests; frame 0 immutable; ids/durations validated before write |
| 2: CLI frame verb | Wire six subcommands through `px frame` | verified | `95c554d2` | serialize + structural re-parse before write; two staged MCP fixture deviations |
| 3: MCP px_frame parity | Expose `px_frame` with argv mapping and byte parity | verified | `b07fbea1` | 12th MCP tool; staged fixture deviations from Phase 2 resolved |
| 4: Documentation and integrated verification | Document contract and run all gates | verified | `2eb2159f` | `docs/animation.md`; all five layers + 80% coverage gate pass |
| R1: Review fixes | Fix F1 numeric-string ids and F2 empty add | verified | `02aae40c` | id-first selectors at all five call sites; `E_USAGE` when add has no source |

## Requirements

- [x] `FR-1` ΓÇö add frames from `--from` clone or explicit `--ops` (test: `test/integration/frame.test.ts`)
- [x] `FR-2` ΓÇö edit ops by `--op-index` or replace whole frame (test: `test/integration/frame.test.ts`)
- [x] `FR-3` ΓÇö remove frames, refusing frame 0 (test: `test/unit/frames.test.ts`)
- [x] `FR-4` ΓÇö list frames with index, id, duration, counts (test: `test/unit/frames.test.ts`)
- [x] `FR-5` ΓÇö set or clear duration (test: `test/integration/frame.test.ts`)
- [x] `FR-6` ΓÇö move a frame with zero-based `--to` (test: `test/integration/frame.test.ts`)
- [x] `FR-7` ΓÇö MCP `px_frame` exposes all six operations (test: `test/mcp/frame.test.ts`)
- [x] `FR-8` ΓÇö invalid targets fail before writing (test: `test/integration/frame.test.ts`)
- [x] `FR-9` ΓÇö normalized ops are byte-deterministic (test: `test/unit/frames.test.ts`)
- [x] `FR-10` ΓÇö `render --export` consumes authored frames (test: `test/integration/frame.test.ts`)
- [x] `NFR-1` ΓÇö identical edit sequences yield identical bytes
- [x] `NFR-2` ΓÇö no new runtime dependency; CLI and MCP share the core
- [x] `NFR-3` ΓÇö backwards compatible with existing recipes
- [x] `NFR-4` ΓÇö errors use the `E_*` vocabulary and leave files unchanged
- [x] `AC-1`ΓÇô`AC-12` ΓÇö see `review.md` requirements table

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test + typecheck + lint + build | `pnpm verify` | pass (123 files / 1111 tests) | `conductor/archive/20261120-frame-authoring/verification/integrated.md` |
| unit | `pnpm vitest run --project unit` | pass (114 / 1018) | `conductor/archive/20261120-frame-authoring/verification/phase-1.md` |
| integration | `pnpm vitest run --project integration` | pass (3 / 44) | `conductor/archive/20261120-frame-authoring/verification/phase-2.md` |
| smoke | `pnpm vitest run --project smoke` | pass (2 / 11) | `conductor/archive/20261120-frame-authoring/verification/phase-3.md` |
| determinism | `pnpm vitest run --project goldens` | pass (1 / 6, no re-baseline) | `conductor/archive/20261120-frame-authoring/verification/phase-4.md` |
| coverage | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | pass (94.89% stmts / 85.81% branches / 98.3% funcs / 94.69% lines; gate 80%) | `conductor/archive/20261120-frame-authoring/verification/integrated.md` |

## Review

- **Verdict:** `PASS`
- **Rounds:** 2
- **Fixed:** 2 findings (F1 numeric-string id selectors, F2 empty `frame add`)
- **Accepted/deferred:** 0 (see `review.md`)

## Deviations and risks

- Phase 2 temporarily added frame flags to `NOT_AGENT_FLAGS` and `frame` to the
  published help fixture so the staged rollout could pass; Phase 3 removed the
  former and mapped all flags, completing the deviation.
- `docs/animation.md` sentences scoped to export-only/view-only were clarified
  when the new verb and tool were added.
- Decided ids take precedence over numeric selectors: a frame explicitly given
  id `"0"` shadows the base for selector `0`. Documented and AC-compatible.
- `frames.ts` line coverage is 87.61% (above the 80% gate); remaining gaps are
  defensive branches.

## Follow-ups

- none

## Rollback

```bash
# Merge commit
git revert --no-edit -m 1 <merge-commit>
```
