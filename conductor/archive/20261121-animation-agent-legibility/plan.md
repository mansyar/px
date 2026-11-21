# Animation Agent Legibility Verification — Implementation Plan

> **Branch:** `chore/20261121-animation-agent-legibility`
> **Base:** `main` @ `4cc05bad23f3a11cd680922da0b15ba868d27842`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Build the docs-only brief and parity matrix

- **Goal:** A docs-only brief is assembled from the exact agent-facing surfaces,
  and a parity matrix covers all six frame subcommands and every flag across CLI
  help, MCP `px_frame`, and `docs/animation.md`.
- **Depends on:** none
- **Covers:** FR-1, FR-7, NFR-1, AC-1, AC-7
- **Touches:** `conductor/tracks/20261121-animation-agent-legibility/verification/docs-brief.md`, `conductor/tracks/20261121-animation-agent-legibility/verification/parity-matrix.md`, `conductor/tracks/20261121-animation-agent-legibility/verification/phase-1.md`
- **Verification:** `pnpm verify`; content assertion that `docs-brief.md` lists every source file consulted and `parity-matrix.md` names all six subcommands (`add`, `edit`, `remove`, `list`, `set-duration`, `move`) and all frame flags on all three surfaces.
- **Status:** verified

- [x] **P1.T1: Assemble the docs-only brief** — covers: FR-1, AC-1
  - [x] **P1.T1.1:** Capture CLI `frame --help` JSON and the full `px_frame` MCP tool description.
  - [x] **P1.T1.2:** Record the exact paths of `docs/animation.md`, `docs/art-profiles.md`, `docs/lint-thresholds.md`, and the product-guidelines canonical-description rule.
  - [x] **P1.T1.3:** Write the brief as the sole material the fresh agent will receive, plus the 16×16 four-frame flame asset goal.
- [x] **P1.T2: Produce the three-surface parity matrix** — covers: FR-7, AC-7
  - [x] **P1.T2.1:** Map each of the six subcommands and every flag across CLI help, MCP `px_frame`, and `docs/animation.md`.
  - [x] **P1.T2.2:** Mark each cell present/absent and note any drift verbatim.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** f42e931
**Evidence:** conductor/tracks/20261121-animation-agent-legibility/verification/phase-1.md
-->

## Phase 2: Run the fresh-agent benchmark and verify determinism

- **Goal:** Two fresh subagent runs each author a 16×16 four-frame flame from the
  brief alone; both recipes pass strict validation and export, and the two runs
  are byte-identical across recipe, sheet PNG, and timeline metadata.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-3, FR-4, FR-5, FR-6, NFR-4, AC-2, AC-3, AC-4, AC-5, AC-6
- **Touches:** `conductor/tracks/20261121-animation-agent-legibility/verification/agent-runs.md`, `conductor/tracks/20261121-animation-agent-legibility/verification/determinism.md`, `conductor/tracks/20261121-animation-agent-legibility/verification/artifacts/**`, `conductor/tracks/20261121-animation-agent-legibility/verification/phase-2.md`
- **Verification:** `pnpm verify`; two ordered call transcripts with counts; strict validation of each recipe reports zero `OUT_OF_BOUNDS` and zero `ORPHAN_PIXEL`; each export yields a sheet PNG and sheet metadata with a `timeline` block; byte comparison (SHA-256) of recipe, sheet, and timeline is recorded as identical or with the exact diff.
- **Status:** verified

- [x] **P2.T1: Run two fresh subagent benchmarks** — covers: FR-2, FR-3, AC-2, AC-3
  - [x] **P2.T1.1:** Launch a new subagent with no prior conversation, giving it only the docs-only brief and the asset goal.
  - [x] **P2.T1.2:** Repeat with a second fresh subagent and record the ordered call sequence and count for each run.
- [x] **P2.T2: Strict-validate and export each recipe** — covers: FR-4, FR-5, AC-4, AC-5
  - [x] **P2.T2.1:** Run strict validation; record `OUT_OF_BOUNDS`/`ORPHAN_PIXEL` counts and confirm informational findings are non-blocking.
  - [x] **P2.T2.2:** Run `render --export`; retain sheet PNG and sheet metadata with `timeline`.
- [x] **P2.T3: Compare bytes across the two runs** — covers: FR-6, AC-6
  - [x] **P2.T3.1:** Record SHA-256 for recipe JSON, sheet PNG, and timeline metadata in both runs.
  - [x] **P2.T3.2:** Record equality or the exact differing artifact.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** 21929ac
**Evidence:** conductor/tracks/20261121-animation-agent-legibility/verification/phase-2.md
-->

## Phase 3: Record the verdict and confirm scope

- **Goal:** An honest PASS/FAIL verdict is recorded with paths to every artifact,
  follow-up notes for any gap, and a confirmed diff showing no changes outside
  Conductor state.
- **Depends on:** Phase 2
- **Covers:** FR-8, NFR-2, NFR-3, AC-8, AC-9, AC-10
- **Touches:** `conductor/tracks/20261121-animation-agent-legibility/verification/agent-legibility.md`, `conductor/tracks/20261121-animation-agent-legibility/verification/phase-3.md`
- **Verification:** `pnpm verify`; `agent-legibility.md` contains a PASS/FAIL verdict and paths to every artifact; `git diff --stat <base-sha>..HEAD` shows no paths outside `conductor/`; no dependency manifest changed.
- **Status:** verified

- [x] **P3.T1: Write the final evidence report** — covers: FR-8, AC-8
  - [x] **P3.T1.1:** Record the verdict from the hard gates and link every artifact.
  - [x] **P3.T1.2:** List any gaps as follow-up notes without fixing them in-track.
- [x] **P3.T2: Confirm the evidence-only scope boundary** — covers: AC-9, AC-10
  - [x] **P3.T2.1:** Confirm the diff against base touches only Conductor state.
  - [x] **P3.T2.2:** Confirm no dependency manifest changed and no runtime dependency was added.

**Result:** verified
**Checkpoint:** 02ed637
**Evidence:** conductor/tracks/20261121-animation-agent-legibility/verification/phase-3.md

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends:** Phase 3
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->

## Phase R1: Review Fixes

- **Goal:** Resolve F1 (stale/unreachable verification-point hashes and scope diff)
  and F2 (spec overstates fresh-agent-exercised subcommands) with honest,
  reproducible evidence records — all inside Conductor state.
- **Depends on:** Phase 3
- **Covers:** F1, F2 (AC-8, AC-9, FR-2, AC-2)
- **Touches:** `conductor/tracks/20261121-animation-agent-legibility/spec.md`, `verification/agent-legibility.md`, `verification/phase-1.md`, `verification/phase-2.md`, `verification/phase-3.md`, `verification/integrated.md`, `verification/phase-R1.md`
- **Verification:** `pnpm verify`; every recorded hash reachable via `git log --all` or explicitly labelled a pre-squash working state with a reachable checkpoint; scope claim recorded as a reproducible command plus the all-paths-under-`conductor/` invariant rather than a brittle count; spec transcript claim matches both `calls.md`.
- **Status:** verified

- [x] **R1.T1: Resolve F1** — covers: F1, AC-8, AC-9
- [x] **R1.T2: Resolve F2** — covers: F2, FR-2, AC-2

**Result:** verified
**Checkpoint:** 4cebbfd
**Evidence:** conductor/tracks/20261121-animation-agent-legibility/verification/phase-R1.md
