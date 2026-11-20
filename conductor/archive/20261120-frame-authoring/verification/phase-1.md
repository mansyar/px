# Phase 1 Verification — Core frame authoring engine

- Track: `20261120-frame-authoring` — Frame Authoring for CLI and MCP
- Phase: 1 — Core frame authoring engine
- Date: 2026-11-20
- Branch: `feat/20261120-frame-authoring`
- Phase base: `4b7bb00f4db8cefcfe3bcfb92ee107c2de1863a9`
- Head: `7c33aace1b872741707c1372c538bff21f9a42e9`
- Result: **blocked** — implementation and the full unit suite are complete and green, but three of
  the four verification commands were rejected by shell permission policy before execution, so the
  type, lint and build gates are unverified in this environment.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| unit (focused, test-first red) | `pnpm vitest run --project unit test/unit/frames.test.ts` | 1 | Expected failure: `Cannot find module '../../src/core/recipe/frames.js'` before implementation. |
| unit (focused, green) | `pnpm vitest run --project unit test/unit/frames.test.ts` | 0 | 27 frame tests pass. |
| unit | `pnpm vitest run --project unit` | 0 | 113 files, 1013 tests pass. |
| typecheck | `pnpm typecheck` | denied | `Permission denied: shell` — not executed. |
| lint | `pnpm lint` | denied | `Permission denied: shell` — not executed. |
| build | `pnpm build` | denied | `Permission denied: shell` — not executed. |
| whole chain | `pnpm vitest run --project unit && pnpm typecheck && pnpm lint && pnpm build` | denied | `Permission denied: shell` (`&&` chains are disallowed by the brief and by policy). |

The `pnpm vitest run --project unit` command from the verification set was run exactly as written;
the remaining three commands were each issued separately and each returned shell permission denial.
They were not retried, rephrased or routed through another mechanism.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | `add --from 0` deep-equals frame 0 and validates | `test/unit/frames.test.ts` → `addFrame > deep-clones frame 0 …`; `validAfter()` re-parses the serialized result | pass |
| AC-2 | `add --ops` produces exactly the supplied layers/ops | `addFrame > normalizes explicit layers into exactly the supplied ops` | pass |
| AC-3 | `edit --op-index 3` changes only op 3 | `editFrame > changes only op 3 of a four-op frame` and `> changes only the addressed op index` | pass |
| AC-4 | `edit --replace` replaces the full ops list | `editFrame > replaces the whole ops list with --replace` | pass |
| AC-5 | remove by id/index; frame 0 errors | `removeFrame > removes by id and by logical index`, `> refuses to remove frame 0` | pass |
| AC-6 | list one row per frame with index/id/duration/counts | `listFrames > reports one row per frame …` (base at index 0 plus one row per declared frame) | pass |
| AC-7 | set-duration 120 ok; 0 and 1.5 fail | `setFrameDuration > sets a positive integer duration …`, `> rejects the bad duration %s` | pass |
| AC-8 | `move --to 0` reorders; out-of-range fails | `moveFrame > reorders declared frames with a zero-based destination`, `> rejects an out-of-range destination and frame 0` | pass |
| AC-10 | duplicate ids, unknown targets, malformed ops fail before writing | `guardrails > rejects a duplicate frame id / a bad duration / an unknown clone, remove and edit target / malformed ops` | pass |
| AC-11 | repeated identical sequences yield identical bytes and a valid recipe | `guardrails > produces identical bytes for repeated identical sequences` | pass |

## Evidence paths

- `src/core/recipe/frames.ts` — six pure operations plus shared target/layer resolution and guards.
- `src/core/recipe/types.ts` — `FrameSelector`, `AddFrameOptions`, `EditFrameOptions`, `FrameRow`.
- `test/unit/frames.test.ts` — 27 table-driven operation and guardrail tests.
- Commits: `e6b3aef2c500eeae9b3d2c5ce25a1c741b1a5a0e` (engine + tests),
  `7c33aace1b872741707c1372c538bff21f9a42e9` (AC-3 edge case).

## Deviations

- None. All changes are inside the listed Touches plus this evidence file.

## Notes for the primary agent

- Please run `pnpm typecheck && pnpm lint && pnpm build` (or the full verification chain) in a shell
  with permission for those commands and record the result here. The unit gate is already green.
- API defined for the later CLI/MCP phases: frames are addressed by a logical index (0 = frame 0,
  1..N = `frames[0..N-1]`) or by id; move destinations are zero-based positions **inside `frames`**
  (so `--to 0` means "first declared frame", per AC-8). Frame 0 is immutable for every mutation
  and is only readable as a `--from` clone source. `listFrames` includes frame 0 as the index-0 row
  with `id: null`.
- `addFrame` promotes legacy versions to `'1.4'` because `normalizeRecipe` rejects `frames` below
  1.4; this is an explicit authoring action, not a silent read/write promotion.
- Frame ids are auto-generated as `frame-<n>` with the smallest non-colliding `n` when omitted.
- Mutations never write files; each guards before returning a new `Recipe`, so a thrown `PxError`
  leaves the caller's recipe untouched (NFR "failed writes leave the recipe unchanged").
- No runtime dependency was added.

## Primary verification

The primary agent independently ran the gates that were permission-denied for the phase subagent:

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| typecheck | `pnpm typecheck` | 0 | `tsc --noEmit` clean. |
| lint | `pnpm lint` | 0 | Biome clean after formatting the two new files; one pre-existing warning at `test/recipe/version-1-2.test.ts:50` (`noNonNullAssertion`), unrelated to this phase. |
| build | `pnpm build` | 0 | `tsc -p tsconfig.build.json` clean. |
| format fix | `pnpm exec biome check --write src/core/recipe/frames.ts test/unit/frames.test.ts` | 0 | Fixed 2 files (formatter-only changes). |
| full chain | `pnpm vitest run --project unit && pnpm typecheck && pnpm lint && pnpm build` | 0 | 113 files / 1013 tests pass; typecheck, lint and build pass. |

Diff scope against phase base `4b7bb00f4db8cefcfe3bcfb92ee107c2de1863a9`: exactly
`src/core/recipe/frames.ts`, `src/core/recipe/types.ts`, `test/unit/frames.test.ts`
(the declared Touches) plus this evidence file. No other files were touched by the phase.

Acceptance criteria AC-1..AC-8, AC-10 and AC-11 are covered by the 27 tests in
`test/unit/frames.test.ts`, including `validAfter()` re-parse of serialized results.
AC-9 (CLI/MCP byte parity) and AC-12 (sheet/timeline export) are assigned to later phases.

Result: **verified**. The subagent's `blocked` status is resolved by the primary runs above.

Note on FR-1 wording ("`--from` clone and/or explicit `--ops`"): when both a clone source and
explicit layers are supplied, the explicit layers win (`addFrame` checks `options.layers` first).
The edge case is not asserted by the spec's ACs; Phase 2 will document this precedence in CLI help.
