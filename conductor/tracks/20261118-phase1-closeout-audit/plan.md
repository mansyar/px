# Phase 1 Closeout Audit — Implementation Plan

> **Branch:** `chore/20261118-phase1-closeout-audit`
> **Base:** `main` @ `0f866801e9271512d14bed154e60ee1c06c93c4b`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Audit CI, verification layers, gate, and ledger

- **Goal:** One evidence record proving every configured layer and CI step is green on `main`.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-5, NFR-3, NFR-5, AC-1, AC-2, AC-5, AC-7
- **Touches:** `conductor/tracks/20261118-phase1-closeout-audit/verification/closeout-audit.md`, `verification/phase-1.md`, `.conductor/evidence/**`
- **Verification:** `pnpm verify`; `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens`; `pnpm vitest run --project goldens`; `node scripts/rubric-report.mjs` (primary-run)
- **Status:** verified

- [x] **P1.T1: Map CI and Workflow Config** — covers: FR-1
  - [x] **P1.T1.1:** Record CI OS matrix, triggers, and exact steps from `.github/workflows/ci.yml`
  - [x] **P1.T1.2:** Map each Workflow Config verification layer to its configured command and confirm CI invokes the equivalents
  - [x] **P1.T1.3:** Confirm Node/pnpm pins match `package.json` `engines` and that coverage uses the scoped command excluding benchmarks
- [x] **P1.T2: Run and record final checks** — covers: FR-2
  - [x] **P1.T2.1:** Run `pnpm verify`, record exit code and test/build counts
  - [x] **P1.T2.2:** Run scoped coverage, record all four metrics against the 80% gate
  - [x] **P1.T2.3:** Run determinism layer (`pnpm vitest run --project goldens`) and read-only `node scripts/rubric-report.mjs`; record metrics
- [x] **P1.T3: Record gate and ledger snapshot** — covers: FR-5
  - [x] **P1.T3.1:** Record `scores.json` verdict (pass, mean 3.82, zero failures) and criterion means
  - [x] **P1.T3.2:** Record registry `[x]` count, archive count, zero active tracks, zero open PRs, and run-file closure
- [x] **P1.T4: Write audit evidence** — covers: NFR-5
  - [x] **P1.T4.1:** Write `verification/closeout-audit.md` with the command/result tables and `verification/phase-1.md`

**Result:** verified — all configured checks and primary-only inputs green; CI/layer mapping, gate snapshot and ledger snapshot recorded; AC-1/AC-2/AC-5/AC-7 satisfied.
**Checkpoint:** ee74e9e0ca0089088cadcbec03805a5211c4e38a
**Evidence:** conductor/tracks/20261118-phase1-closeout-audit/verification/phase-1.md

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261118-phase1-closeout-audit/verification/phase-1.md
-->

## Phase 2: Reconcile live documentation

- **Goal:** Live `product.md` and `tech-stack.md` state current truth without rewriting historical point-in-time records.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-4, FR-6, NFR-1, NFR-2, AC-3, AC-4, AC-6
- **Touches:** `conductor/product.md`, `conductor/tech-stack.md`, `verification/doc-reconciliation.md`, `verification/phase-2.md` (doc edits are primary-owned: subagent reports denial, primary executes, subagent finalizes)
- **Verification:** `pnpm verify`; targeted content assertions via read/grep
- **Status:** verified

- [x] **P2.T1: Clarify superseded tech-stack statements** — covers: FR-3
  - [x] **P2.T1.1:** Mark the 2026-11-17 "4.0 gate remains hard" note as superseded by the publishable-tier decision without changing its text
  - [x] **P2.T1.2:** Mark the 2026-11-18 "3.73 is the current one" note as superseded by the 3.82 pass without changing its numbers
- [x] **P2.T2: Verify and correct the call-split claim** — covers: FR-3
  - [x] **P2.T2.1:** Check calibration evidence for an authoring/inspection call split; correct or cite honestly at `product.md:96`
- [x] **P2.T3: Declare Phase 1 feature-complete** — covers: FR-4
  - [x] **P2.T3.1:** Add a dated `product.md` note citing the passing publishable gate and the Phase 2 non-goal boundary
