# Phase 2 Evidence — Runtime-state and live-doc hygiene

- Track: 20261119-engineering-debt-sweep — Engineering Debt Sweep
- Phase: 2 — Runtime-state and live-doc hygiene
- Date: 2026-11-19
- Branch: `chore/20261119-engineering-debt-sweep`
- Phase base / HEAD (at subagent handoff): `6aec62ccef97785a786bf343d01907ae1ae91efd`
- Baseline file (primary-supplied): `C:\Users\Ansyar\AppData\Local\Temp\opencode\debtsweep-baseline.txt`, `CAPTURED=2026-11-18T21:42:27Z`
- Frozen score hash (baseline): `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`

## Result

**partial (subagent scope verified)** — the run-file inventory (P2.T1), the scoped git/diff
checks and the phase verification command `pnpm verify` (exit 0) are complete and recorded
below. The three substantive mutations of this phase are **primary-owned** by explicit
brief instruction and remain `PENDING PRIMARY`: deletion of the 12 stale run-state JSON
files (P2.T2), the dated `conductor/tech-stack.md` clarification (P2.T3), and the archive
hash comparison against the baseline (P2.T4.1). Consequently AC-3 and AC-4 cannot be
closed by this agent and are marked `PENDING PRIMARY`. The primary fills those cells and
re-invokes once to finalize.

## Commands

