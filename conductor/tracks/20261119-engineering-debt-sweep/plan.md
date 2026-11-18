# Engineering Debt Sweep — Implementation Plan

> **Branch:** `chore/20261119-engineering-debt-sweep`
> **Base:** `main` @ `2abb7cd0ee44d09ab68c04419c1207c2416668e7`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Bring `scripts/` under Biome

- **Goal:** `pnpm lint` covers all four helper scripts with zero findings, without weakening rules.
- **Depends on:** none
- **Covers:** FR-1, NFR-1, NFR-2, NFR-3, AC-1, AC-2
- **Touches:** `biome.json`, `scripts/**/*.mjs`, `verification/scripts-coverage.md`, `verification/phase-1.md`
- **Verification:** `pnpm exec biome check scripts/`; `pnpm lint`; `pnpm verify`
- **Status:** verified

- [x] **P1.T1: Record the tooling baseline** — covers: FR-1
  - [x] **P1.T1.1:** Inventory the four `scripts/*.mjs` helpers and capture the current Biome include list.
  - [x] **P1.T1.2:** Record the excluded-path behaviour and the out-of-scope `checkJs` error count (158) as baseline evidence.
- [x] **P1.T2: Extend Biome coverage and fix findings** — covers: FR-1, NFR-1
  - [x] **P1.T2.1:** Add `scripts/**/*.mjs` to `biome.json` includes without changing linter rules or dependencies.
  - [x] **P1.T2.2:** Fix every resulting lint/format finding in the scripts; no suppressions, no escaped findings.
- [x] **P1.T3: Verify tooling and script smoke checks** — covers: NFR-2, AC-1, AC-2
  - [x] **P1.T3.1:** Confirm `pnpm exec biome check scripts/` processes four files with zero errors and `pnpm verify` exits 0.
  - [x] **P1.T3.2:** Smoke-check `pnpm rubric:report`, `pnpm rubric:calibrate`, `scripts/upscale.mjs` and `scripts/rubric.mjs --help` for unchanged exit status.
- [x] **P1.T4: Record phase evidence** — covers: FR-5
  - [x] **P1.T4.1:** Write `verification/scripts-coverage.md` with commands, finding counts, before/after diffs and smoke outputs.
  - [x] **P1.T4.2:** Write `verification/phase-1.md` with Result, commands and AC table.

**Result:** verified — all four P1 tasks complete; seven `scripts/**/*.mjs` files covered by Biome with zero findings; scoped lint, `pnpm verify` and scoped coverage green; smoke checks unchanged; `scores.json` unchanged. AC-1 and AC-2 satisfied. Squash applied (all three commits in range reported by the subagent).
**Checkpoint:** a49c3276b634e4dc190df8f6cd29d47bc1dcc37c
**Evidence:** conductor/tracks/20261119-engineering-debt-sweep/verification/phase-1.md

## Phase 2: Runtime-state and live-doc hygiene

- **Goal:** Stale run-state files removed; archived prose reconciled by a live dated note; archives untouched.
- **Depends on:** Phase 1
- **Covers:** FR-2, FR-3, FR-4, NFR-3, NFR-4, NFR-5, AC-3, AC-4
- **Touches:** `.conductor/runs/**` (gitignored), `conductor/tech-stack.md` (primary-owned), `verification/state-hygiene.md`, `verification/phase-2.md`
- **Verification:** run-file inventory vs registry; archive hash comparison; `pnpm verify`
- **Status:** verified

- [x] **P2.T1: Inventory run-state files** — covers: FR-2
  - [x] **P2.T1.1:** List every `.conductor/runs/*.json` file with phase and status.
  - [x] **P2.T1.2:** Classify 4 `running` and 1 `failed` files as stale against `[x]` registry entries; identify the live track's file to retain.
- [x] **P2.T2: Remove only stale run state** — covers: FR-2, NFR-5
  - [x] **P2.T2.1:** Delete stale files; keep the current track's run file and all other evidence.
  - [x] **P2.T2.2:** Record before/after inventories and assert no file under `conductor/` was removed.
- [x] **P2.T3: Add the live dated clarification** — covers: FR-3
  - [x] **P2.T3.1:** Primary appends one dated note to `conductor/tech-stack.md` marking archive prose as point-in-time, naming the current mean 3.82 pass, twelve untouched passes, disclosed humanoid/chest strict-gate residuals, and the humanoid byte-identity waiver.
  - [x] **P2.T3.2:** Confirm no archived file and no product/guideline/spec file changed.
- [x] **P2.T4: Prove archive integrity and record phase evidence** — covers: FR-4, FR-5, NFR-4
  - [x] **P2.T4.1:** Hash every file under `conductor/archive/` before and after the phase; assert byte-identical.
  - [x] **P2.T4.2:** Write `verification/state-hygiene.md` and `verification/phase-2.md`.

<!--
The primary appends after acceptance:
**Result:** verified — 12 stale run-state files removed with zero tracked deletions; one dated live clarification added to `conductor/tech-stack.md`; archives byte-identical (215/215 checked, 0 mismatches); `scores.json` unchanged; `pnpm verify` exit 0. AC-3 and AC-4 satisfied. Squash skipped (primary-owned docs commit in range).
**Checkpoint:** af2c362c4bf40554276a5c726bd0404db04cec50
**Evidence:** conductor/tracks/20261119-engineering-debt-sweep/verification/phase-2.md
-->

## Phase 3: Closeout decision and integrated record

- **Goal:** One honest closeout record proves every acceptance criterion and records the debt decision.
- **Depends on:** Phase 2
- **Covers:** FR-5, NFR-2, NFR-3, NFR-4, AC-2, AC-4, AC-5, AC-6
- **Touches:** `verification/debt-sweep.md`, `verification/phase-3.md`
- **Verification:** final `pnpm verify`; scoped coverage; `node scripts/rubric-report.mjs`; `scores.json` hash; `git diff --name-only` scope check
- **Status:** verified

- [x] **P3.T1: Re-run final checks at the final HEAD** — covers: NFR-2, AC-2, AC-5
  - [x] **P3.T1.1:** Run `pnpm verify`, scoped coverage (`pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens`) and `node scripts/rubric-report.mjs`.
  - [x] **P3.T1.2:** Confirm `scores.json` SHA-256 `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` and that changed paths stay within NFR-3.
- [x] **P3.T2: Record the closeout decision** — covers: FR-5, AC-6
  - [x] **P3.T2.1:** Write `verification/debt-sweep.md` with `DEBT SWEEP CLOSED`, residual accepted debt explicitly listed, exact commands and counts.
  - [x] **P3.T2.2:** Write `verification/phase-3.md` with Result, commands and the final evidence inventory.

<!--
The primary appends after acceptance:
**Result:** verified — closeout decision DEBT SWEEP CLOSED recorded; all final checks green; archives byte-identical (215/215); `scores.json` unchanged; zero open PRs; 17 in-scope changed paths. AC-2, AC-4, AC-5 and AC-6 satisfied. Squash applied.
**Checkpoint:** ec1968ea1acdb5a3bb952d479955d992495e757f
**Evidence:** conductor/tracks/20261119-engineering-debt-sweep/verification/phase-3.md
-->

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 3
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
