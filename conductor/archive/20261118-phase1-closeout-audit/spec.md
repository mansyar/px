# Phase 1 Closeout Audit — Specification

> Requirements are stable. Once an `FR`, `NFR`, or `AC` ID is approved, do not
> renumber it. If a requirement is removed, mark it `Withdrawn` instead of
> deleting it.

## Overview

This chore closes out Phase 1 with one auditable record: verify that CI, the configured verification layers, determinism, and the publishable quality gate are all green on `main`; reconcile a small set of stale statements in live project docs; and formally declare Phase 1 feature-complete with the Phase 2 boundary intact. No engine, art, scoring, or dependency behavior changes.

## Problem / Motivation

All 14 Conductor tracks are archived and the publishable gate now passes honestly (mean 3.82, zero below-floor criteria), but there is no single closeout record proving readiness. Live docs contain point-in-time statements that are now stale: `tech-stack.md:115` says "the 4.0 gate remains hard" (superseded by the 2026-11-17 owner decision binding acceptance to publishable), and `tech-stack.md:121` says the 3.73 fail "is the current one" (superseded by 3.82). `product.md:96` claims calibration records an authoring/inspection call split as a metric, but the calibration report records attempted/rejected calibration calls, not that split. A fresh reader cannot distinguish current truth from historical notes, and Phase 1 has no formal completion declaration.

## Goals & Success Metrics

- **Goal:** Phase 1 is provably complete, with one audit artifact and honest live docs.
- **Metric:** `verification/closeout-audit.md` records every configured check with command, exit code, and metrics; all green; zero unresolved live-doc contradictions; a dated Phase 1 feature-complete note exists in `product.md`; registry shows 14/14 `[x]`, zero active tracks, zero open PRs.

## Scope

### In Scope

- Read-only audit of `.github/workflows/ci.yml`, Workflow Config, package scripts, verification layers, `scores.json`, registry, archives, and PR state.
- Run final checks: `pnpm verify`, scoped coverage, determinism layer, read-only `rubric-report`.
- Reconcile live-doc contradictions with dated, non-rewriting clarifications; correct the call-split statement honestly.
- Add a dated `product.md` note declaring Phase 1 feature-complete and restating the Phase 2 boundary.
- Record the closeout decision and evidence.

### Out of Scope

- Engine/CLI/MCP/op/linter/rubric/CI-config changes.
- Any score, rationale, verdict, recipe, sidecar, or golden change; no scorer/network calls; no cross-instrument comparison.
- Editing archived track artifacts (frozen by convention).
- Phase 2 work (animation, onion-skinning, sprite-sheet packing).
- Filing GitHub issues (issue auto-create is disabled; debt is recorded in Conductor state).

## Functional Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1 | Produce an audit record mapping each configured verification layer and CI step to its exact command and observed result, including CI OS matrix, Node/pnpm pin vs `engines`, and coverage scope. | must |
| FR-2 | Run and record final checks: `pnpm verify`, scoped coverage, determinism (`pnpm vitest run --project goldens`), and read-only `node scripts/rubric-report.mjs`; all exit 0 with metrics captured. | must |
| FR-3 | Reconcile live-doc contradictions: clarify the superseded 4.0 and 3.73 statements in `tech-stack.md`, and verify/correct the authoring/inspection call-split claim in `product.md`, without rewriting historical numbers. | must |
| FR-4 | Add a dated `product.md` note formally declaring Phase 1 feature-complete, citing the passing publishable gate and the explicit Phase 2 non-goal boundary. | must |
| FR-5 | Record the final ledger snapshot: 14/14 registry lines `[x]`, 14 archive dirs, zero active tracks, zero open PRs, and closed run files for the current track. | must |
| FR-6 | Keep the code delta empty: no changes to `src/**`, `test/**`, `scripts/**`, manifests, lockfile, goldens, `scores.json`, or any v2/v1 recipe. | must |

## Non-Functional Requirements

| ID | Requirement |
| --- | --- |
| NFR-1 | No engine, CLI, MCP, op, linter, rubric, CI-config, or dependency change; no instrument call and no credential use. |
| NFR-2 | Dated notes are appended or clarified, never rewritten; point-in-time numbers in historical notes stay intact and are explicitly marked superseded. |
| NFR-3 | Verification commands are exactly those in Workflow Config; the coverage gate uses the scoped command excluding benchmarks; no invented checks. |
| NFR-4 | Strict review applies: every finding is fixed before PR; no deferred findings without a recorded user override. |
| NFR-5 | Evidence records exact commands and results under `verification/`; binary artifacts (if any) stay in gitignored `.conductor/evidence/`. |

## Acceptance Criteria

| ID | Criterion | Verifies |
| --- | --- | --- |
| AC-1 | `verification/closeout-audit.md` contains a table with every Workflow Config layer and CI step, exact command, and pass result; Node/pnpm pins match `engines`. | FR-1 |
| AC-2 | Final-check table records exit 0 for `pnpm verify` (119 files / 1028 tests), scoped coverage (all four metrics ≥80%), determinism layer, and rubric report (mean 3.82, pass). | FR-2 |
| AC-3 | `tech-stack.md` superseded statements are clarified; the `product.md` call-split claim is either evidenced or honestly corrected; no historical number changed. | FR-3 |
| AC-4 | `product.md` contains a dated Phase 1 feature-complete note citing the passing gate and Phase 2 boundary. | FR-4 |
| AC-5 | Closeout record states 14/14 `[x]`, 14 archives, zero active tracks, zero open PRs, with command evidence. | FR-5 |
| AC-6 | `git diff` for the track touches only Conductor state, `verification/**`, `conductor/product.md`, and `conductor/tech-stack.md`; no code/score/recipe/dependency files. | FR-6 |
| AC-7 | `pnpm verify`, scoped coverage, and determinism layer all pass at final HEAD; strict review verdict PASS or recorded overrides. | NFR-3, NFR-4 |

## Edge Cases

- If a configured check fails, the track reports `blocked`/`failed` and Phase 1 is **not** declared complete; no baseline is regenerated to force green.
- If CI config has drifted from Workflow Config and the fix is doc-only, reconcile it in-scope; if it requires a CI or code change, record it as follow-up debt, not a silent fix.
- If the call-split claim cannot be evidenced, correct `product.md` to state what calibration actually measures rather than inventing a number.
- Archived docs are frozen; only live `product.md` and `tech-stack.md` are reconciled.
- If a PR is found open during the audit, record it and do not merge or close it (merge is user-directed).

## Dependencies

- **Tracks:** none pending — all 14 archived tracks are complete, in particular `20261117-craft-application`, `20261118-gate-close-flash-lite`, `20261118-gate-publishable-pass`.
- **External:** none; no credentials or network calls required.

## Open Questions & Assumptions

- **Assumption:** Dated notes in `tech-stack.md` are historical records; clarification is by appended supersession language, not rewriting.
- **Assumption:** The Phase 1 completion declaration belongs in `product.md` as a dated note, not a new lifecycle status field.
- **Assumption:** `product.md` and `tech-stack.md` are primary-owned; a phase subagent may report those edits as denied and the primary executes them exactly (precedented by prior review-fix tracks).

## References

- `conductor/product.md`, `conductor/workflow.md`, `conductor/tech-stack.md`, `docs/rubric.md`, `.github/workflows/ci.yml`, `test/art/scores.json`.
- Archived reviews for accepted debt: `20261113-rubric-calibration`, `20261113-rubric-ceiling-probe`, `20261117-gate-instrument-reconciliation`.
- `conductor/archive/20261118-gate-publishable-pass/` (passing gate evidence and product doc precedent).