- [x] **P2.T4: Prove the code delta is empty** — covers: FR-6
  - [x] **P2.T4.1:** Confirm no `src/**`, `test/**`, `scripts/**`, manifest, lockfile, golden, `scores.json`, or recipe file changed; record in `verification/doc-reconciliation.md`

**Result:** verified — PP-1..PP-4 primary doc edits applied without rewriting history; unsupported call-split claim corrected; Phase 1 declaration added; code delta empty; `pnpm verify` exit 0. Squash skipped (primary commit in range).
**Checkpoint:** 7b43fc36629467e38b6fd0b79da57672ac571f78
**Evidence:** conductor/tracks/20261118-phase1-closeout-audit/verification/phase-2.md

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261118-phase1-closeout-audit/verification/phase-2.md
-->

## Phase 3: Record closeout decision

- **Goal:** A final closeout record declares Phase 1 complete with residual debt and no open threads.
- **Depends on:** Phase 2
- **Covers:** FR-5, NFR-4, AC-5, AC-7
- **Touches:** `verification/closeout-decision.md`, `verification/phase-3.md`
- **Verification:** `pnpm verify`; scoped coverage; determinism layer; `node scripts/rubric-report.mjs` (primary-run)
- **Status:** verified

- [x] **P3.T1: Record the closeout decision** — covers: FR-5
  - [x] **P3.T1.1:** Declare Phase 1 feature-complete with passing-gate evidence and remaining accepted debt
  - [x] **P3.T1.2:** Restate the Phase 2 boundary and record any follow-ups without filing issues
- [x] **P3.T2: Final verification snapshot** — covers: AC-7
  - [x] **P3.T2.1:** Re-run all configured checks at final HEAD and record exit codes and metrics

**Result:** verified — ACCEPT CLOSEOUT recorded; Phase 1 feature-complete; all five configured checks re-run green at final HEAD; code delta empty; no open threads.
**Checkpoint:** d7c56727166d830c6a9907f0154eaa2340acc318
**Evidence:** conductor/tracks/20261118-phase1-closeout-audit/verification/phase-3.md

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261118-phase1-closeout-audit/verification/phase-3.md
-->

## Phase R1: Review Fixes

- **Goal:** Resolve round-1 review findings F1 (Medium: evidence cites pre-squash commit SHAs with false `git log` assertions) and F2 (Low: unresolved "record its SHA later" placeholders), restoring audit-record provenance.
- **Depends on:** Phase 3
- **Covers:** F1, F2
- **Touches:** verification/phase-1.md, verification/closeout-audit.md, verification/phase-3.md, verification/doc-reconciliation.md, verification/phase-2.md, verification/phase-R1.md
- **Verification:** `pnpm verify` exit 0 plus read-only `git log --oneline <base>..HEAD` cross-check of every cited SHA; no score/rationale/verdict/checkpoint change
- **Status:** pending

- [ ] **R1.T1: Resolve F1 (commit-SHA provenance)** - covers: F1
  - [ ] **R1.T1.1:** Replace pre-squash SHAs `473a1f6`/`d0d8580` (phase-1.md, closeout-audit.md) with real branch-history checkpoint `ee74e9e` and final HEAD `157bf6e`; remove false "git log lists exactly..." assertions
  - [ ] **R1.T1.2:** Replace pre-squash SHA `a329aa0` (phase-3.md) with checkpoint `d7c5672` and final HEAD `157bf6e`; correct the associated log/re-run statements
- [ ] **R1.T2: Resolve F2 (unresolved placeholders)** - covers: F2
  - [ ] **R1.T2.1:** Replace the "record its SHA as the phase checkpoint at acceptance" parenthetical in doc-reconciliation.md:8, phase-2.md:8, phase-3.md:8 with the real checkpoint (`7b43fc3` / `d7c5672`) or delete it
  - [ ] **R1.T2.2:** Run `pnpm verify`, write verification/phase-R1.md with real results and F1/F2 RESOLVED, commit `fix(conductor): Resolve review findings F1 and F2`, report JSON
