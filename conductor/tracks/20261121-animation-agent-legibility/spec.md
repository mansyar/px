# Animation Agent Legibility Verification — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

An evidence-only track that verifies the newly shipped `px frame` / `px_frame`
surface using the project's primary success metric: a fresh agent, given only
agent-facing documentation, must be able to author a small framed animation.
The track produces a reproducible transcript, strict-gate results, byte
determinism evidence, and a three-surface documentation parity matrix. It does
not change engine code, CLI/MCP behavior, human docs, goldens, or CI.

## Problem / Motivation

PR #23 (`20261120-frame-authoring`) added six CLI subcommands and a 12th MCP
tool, `px_frame`. Those surfaces passed unit, integration, MCP byte-parity,
smoke, determinism, and coverage gates, but no fresh-agent, docs-only benchmark
has been run for animation authoring. The existing agent-legibility evidence
covers only static canonical assets (potion, sword, humanoid, chest). Without
this track, the primary product metric is unverified for the newest capability,
and drift between CLI help, MCP tool descriptions, and `docs/animation.md` can
go unnoticed — product guidelines declare MCP descriptions canonical and
require human docs not to drift.

## Goals & Success Metrics

- **Goal:** Prove that a fresh agent can author a 16×16 four-frame flame using
  only the curated docs surfaces, and that the resulting recipe, sheet, and
  timeline are strictly clean and byte-deterministic.
- **Metric:** Tool-call counts are recorded for each run (advisory, no
  threshold); the hard gates are zero `OUT_OF_BOUNDS` and `ORPHAN_PIXEL` under
  `--strict`, byte-identical recipe/sheet/timeline across two runs, and a
  complete CLI-help / MCP-description / `docs/animation.md` parity matrix.
- **Verdict:** PASS only when every hard gate passes; any gap is recorded as a
  follow-up, not fixed inside this track.

## Scope

### In Scope

- Curate a docs-only brief from CLI `--help` JSON, MCP tool descriptions
  (including `px_frame`), `docs/animation.md`, `docs/art-profiles.md`, and
  `docs/lint-thresholds.md`.
- Run a fresh subagent twice with that brief, asking it to author a 16×16
  four-frame flame recipe.
- Record the tool calls used by each run.
- Run strict validation and `render --export` for each run; compare recipe,
  sheet PNG, and timeline metadata bytes across runs.
- Produce a parity matrix covering all six `frame` subcommands and every flag
  across CLI help, MCP `px_frame`, and `docs/animation.md`.
- Write a PASS/FAIL evidence report and any follow-up notes under this track's
  verification directory.

### Out of Scope

- Engine, CLI, MCP, human-doc, golden, rubric, lint-threshold, or CI changes.
- Fixes for any defect discovered during the benchmark; those become a separate
  follow-up track.
- Playback runtime/player UI, interpolation, GIF/APNG/video encoders, tilemaps,
  interactive GUI, translucent alpha, RNG, npm publishing, and engine exports
  beyond the existing Godot 4 and generic schema.
