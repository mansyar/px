# Agent Legibility Verification - Implementation Plan

> **Branch:** `chore/20261118-agent-legibility-verification`
> **Base:** `main` @ `12037ca4ce76844b3d64f8705992099b297fdf65`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Build the docs-only brief and run the fresh-agent test

- **Goal:** A fresh agent, given only the documented tool contract, authors all four benchmark assets with ordered call transcripts recorded.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-7, NFR-1, NFR-6, AC-1, AC-2
- **Touches:** `conductor/tracks/20261118-agent-legibility-verification/verification/docs-brief.md`, `conductor/tracks/20261118-agent-legibility-verification/verification/agent-runs.md`, `conductor/tracks/20261118-agent-legibility-verification/verification/phase-1.md`, `.conductor/evidence/agent-legibility/**`
- **Verification:** `pnpm verify`; brief inventory contains only allowed docs; four transcripts exist with call counts ≤12 or honest failures (MCP-first, CLI parity).
- **Status:** verified

- [x] **P1.T1: Assemble the docs-only brief** - covers: FR-1, NFR-1
  - [x] **P1.T1.1: Inventory allowed sources** — CLI `--help` JSON, MCP tool descriptions, `docs/art-profiles.md`, `docs/lint-thresholds.md`, rubric silhouette anchors
  - [x] **P1.T1.2: Record explicit exclusions** — source, tests, benchmark transcripts, v2 recipes, scores, archive; write `verification/docs-brief.md`
- [x] **P1.T2: Run the fresh agent on four assets** - covers: FR-2, NFR-1, AC-2
  - [x] **P1.T2.1: Launch a fresh subagent with only the approved brief** and author potion, sword, humanoid and chest via px tools, MCP-first
  - [x] **P1.T2.2: Record ordered transcripts** with tool surface, arguments and call count per asset; store artifacts under `.conductor/evidence/agent-legibility/`
- [x] **P1.T3: Record a bounded CLI parity check** - covers: FR-7, AC-2
  - [x] **P1.T3.1: Reproduce one representative asset via CLI** using only the same brief and record the parity result beside the MCP results
- [x] **P1.T4: Write Phase 1 evidence** - covers: FR-1, FR-2, NFR-6
  - [x] **P1.T4.1: Write `verification/agent-runs.md`** with the per-asset call/lint/silhouette-facing table and brief inventory cross-reference
  - [x] **P1.T4.2: Write `verification/phase-1.md`** with commands, deviations and Result

<!--
The primary appends after acceptance:
-->
**Result:** verified — docs-only brief assembled verbatim; four MCP-first fresh-agent runs plus CLI parity completed within budget with honest transcripts; `pnpm verify` exit 0; AC-1 and AC-2 satisfied. Silhouette/strict-render pass/fail deferred to Phase 2. Squash applied (three reported commits only).
**Checkpoint:** e0893de22c9e4a85833d34df5a4a616ff7158e85
**Evidence:** conductor/tracks/20261118-agent-legibility-verification/verification/phase-1.md

## Phase 2: Measure fresh artifacts and remediate documentation gaps

- **Goal:** Each fresh artifact is strictly rendered and silhouette-diagnosed; documentation-only gaps get one bounded fix and one re-test.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-4, FR-5, NFR-2, NFR-3, NFR-4, NFR-5, NFR-7, AC-3, AC-4, AC-5, AC-7, AC-8
- **Touches:** `conductor/tracks/20261118-agent-legibility-verification/verification/measurement.md`, `conductor/tracks/20261118-agent-legibility-verification/verification/phase-2.md`, `docs/agent-tool-guide.md` (conditional, primary-owned), `.conductor/evidence/agent-legibility/**`
- **Verification:** `pnpm verify`; strict render per fresh recipe; `node scripts/rubric.mjs --dry-run --model gemini-3.5-flash-lite --asset <name> --pass A --artifact <fresh-png>` per asset; `scores.json` hash unchanged; no engine/code delta.
- **Status:** verified

- [x] **P2.T1: Strict-render each fresh artifact** - covers: FR-3, AC-3
  - [x] **P2.T1.1: Render all four fresh recipes with `--strict`** and record exit codes and lint findings
  - [x] **P2.T1.2: Confirm no fixture, sidecar, golden or scores file was modified**
- [x] **P2.T2: Run primary silhouette diagnostics** - covers: FR-4, NFR-2, NFR-5, AC-4, AC-8
  - [x] **P2.T2.1: Score each fresh render with flash-lite `--dry-run`** and record silhouette plus rationale in evidence only
  - [x] **P2.T2.2: Check `scores.json` hash before and after** and confirm it is unchanged
