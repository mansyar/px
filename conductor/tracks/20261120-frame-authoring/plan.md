# Frame Authoring for CLI and MCP — Implementation Plan

> **Branch:** `feat/20261120-frame-authoring`
> **Base:** `main` @ `d6715dd634c48891571e2514d9027ac50eded4c6`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Core frame authoring engine

- **Goal:** A pure `src/core/recipe/frames.ts` module performs all six frame operations with structural validation and byte-deterministic output, proven by unit tests.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-8, FR-9 · AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-10, AC-11
- **Touches:** `src/core/recipe/frames.ts`, `src/core/recipe/types.ts`, `test/unit/frames.test.ts`
- **Verification:** `pnpm vitest run --project unit && pnpm typecheck && pnpm lint && pnpm build`
- **Status:** verified

- [x] **P1.T1: Frame mutation API** — covers: FR-1, FR-2, FR-3, FR-4, FR-5, FR-6
  - [x] **P1.T1.1:** `addFrame` with `--from` deep-clone and/or explicit ops
  - [x] **P1.T1.2:** `editFrame` by op index and whole-frame replace
  - [x] **P1.T1.3:** `removeFrame`, `listFrames`, `setFrameDuration`, `moveFrame`
- [x] **P1.T2: Guardrails and normalization** — covers: FR-8, FR-9
  - [x] **P1.T2.1:** Reject duplicate ids, bad durations, unknown targets, out-of-range moves, malformed ops
  - [x] **P1.T2.2:** Reuse existing op normalization; deterministic serialization; frame 0 immutability
- [x] **P1.T3: Unit tests** — covers: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-10, AC-11
  - [x] **P1.T3.1:** Table-driven tests per operation and guardrail
  - [x] **P1.T3.2:** Repeated identical sequences produce identical bytes and a valid recipe

<!--
**Result:** verified
**Checkpoint:** 7beee44
**Evidence:** conductor/tracks/20261120-frame-authoring/verification/phase-1.md
-->

## Phase 2: CLI `frame` verb

- **Goal:** `px frame <subcommand>` works end to end over temporary recipe directories, with authored frames consumed unchanged by export.
- **Depends on:** Phase 1
- **Covers:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-8, FR-9, FR-10 · AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-10, AC-11, AC-12
- **Touches:** `src/cli/main.ts`, `src/cli/commands.ts`, `src/cli/args.ts`, `test/integration/frame.test.ts`
- **Verification:** `pnpm vitest run --project integration && pnpm verify`
- **Status:** verified

- [x] **P2.T1: Verb dispatch and argument parsing** — covers: FR-1, FR-2, FR-3, FR-4, FR-5, FR-6
- [x] **P2.T2: `runFrame` wiring to the core engine** — covers: FR-8, FR-9
- [x] **P2.T3: Integration tests including export timeline** — covers: AC-12

<!--
**Result:** verified
**Checkpoint:** 95c554d
**Evidence:** conductor/tracks/20261120-frame-authoring/verification/phase-2.md
-->

## Phase 3: MCP `px_frame` parity

- **Goal:** MCP `px_frame` exposes all six operations with identical semantics and byte-identical output to the CLI.
- **Depends on:** Phase 2
- **Covers:** FR-7 · AC-9
- **Touches:** `src/mcp/tools.ts`, `test/mcp/frame.test.ts`, `test/smoke/binaries.test.ts`
- **Verification:** `pnpm vitest run --project unit && pnpm vitest run --project smoke && pnpm verify`
- **Status:** verified

- [x] **P3.T1: `px_frame` tool delegating to the core engine** — covers: FR-7
- [x] **P3.T2: CLI-vs-MCP byte-parity tests** — covers: AC-9
- [x] **P3.T3: Smoke test for tool registration** — covers: FR-7

<!--
**Result:** verified
**Checkpoint:** b07fbea
**Evidence:** conductor/tracks/20261120-frame-authoring/verification/phase-3.md
-->

## Phase 4: Documentation and integrated verification

- **Goal:** `docs/animation.md` documents the authoring commands and all five verification layers pass together on the track branch.
- **Depends on:** Phase 3
- **Covers:** FR-7, FR-10, NFR-3 · AC-9, AC-12
- **Touches:** `docs/animation.md`
- **Verification:** `pnpm verify && pnpm vitest run --project goldens && pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens`
- **Status:** verified

- [x] **P4.T1: Document `px frame` / `px_frame` in `docs/animation.md`** — covers: FR-7, FR-10

<!--
**Result:** verified
**Checkpoint:** 2eb2159
**Evidence:** conductor/tracks/20261120-frame-authoring/verification/phase-4.md
-->

## Phase R1: Review fixes

- **Goal:** Resolve review findings F1 (numeric-string frame ids are unreachable as selectors) and F2 (`frame add` silently creates an empty frame).
- **Depends on:** Phase 4
- **Covers:** F1, F2
- **Touches:** `src/cli/commands.ts`, `test/integration/frame.test.ts`, `test/mcp/frame.test.ts`, `docs/animation.md`
- **Verification:** `pnpm verify && pnpm vitest run --project unit && pnpm vitest run --project integration && pnpm vitest run --project smoke && pnpm vitest run --project goldens && pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens`
- **Status:** verified

- [x] **R1.T1: Resolve numeric-string selectors against declared frame ids first** — covers: F1
- [x] **R1.T2: Require `--from` or `--ops` for `frame add` and document the rule** — covers: F2

<!--
**Result:** verified
**Checkpoint:** 02aae40
**Evidence:** conductor/tracks/20261120-frame-authoring/verification/phase-R1.md
-->

