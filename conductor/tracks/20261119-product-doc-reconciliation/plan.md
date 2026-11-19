# Product Documentation Reconciliation — Implementation Plan

> **Branch:** `chore/20261119-product-doc-reconciliation`
> **Base:** `main` @ `71e65a37b7587146c711a64b8664fe5c2697fcc3`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Product scope and terminology correction

- **Goal:** the product definition stops deferring shipped animation features, and the guidelines define the three new canonical terms consistently with `docs/animation.md`.
- **Depends on:** none
- **Covers:** FR-1, FR-2, AC-1, AC-2, NFR-4
- **Touches:** `conductor/product.md`, `conductor/product-guidelines.md`, `conductor/tracks/20261119-product-doc-reconciliation/verification/phase-1.md`
- **Verification:** `pnpm verify`
- **Status:** verified

- [x] **P1.T1: Correct product scope declaration** — covers: FR-1
  - [x] **P1.T1.1:** Remove animation, onion-skinning and sprite-sheet packing from the deferred non-goals while preserving genuinely deferred items
  - [x] **P1.T1.2:** Append a dated note (2026-11-19) that explicitly supersedes the 2026-11-18 deferral statement and names the shipped tracks and PRs #20/#21
  - [x] **P1.T1.3:** Confirm no other dated note or historical annotation was rewritten and no contradictory Phase 2 phrasing remains
- [x] **P1.T2: Add canonical animation terminology** — covers: FR-2
  - [x] **P1.T2.1:** Add `frame`, `timeline` and `onion view` rows to the terminology table with definitions drawn from `docs/animation.md`
  - [x] **P1.T2.2:** Confirm the new rows use the canonical terms consistently and introduce no conflicting synonyms

**Result:** verified
**Checkpoint:** 1b89bc3
**Evidence:** conductor/tracks/20261119-product-doc-reconciliation/verification/phase-1.md

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261119-product-doc-reconciliation/verification/phase-1.md
-->

## Phase 2: Runtime closeout and protected-scope evidence

- **Goal:** the stale playback run record is closed and committed evidence proves no code, golden, score, CI or dependency byte changed.
- **Depends on:** Phase 1
- **Covers:** FR-3, FR-4, AC-3, AC-4, AC-5, AC-6, NFR-1, NFR-2, NFR-3
- **Touches:** `.conductor/runs/20261119-animation-playback.json` (gitignored runtime state), `conductor/tracks/20261119-product-doc-reconciliation/verification/phase-2.md`
- **Verification:** `pnpm verify`; supporting checks: `git diff --name-only <base_sha>..HEAD` restricted to protected paths, `Get-FileHash -Algorithm SHA256 test/art/scores.json`
- **Status:** in_progress

- [ ] **P2.T1: Close stale runtime run state** — covers: FR-3
  - [ ] **P2.T1.1:** Set the playback run record to `status: "complete"` without staging it or editing any other run file
- [ ] **P2.T2: Record protected-scope evidence** — covers: FR-4
  - [ ] **P2.T2.1:** Run and record `pnpm verify`, the protected-path diff against the base SHA, and the scores digest; report exact commands and exits
  - [ ] **P2.T2.2:** Write `verification/phase-2.md` with command results, protected-baseline table, requirement coverage and honest limitations

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261119-product-doc-reconciliation/verification/phase-2.md
-->

<!--
Review fixes are appended by `conductor-review` as:

## Phase R1: Review Fixes

- **Goal:** Resolve review findings ...
- **Depends on:** Phase 2
- **Covers:** review findings
- **Touches:** ...
- **Verification:** ...
- **Status:** pending

- [ ] **R1.T1: Resolve <finding ID>** — covers: <finding ID>
-->
