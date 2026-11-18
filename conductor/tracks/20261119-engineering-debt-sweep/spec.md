# Engineering Debt Sweep — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

Close the three accepted maintenance gaps left by Phase 1 without changing product behavior: bring the four `scripts/*.mjs` helpers under Biome lint/format, remove stale runtime state from `.conductor/runs/`, and add one dated live clarification explaining that stale prose in frozen archive artifacts is point-in-time and superseded. Record all commands, hashes and the final decision as verification evidence.

## Problem / Motivation

Phase 1 is feature-complete and both gates pass, but three hygiene gaps remain: `scripts/` is excluded from Biome (`biome.json` includes only `src`, `test`, root JSON/TS), `.conductor/runs/` holds 12 files including 4 `running` and 1 `failed` for already-merged tracks, and archived review/evidence prose contains superseded counts (e.g. "ten unaffected passes", "score file untouched") that readers could mistake for current state. Full `checkJs` typing of the scripts would surface 158 errors and is explicitly out of scope. Left unaddressed, these gaps make green builds less trustworthy and invite false bug reports.

## Goals & Success Metrics

- **Goal:** Zero accepted maintenance debt that can be closed without product or evidence changes.
- **Metric:** `pnpm lint` checks `scripts/**/*.mjs` with zero findings; stale run files for archived tracks removed; current state file retained; one dated clarification added; every archived artifact byte-identical; `test/art/scores.json` hash unchanged (`E5CCE080…828D`); `pnpm verify` exit 0.

## Scope

### In Scope

- Extend Biome includes to `scripts/**/*.mjs`; fix any reported findings without weakening rules.
- Remove `.conductor/runs/*.json` for tracks whose registry entry is `[x]` while preserving the live track's run file.
- Add a dated note to `conductor/tech-stack.md` clarifying archived prose is point-in-time and naming current truth.
- Write verification evidence with commands, before/after file inventories, hashes and the final debt-sweep decision.

### Out of Scope

- Strict `checkJs`/JSDoc typing of scripts.
- Engine/CLI/MCP/op/linter-rule/rubric/CI changes.
- Edits to `test/art/**`, `scores.json`, archived tracks, product definition, product guidelines, or spec.
- New dependencies.
- Phase 2 features.
- GitHub issues or PR merges beyond this track's own PR.

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Add `scripts/**/*.mjs` to Biome's included paths and fix all resulting lint/format findings without disabling rules. | must |
| FR-2 | Remove stale run-state files for completed/archived tracks; retain the current track's run file and all non-run evidence. | must |
| FR-3 | Add one dated live clarification in `conductor/tech-stack.md` that archived point-in-time prose is superseded, naming the current pass and scope facts. | must |
| FR-4 | Keep product behavior and frozen evidence unchanged: no engine/CLI/MCP/scoring/art changes; `scores.json` and archived files byte-identical. | must |
| FR-5 | Record exact commands, before/after file inventories, hashes, and final debt-sweep decision in verification evidence. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No new dependency and no lint-rule weakening; fixes are source formatting/code corrections only. |
| NFR-2 | `pnpm verify` exit 0; scoped coverage command still meets the 80% gate. |
| NFR-3 | Changes are limited to `biome.json`, `scripts/**/*.mjs` if fixes require, `conductor/tech-stack.md`, gitignored `.conductor/runs/**`, and this track's Conductor state/evidence. |
| NFR-4 | Archived artifacts are frozen; verify by hash before/after. |
| NFR-5 | Run-file cleanup never removes the active track's run file or any file under `conductor/`. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `pnpm exec biome check scripts/` processes all four files with zero errors. | FR-1 |
| AC-2 | `pnpm verify` exit 0 and scoped coverage ≥80% on all four metrics. | FR-1, NFR-2 |
| AC-3 | No `.conductor/runs` file remains for an archived `[x]` track; active run file still exists. | FR-2 |
| AC-4 | Dated clarification present in `tech-stack.md`; every file under `conductor/archive/` byte-identical. | FR-3, NFR-4 |
| AC-5 | `scores.json` hash unchanged and `git diff --name-only` limited to NFR-3 paths. | FR-4 |
| AC-6 | Verification evidence records commands, counts, hashes and an honest closeout decision. | FR-5 |

## Edge Cases

- Biome auto-fix changes a script's formatting but not behavior: re-run `pnpm verify` and the four script entry points (`rubric:report`, `rubric:calibrate`, `upscale.mjs`, `rubric.mjs --help`) as smoke checks.
- A run file belongs to a non-archived or active track: keep it.
- A stale archive claim is actually still accurate: record it as historical rather than "wrong".
- Biome finding cannot be fixed without a rule change: report blocked, do not suppress.

## Dependencies

- **Tracks:** all 16 prior tracks merged (`20261118-agent-legibility-verification` is the latest).
- **External:** none. Helper scripts require Node ≥24.

## Open Questions & Assumptions

- **Assumption:** archived artifacts are immutable historical records; the live dated note is the correct place to reconcile superseded prose.
- **Assumption:** the `scripts/` exclusion was accepted debt, not a deliberate behavioral boundary.

## References

- `conductor/tracks.md` — 16 archived tracks, registry state.
- `conductor/tech-stack.md` — dated notes through `2026-11-18` and the accepted debt about script tooling.
- `conductor/archive/*/review.md` — accepted tooling debt findings.
- `.conductor/runs/` — runtime state files to audit.
- `biome.json`, `package.json`, `tsconfig.json` — current lint/typecheck scope.
- `test/art/scores.json` — frozen passing gate record; hash `E5CCE080…828D`.
