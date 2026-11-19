# Product Documentation Reconciliation — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This chore reconciles the project-level documentation with animation scope that
has already shipped. Tracks `20261119-animation-foundations` (PR #20) and
`20261119-animation-playback` (PR #21) are merged, and `conductor/tech-stack.md`
records them in dated notes, but `conductor/product.md` still declares
animation, onion-skinning and sprite-sheet packing deferred Phase 2 non-goals
and says no Phase 2 work has started. The track corrects that contradiction,
adds the new canonical terms to `conductor/product-guidelines.md`, and closes a
stale runtime run record. No runtime, test, rubric or protected artifact changes.

## Problem / Motivation

`conductor/` is the source of truth for agents working on px. When the product
definition says a shipped capability is still deferred, an agent can decline to
use `--onion`, the `timeline` metadata block or sheet export, or plan duplicate
work. `conductor/tech-stack.md` was updated by the shipped tracks, so the two
foundational documents now disagree. `conductor/product-guidelines.md` also
lacks entries for `frame`, `timeline` and `onion view`, terms that are now part
of the response envelope and CLI surface. Finally, the gitignored runtime file
`.conductor/runs/20261119-animation-playback.json` still reports `status:
"running"` for a completed, archived, merged track, producing a `doctor`
warning. Left alone, these inconsistencies degrade the agent-facing accuracy
that is the product's primary success metric.

## Goals & Success Metrics

- **Goal:** product-level documentation accurately reflects delivered animation scope and the remaining deferred boundary.
- **Metric:** zero statements in `conductor/product.md` that defer animation, onion-skinning or sheet packing as unstarted; all three new terms present in `conductor/product-guidelines.md` with definitions matching `docs/animation.md`; `pnpm verify` exit 0; protected scope diff empty; scores digest unchanged.

## Scope

### In Scope

- Surgical correction of `conductor/product.md`: remove delivered animation features from the deferred list and add a dated note that explicitly supersedes the 2026-11-18 deferral statement, naming the shipped tracks and PRs.
- Add canonical `frame`, `timeline` and `onion view` terms to the terminology table in `conductor/product-guidelines.md`, consistent with `docs/animation.md` and the `conductor/tech-stack.md` dated notes.
- Close the stale `.conductor/runs/20261119-animation-playback.json` runtime record to `status: "complete"`.
- Record verification evidence (commands, exits, digests, honest limitations) in this track's `verification/` directory.

### Out of Scope

- Any change to engine source, CLI, MCP, recipe schema, renderer, linter, rubric, tests, `docs/animation.md`, scripts, package manifests, lockfile or CI configuration.
- Any new feature or promotion of a deferred item (tilemaps, auto-tiling, interactive GUI, translucent alpha, RNG, npm publishing, playback runtime, GIF/APNG/video encoders) into scope.
- Re-baselining `test/art/scores.json`, golden sidecars, or any archived track; editing other archived tracks' ledgers or historical annotations.
- Rewriting the whole `Scope & Non-Goals` section; other dated notes remain as historical records.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | `conductor/product.md` stops listing delivered animation features (frames, deterministic sheet packing, onion-skin neighbor view, additive timeline metadata) as deferred Phase 2 work; a new dated note supersedes the 2026-11-18 statement and names PR #20 and PR #21 | must |
| FR-2 | `conductor/product-guidelines.md` defines `frame`, `timeline` and `onion view` consistently with `docs/animation.md` and the `conductor/tech-stack.md` dated notes | must |
| FR-3 | The stale `.conductor/runs/20261119-animation-playback.json` record is set to `status: "complete"`; no other run record is modified | must |
| FR-4 | An evidence file records the exact verification commands, exit codes, digests and honest limitations for the track | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No diff in `src/`, `test/`, `scripts/`, `docs/animation.md`, `package.json`, `pnpm-lock.yaml`, `.github/` or `.aws/` versus the base SHA |
| NFR-2 | Protected baselines remain byte-identical: `test/art/scores.json` (`E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`), `hero.sha256`, `anim-duo.sha256`, `anim-duo.sheet.sha256`, and all other archived tracks |
| NFR-3 | Committed changes are limited to the two product docs, this track's Conductor state and evidence; the run-state file is gitignored runtime state only |
| NFR-4 | The remaining deferred list keeps the genuinely out-of-scope items and does not introduce contradictory Phase 2 phrasing |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `conductor/product.md` has no deferred bullet claiming animation, onion-skinning or sheet packing is unstarted; the new dated note explicitly supersedes the 2026-11-18 deferral and references PR #20/#21 | FR-1 |
| AC-2 | All three terms appear in the `product-guidelines.md` terminology table with definitions matching `docs/animation.md`; no conflicting synonym is introduced | FR-2 |
| AC-3 | `.conductor/runs/20261119-animation-playback.json` reports `status: "complete"`; other run records are byte-identical | FR-3 |
| AC-4 | Protected-scope `git diff` versus the base SHA is empty and the scores digest matches the baseline | FR-4, NFR-1, NFR-2, NFR-3 |
| AC-5 | `pnpm verify` exits 0 at final HEAD | NFR-1 |
| AC-6 | A committed evidence file records commands, exit codes, digests and limitations | FR-4 |

## Edge Cases

- Historical `[x]` registry annotations that mention open ACs or accepted gate gaps are ledger notes about earlier tracks, not defects for this chore to rewrite.
- The phrase "Phase 1" elsewhere in the docs is historical context and may remain; only statements that defer shipped animation work are corrected.
- `.conductor/` is gitignored, so the run-state correction is a local runtime fix and must not be staged with the scaffold or phase commits.
- The 2026-11-18 dated note is retained as a historical record; the new note supersedes it rather than deleting or rewriting it.

## Dependencies

- **Tracks:** `20261119-animation-foundations`, `20261119-animation-playback` (both complete, archived and merged as PR #20 and PR #21)
- **External:** none

## Open Questions & Assumptions

- **Assumption:** the approved choices in the track interview authorize the specific wording changes; no new product scope is granted by this chore.
- **Assumption:** `docs/animation.md` and the `conductor/tech-stack.md` dated notes are accurate descriptions of shipped behavior and serve as the definitional source for the new terms.
- **Assumption:** the approved track ID `20261119-product-doc-reconciliation` is retained even though scaffolding occurs after the local date rolled over, for consistency with the approved spec and plan.

## References

- `conductor/product.md` (Scope & Non-Goals; 2026-11-18 dated note)
- `conductor/product-guidelines.md` (Terminology)
- `conductor/tech-stack.md` (2026-11-19 animation-foundations and animation-playback dated notes)
- `docs/animation.md` (onion view and timeline contracts)
- `conductor/archive/20261119-animation-foundations/metadata.json`, `conductor/archive/20261119-animation-playback/metadata.json`
- PRs #20 and #21: https://github.com/mansyar/px/pull/20, https://github.com/mansyar/px/pull/21