| Layer | Command / action | Exit | Summary |
|-------|------------------|------|---------|
| Inventory | native read of `.conductor/runs/` directory + the 13 `*.json` files | — | 13 run-state JSON files; 12 stale (4 `running`, 1 `failed`, 7 `complete`), 1 active (`running`). Full table in §1. |
| Registry | native read of `conductor/tracks.md` | — | All 12 stale files map to `[x]` (archived) tracks; the active file maps to the single `[~]` track. |
| Git | `git status --short` | 0 | clean at handoff — no tracked file modified, staged or deleted. |
| Git | `git rev-parse HEAD` | 0 | `6aec62ccef97785a786bf343d01907ae1ae91efd` (equals phase base). |
| Git | `git log --oneline --max-count=8` | 0 | HEAD is the phase-2 `in_progress` plan commit; no drift. |
| Git | `git diff --name-only 6aec62ccef97785a786bf343d01907ae1ae91efd..HEAD` | 0 | empty — no tracked file changed between phase base and handoff. |
| Verification (phase command) | `pnpm verify` | 0 | `tsc --noEmit` OK; `biome check .` checked 223 files, 0 errors, 1 pre-existing warning (`test/recipe/version-1-2.test.ts:50:7 lint/style/noNonNullAssertion`, out of scope); 119 test files / 1028 tests passed; `tsc -p tsconfig.build.json` OK. |
| Hash (scoped) | `Get-FileHash -Algorithm SHA256 test/art/scores.json` | 0 | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`, unchanged (verified by primary in Phase 1; re-check remains a Phase 3 closeout task). |

Primary-only commands — **PENDING PRIMARY**:

| Layer | Command / action | Exit | Summary |
|-------|------------------|------|---------|
| Deletion | remove the 12 stale `.conductor/runs/*.json` files listed in §2 (gitignored) | PENDING PRIMARY | expected: 12 files removed; `20261119-engineering-debt-sweep.json` and all `conductor/**` files untouched |
| Doc edit | append one dated note to `conductor/tech-stack.md` | PENDING PRIMARY | expected: one note naming current truth per §3 |
| Hash | archive hash comparison of `conductor/archive/**` against the 215 hashes in the baseline file's `=== ARCHIVE HASHES ===` section | PENDING PRIMARY | expected: all files byte-identical, 0 mismatches |
| Scope | final `git status --short` / `git diff --name-only` after the above | PENDING PRIMARY | expected: changed paths limited to NFR-3 (this track's evidence + `conductor/tech-stack.md`); no `conductor/archive/**` change |

## 1. Run-file inventory (P2.T1) — COMPLETE

Before inventory: **13** `*.json` files under `.conductor/runs/`. Phase/status were read from
each file and the registry state from `conductor/tracks.md`; every value matches the
primary-supplied baseline exactly.

| # | Run-state file | phase | status | registry | Classification |
|---|----------------|-------|--------|----------|----------------|
| 1 | `20261112-phase-1-static-sprite-engine.json` | 5 | `running` | `[x]` | stale — remove |
| 2 | `20261113-authoring-primitives.json` | 6 | `failed` | `[x]` | stale — remove |
| 3 | `20261113-lighting-recovery.json` | 4 | `complete` | `[x]` | stale — remove |
| 4 | `20261113-static-art-quality.json` | 2 | `running` | `[x]` | stale — remove |
| 5 | `20261113-surface-fidelity.json` | 1 | `complete` | `[x]` | stale — remove |
| 6 | `20261117-authoritative-design-intent.json` | 6 | `running` | `[x]` | stale — remove |
| 7 | `20261117-craft-application.json` | R1 | `complete` | `[x]` | stale — remove |
| 8 | `20261117-gate-instrument-reconciliation.json` | R1 | `running` | `[x]` | stale — remove |
| 9 | `20261118-agent-legibility-verification.json` | R1 | `complete` | `[x]` | stale — remove |
| 10 | `20261118-gate-close-flash-lite.json` | R1 | `complete` | `[x]` | stale — remove |
| 11 | `20261118-gate-publishable-pass.json` | R1 | `complete` | `[x]` | stale — remove |
| 12 | `20261118-phase1-closeout-audit.json` | R1 | `complete` | `[x]` | stale — remove |
| 13 | `20261119-engineering-debt-sweep.json` | 2 | `running` | `[~]` | **KEEP — active track** |

Classification totals: 4 `running` + 1 `failed` + 7 `complete` = 12 stale; 1 active.
All 12 stale tracks are archived (`[x]`) in `conductor/tracks.md`; the retained file belongs
to the only non-archived (`[~]`) track.

Scope note: `.conductor/runs/` also contains 13 per-track brief directories and
`pre-merge-checklist.md`. The brief names exactly the 12 JSON files above as the stale
run state to remove; directories and the checklist are **not** in the deletion list.

## 2. Stale run-state removal (P2.T2) — PENDING PRIMARY

- **P2.T2.1 — PENDING PRIMARY.** The primary deletes exactly the 12 files numbered 1–12
  in §1. This agent did not delete any file: the brief designates this task `PRIMARY-RUN`.
- **P2.T2.2 — before inventory recorded in §1 (13 files); after inventory PENDING PRIMARY.**
  Expected after state: 1 JSON file (`20261119-engineering-debt-sweep.json`) plus the
  non-JSON evidence/brief entries.
- **Assertion — PENDING PRIMARY:** no tracked file under `conductor/` was removed. The
  12 targets are gitignored runtime state; `git status --short` was clean before deletion
  and the deletion list contains no `conductor/**` path, so no tracked removal is expected.

## 3. Live dated clarification (P2.T3) — PENDING PRIMARY

- **P2.T3.1 — PENDING PRIMARY.** The primary appends one dated note to
  `conductor/tech-stack.md`. Per the brief, the note must mark frozen-archive prose as
  point-in-time and superseded, and name the current truth:
  - publishable gate `pass`, mean **3.82** on `gemini-3.5-flash-lite`;
  - **twelve** unaffected passes left byte-identical;
  - humanoid and chest strict exit-3 (`E_LINT_GATE`) craft findings disclosed in track
    `20261118-agent-legibility-verification`;
  - humanoid byte-identity waiver scoped to track `20261118-gate-publishable-pass`.
  Frozen prose examples to reference as superseded (do **not** edit them):
  `conductor/archive/20261117-craft-application/verification/asset-digests.md:41` ("score
  file untouched"),
  `conductor/archive/20261118-gate-close-flash-lite/verification/integrated.md:46` (old
  pass count),
  `conductor/archive/20261118-gate-publishable-pass/review.md:12` (old "ten unaffected
  passes", corrected in R1).
- **P2.T3.2 — partial / PENDING PRIMARY final check.** At handoff `git status --short` is
  clean, so no archived, product, guideline or spec file has been changed by this agent.
  Final confirmation after the primary's note edit is PENDING PRIMARY.

## 4. Archive integrity (P2.T4) — PENDING PRIMARY

- **P2.T4.1 — PENDING PRIMARY.** The primary compares every file under
  `conductor/archive/` against the 215 SHA-256 entries in the baseline file's
  `=== ARCHIVE HASHES ===` section (lines 21–235). Expected: all byte-identical, zero
  mismatches. This agent did not run the comparison or touch any archived file.
- **P2.T4.2 — COMPLETE.** This file and `verification/phase-2.md` were written by this
  agent with real subagent results and `PENDING PRIMARY` cells for primary-owned results.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|----|-----------|----------|--------|
| AC-3 | No `.conductor/runs` file remains for an archived `[x]` track; active run file still exists. | §1 maps all 12 stale JSON files to `[x]` tracks and the retained file to `[~]`; §2 records the planned deletion. Before state verified; after state is PENDING PRIMARY (primary deletes). | PENDING PRIMARY |
| AC-4 | Dated clarification present in `tech-stack.md`; every file under `conductor/archive/` byte-identical. | §3 (note content checklist) and §4 (215-file baseline comparison) — both primary-owned. | PENDING PRIMARY |
| FR-2 | Remove stale run-state files; retain current track's file and all non-run evidence. | §1 classification and §2 deletion list (12 targets, active file excluded). | partial — PENDING PRIMARY |
| FR-3 | One dated live clarification in `tech-stack.md`. | §3 content checklist. | PENDING PRIMARY |
| FR-4 | Product behavior and frozen evidence unchanged. | `pnpm verify` exit 0; tree clean at handoff; no `test/art/**`, archived or score file touched by this agent. | done (subagent scope); PENDING PRIMARY final |
| NFR-3 | Changes limited to NFR-3 paths. | At handoff no tracked file changed (`git diff --name-only base..HEAD` empty). This agent adds only the two verification files. Final scope check after primary edits PENDING PRIMARY. | partial — PENDING PRIMARY |
| NFR-4 | Archived artifacts frozen; verify by hash. | §4. | PENDING PRIMARY |
| NFR-5 | Run cleanup never removes active run file or any file under `conductor/`. | Deletion list §2 contains only 12 gitignored `.conductor/runs/*.json`; active file and all `conductor/**` excluded. Final assertion PENDING PRIMARY. | partial — PENDING PRIMARY |

## Evidence paths

- `conductor/tracks/20261119-engineering-debt-sweep/verification/state-hygiene.md` (this file)
- `conductor/tracks/20261119-engineering-debt-sweep/verification/phase-2.md`
- Primary-supplied baseline: `C:\Users\Ansyar\AppData\Local\Temp\opencode\debtsweep-baseline.txt`

## Deviations

- None. No file outside this phase's `Touches` was modified by this agent; the 12 deletions,
  the `tech-stack.md` edit and the archive hash comparison were left to the primary exactly
  as the brief requires.

## Notes

- The single `pnpm verify` warning is pre-existing and out of scope (same warning recorded
  in Phase 1 evidence); it is not introduced or suppressed by this phase.
- No credentialed scoring and no `pnpm rubric:calibrate` was run.
- `test/art/scores.json` was not edited by this agent; its hash is unchanged per the
  primary-supplied baseline.
- On primary finalization, replace every `PENDING PRIMARY` cell with the real result,
  set Result to `verified`, and mark AC-3/AC-4 `verified` in both evidence files and in
  `plan.md` (primary-owned).