- [x] **P2.T3: Apply bounded documentation remediation when justified** - covers: FR-5, NFR-3, NFR-7, AC-5
  - [x] **P2.T3.1: Add one concise `docs/agent-tool-guide.md` from existing help only if failures are documentation-caused**
  - [x] **P2.T3.2: Re-test once after any doc fix, or record why the step was skipped**
- [x] **P2.T4: Write Phase 2 evidence** - covers: FR-3, FR-4, FR-5, NFR-6
  - [x] **P2.T4.1: Write `verification/measurement.md`** with exact commands, hashes, lint and silhouette results
  - [x] **P2.T4.2: Write `verification/phase-2.md`** with commands, deviations and Result

<!--
The primary appends after acceptance:
-->
**Result:** verified — four strict renders recorded honestly (potion/sword exit 0; humanoid/chest exit 3 E_LINT_GATE with craft findings disclosed, zero OOB/ORPHAN on all four); silhouette 5/4/5/5 via flash-lite dry-run; doc fix skipped with reason; scores.json hash unchanged; `pnpm verify` exit 0. Squash applied (single reported commit).
**Checkpoint:** e507ac8546be6db2cd11dc359b49b1af1ddfcc3f
**Evidence:** conductor/tracks/20261118-agent-legibility-verification/verification/phase-2.md

## Phase 3: Record the final decision and bounded stop

- **Goal:** An honest pass/fail decision is recorded with residual gaps and no forced work.
- **Depends on:** Phase 2
- **Covers:** FR-6, NFR-6, AC-6, AC-8
- **Touches:** `conductor/tracks/20261118-agent-legibility-verification/verification/agent-legibility-decision.md`, `conductor/tracks/20261118-agent-legibility-verification/verification/phase-3.md`
- **Verification:** `pnpm verify`; `node scripts/rubric-report.mjs`; `scores.json` hash unchanged; no issues filed and no merge decision taken.
- **Status:** verified

- [x] **P3.T1: Record the decision** - covers: FR-6, AC-6
  - [x] **P3.T1.1: Decide pass only if all four assets meet call, lint and silhouette bars**; otherwise record a fail with per-asset gaps and follow-ups
  - [x] **P3.T1.2: Record the bounded-stop statement** — one brief, one fresh run, one re-test maximum; no re-roll or forced pass
- [x] **P3.T2: Capture the final verification snapshot** - covers: NFR-6, AC-8
  - [x] **P3.T2.1: Re-run `pnpm verify` and `node scripts/rubric-report.mjs`** and record exit codes
  - [x] **P3.T2.2: Re-check the `scores.json` hash** and write `verification/agent-legibility-decision.md` and `verification/phase-3.md`

<!--
The primary appends after acceptance:
-->
**Result:** verified — honest decision recorded as LEGIBILITY METRIC VERIFIED (PASS) with two disclosed strict-gate craft failures; all four assets within 12 calls, zero OOB/ORPHAN, silhouette 5/4/5/5; all final checks green; scores.json hash unchanged; no code delta. Squash applied (single reported commit).
**Checkpoint:** d67c950cbfc49b40074ae9d228d7f4299d7fd2e8
**Evidence:** conductor/tracks/20261118-agent-legibility-verification/verification/phase-3.md

## Phase R1: Review Fixes

- **Goal:** Resolve the single Low finding F1 (stale final-HEAD reference in integrated evidence) under strict mode, without changing any check result, score, or requirement.
- **Depends on:** Phase 3
- **Covers:** F1
- **Touches:** `conductor/tracks/20261118-agent-legibility-verification/verification/integrated.md`, `conductor/tracks/20261118-agent-legibility-verification/verification/phase-R1.md`
- **Verification:** `pnpm verify`; content assertion that both stale `8af7082` "final HEAD" statements name the actual final HEAD `883518d`.
- **Status:** in_progress

- [ ] **R1.T1: Correct the integrated report's final-HEAD reference** - covers: F1
  - [ ] Replace line 6 and line 66 in `verification/integrated.md` so they name `883518d` as the final HEAD (checks re-run at `8af7082` and again at final HEAD `883518d` after the two docs-only commits).
  - [ ] Write `verification/phase-R1.md` (Result verified, commands, F1 before/after, `pnpm verify` exit 0) and commit `fix(conductor): Resolve review finding F1`.

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261118-agent-legibility-verification/verification/phase-R1.md
-->