- New runtime dependencies.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Assemble a docs-only brief that cites the exact CLI help JSON, MCP tool descriptions, and human-doc files used. | must |
| FR-2 | A new subagent with no prior conversation authors a 16×16 four-frame flame recipe using only that brief. | must |
| FR-3 | Record the tool-call sequence and count for each of two independent runs. | must |
| FR-4 | Run strict validation on each authored recipe and report `OUT_OF_BOUNDS` and `ORPHAN_PIXEL` counts. | must |
| FR-5 | Run `render --export` on each authored recipe and retain the sheet PNG and sheet metadata with `timeline`. | must |
| FR-6 | Repeat the authoring sequence twice and compare recipe JSON bytes, sheet PNG bytes, and timeline metadata bytes; record equality or the exact diff. | must |
| FR-7 | Produce a parity matrix for all six subcommands and all frame flags across CLI help, MCP `px_frame`, and `docs/animation.md`. | must |
| FR-8 | Produce an evidence report under `conductor/tracks/20261121-animation-agent-legibility/verification/` with verdict, evidence paths, and follow-up notes. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | All evidence and the report live under this track's verification directory; no artifacts are committed outside Conductor state. |
| NFR-2 | Only Conductor state is written; `src/`, `docs/`, goldens, rubric, thresholds, and CI remain byte-identical. |
| NFR-3 | The verdict is derived mechanically from the hard gates; call count is evidence only and never flips PASS to FAIL. |
| NFR-4 | No new runtime dependency is introduced; the benchmark uses the already-shipped CLI and MCP surfaces. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | The brief exists in the verification directory and lists every source file consulted. | FR-1 |
| AC-2 | Two fresh subagent runs complete a 16×16 four-frame flame recipe without prior project context. | FR-2 |
| AC-3 | The report records a tool-call count and ordered call sequence for each run. | FR-3 |
| AC-4 | Each recipe reports zero `OUT_OF_BOUNDS` and zero `ORPHAN_PIXEL` under strict validation. | FR-4 |
| AC-5 | Each run produces a sheet PNG and sheet metadata containing a `timeline` block. | FR-5 |
| AC-6 | Recipe JSON, sheet PNG, and timeline metadata bytes are identical between the two runs. | FR-6 |
| AC-7 | The parity matrix covers all six subcommands (`add`, `edit`, `remove`, `list`, `set-duration`, `move`) and every frame flag on all three surfaces. | FR-7 |
| AC-8 | `verification/agent-legibility.md` records a PASS or FAIL verdict with paths to every artifact. | FR-8 |
| AC-9 | `git diff` against the base contains no changes outside Conductor state. | NFR-2 |
| AC-10 | No dependency manifest changes. | NFR-4 |

## Edge Cases

- The docs-only brief is insufficient: record a FAIL with the exact missing
  information as a follow-up; do not amend the docs inside this track.
- Strict validation blocks sheet export: record the blocking finding and FAIL
  that run; informational `BANDING`/`CLUSTER_THIN`/`RAMP_NONMONOTONIC` findings
  do not fail the run.
- The two runs differ in bytes: record the differing artifact and a unified
  diff or SHA-256 pair; do not normalize by hand.
- A run exceeds 12 tool calls: record the count as evidence only; the verdict
  stays governed by the hard gates.
- A declared frame uses a numeric-string id: note how the docs instruct the
  agent to address it; this is a parity observation, not a code fix.
- MCP surface unavailable: record the blocked benchmark step and FAIL; no
  credentials or external services are expected, so this indicates a real
  regression.

## Dependencies

- **Tracks:** `20261120-frame-authoring` — recorded as satisfied; complete and
  merged in `4cc05ba` on `main`.
- **External:** none.

## Open Questions & Assumptions

- **Assumption:** Tool-call count has no pass/fail threshold for this track by
  explicit decision; it is recorded because the product metric values it.
- **Assumption:** "Fresh agent" means a new subagent with no prior conversation,
  receiving only the curated docs brief and the asset goal.
- **Assumption:** The benchmark asset is a 16×16 four-frame flame; the subject
  was chosen to exercise frame add/edit/set-duration/export within a small
  canvas budget.
- **Assumption:** Hard gates are the only verdict inputs; any discovered defect
  is filed as a follow-up rather than fixed in-track.

## References

- `conductor/product.md` — primary agent-legibility metric and animation scope.
- `conductor/product-guidelines.md` — MCP descriptions canonical; no doc drift.
- `conductor/workflow.md` — verification layers and commands.
- `docs/animation.md` — framed recipes, `px frame`, `px_frame`, sheet/timeline.
- PR #23 — `feat(frame): Frame Authoring for CLI and MCP`.
- `conductor/archive/20261118-agent-legibility-verification/spec.md` — prior static benchmark pattern.
