# Phase 2 Evidence — Runtime-state and live-doc hygiene

- Track: 20261119-engineering-debt-sweep — Engineering Debt Sweep
- Phase: 2 — Runtime-state and live-doc hygiene
- Date: 2026-11-19
- Branch: `chore/20261119-engineering-debt-sweep`
- Phase base: `6aec62ccef97785a786bf343d01907ae1ae91efd`
- HEAD at subagent handoff: `6aec62ccef97785a786bf343d01907ae1ae91efd`
- HEAD before finalization (primary note commit `0e1b847 docs(conductor): Reconcile runtime-state and live-doc debt`): `0e1b8474bf2ad3a0b3cd52090533666a3312ce4b`
- HEAD after finalization: `docs(verify): finalize phase 2 state hygiene evidence` (this commit)
- Baseline file (primary-supplied): `C:\Users\Ansyar\AppData\Local\Temp\opencode\debtsweep-baseline.txt`, `CAPTURED=2026-11-18T21:42:27Z`
- Frozen score hash (baseline and final): `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`

## Result

**verified** — all Phase 2 requirements are complete. The run-file inventory (P2.T1), the
primary-run deletion of the 12 stale run-state files (P2.T2), the dated live clarification
in `conductor/tech-stack.md` (P2.T3), the 215-file archive hash comparison (P2.T4.1) and the
phase verification command `pnpm verify` (exit 0) are all recorded below with real results.
AC-3 and AC-4 are **verified**; no tracked file under `conductor/` was removed, no archived
file changed, and `test/art/scores.json` remains byte-identical to the frozen baseline.

## Commands

| Layer | Command / action | Exit | Summary |
|-------|------------------|------|---------|
| Inventory | native read of `.conductor/runs/` directory + the 13 `*.json` files | — | 13 run-state JSON files; 12 stale (4 `running`, 1 `failed`, 7 `complete`), 1 active (`running`). Full table in §1. |
| Registry | native read of `conductor/tracks.md` | — | All 12 stale files map to `[x]` (archived) tracks; the active file maps to the single `[~]` track. |
| Git | `git status --short` | 0 | clean at handoff and again before the primary note commit — no tracked file modified, staged or deleted. |
| Git | `git rev-parse HEAD` | 0 | `6aec62ccef97785a786bf343d01907ae1ae91efd` at handoff (equals phase base); `0e1b8474bf2ad3a0b3cd52090533666a3312ce4b` before finalization. |
| Git | `git log --oneline --max-count=8` | 0 | HEAD is the phase-2 `in_progress` plan commit at handoff; no drift. |
| Git | `git diff --name-only 6aec62ccef97785a786bf343d01907ae1ae91efd..HEAD` | 0 | empty at handoff — no tracked file changed between phase base and handoff. |
| Verification (phase command) | `pnpm verify` | 0 | `tsc --noEmit` OK; `biome check .` checked 223 files, 0 errors, 1 pre-existing warning (`test/recipe/version-1-2.test.ts:50:7 lint/style/noNonNullAssertion`, out of scope); 119 test files / 1028 tests passed; `tsc -p tsconfig.build.json` OK. |
| Hash (scoped) | `Get-FileHash -Algorithm SHA256 test/art/scores.json` | 0 | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`, unchanged against baseline. |

Primary-run commands (results supplied by the primary; not re-run by this agent):

| Layer | Command / action | Exit | Summary |
|-------|------------------|------|---------|
| Deletion | primary removed the 12 stale `.conductor/runs/*.json` files numbered 1–12 in §2 (gitignored) | 0 | 12 removed; final inventory is only `20261119-engineering-debt-sweep.json`. All 13 brief directories and `pre-merge-checklist.md` retained. |
| Doc edit | primary appended dated note `2026-11-19, engineering debt sweep` to `conductor/tech-stack.md` immediately before `## Constraints` (now line 127) | 0 | Committed as `0e1b847 docs(conductor): Reconcile runtime-state and live-doc debt`. Biome covers seven scripts with no weakened rules/deps; 12 stale run-state files removed; archived point-in-time prose is historical while live truth is gate `pass` at mean 3.82 with twelve unchanged passes; archives frozen; full `checkJs` remains accepted debt. The existing dated notes at lines 123 and 125 carry the scoped humanoid byte-identity waiver and the disclosed humanoid/chest strict exit-3 (`E_LINT_GATE`) craft findings. |
| Hash | `C:\Users\Ansyar\AppData\Local\Temp\opencode\debtsweep-archive-compare.ps1` | 0 | `ARCHIVE_BASELINE_ENTRIES=215 CHECKED=215 MISMATCH=0 MISSING=0` — all 215 archived files byte-identical. |
| Scores | `test/art/scores.json` SHA-256 re-check | 0 | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` — unchanged. |
| Scope | `git diff --diff-filter=D --name-only` and `git status --short` | 0 | empty — no tracked file removed; tree clean before the primary note commit. Changed paths are limited to this track's evidence files and `conductor/tech-stack.md`; no `conductor/archive/**` change. |
| Scope | independent primary check of subagent commit `d322a44` | 0 | touched only the two evidence files; `Touches` scope respected. |

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
run state to remove; directories and the checklist are **not** in the deletion list and
were all retained.

## 2. Stale run-state removal (P2.T2) — COMPLETE

- **P2.T2.1 — DONE (primary).** The primary deleted exactly the 12 files numbered 1–12 in
  §1. This agent performed no deletion; the brief designates the task `PRIMARY-RUN`.
- **P2.T2.2 — DONE.** Before inventory: 13 JSON files (§1). After inventory: **1** JSON
  file — `20261119-engineering-debt-sweep.json` (active track). All 13 brief directories
  and `pre-merge-checklist.md` retained.
- **Assertion — DONE.** `git diff --diff-filter=D --name-only` is empty: no tracked file was
  removed, and specifically no tracked file under `conductor/`. The 12 targets were
  gitignored runtime state; the active run file and all `conductor/**` paths were excluded.

## 3. Live dated clarification (P2.T3) — COMPLETE

- **P2.T3.1 — DONE (primary).** One dated note, `2026-11-19, engineering debt sweep`, was
  appended to `conductor/tech-stack.md` immediately before `## Constraints` (now line 127)
  and committed as `0e1b847 docs(conductor): Reconcile runtime-state and live-doc debt`.
  It records: Biome now covers seven `scripts/**/*.mjs` files with zero findings, no rule
  weakened, no suppression and no new dependency; the 12 stale run-state files were removed;
  archived point-in-time prose (e.g. "score file untouched", "ten unaffected passes") is
  historical while the live truth is the publishable gate `pass` at mean 3.82 with twelve
  byte-identical unaffected passes; archives remain frozen and byte-identical (215 files
  re-hashed, zero mismatches); `test/art/scores.json` unchanged; full `checkJs` typing of
  the scripts remains explicitly accepted debt. The humanoid/chest strict exit-3
  (`E_LINT_GATE`) craft findings are disclosed in the existing dated note at line 125, and
  the humanoid byte-identity waiver is scoped to the gate-publishable-pass track in the
  note at line 123. The frozen prose examples were not edited:
  `conductor/archive/20261117-craft-application/verification/asset-digests.md:41`,
  `conductor/archive/20261118-gate-close-flash-lite/verification/integrated.md:46`,
  `conductor/archive/20261118-gate-publishable-pass/review.md:12`.
- **P2.T3.2 — DONE.** No archived, product, guideline or spec file was changed. The only
  live-doc change is the single dated `conductor/tech-stack.md` note in commit `0e1b847`;
  archived files remain byte-identical per §4.

## 4. Archive integrity (P2.T4) — COMPLETE

- **P2.T4.1 — DONE (primary).** `C:\Users\Ansyar\AppData\Local\Temp\opencode\debtsweep-archive-compare.ps1`
  compared every file under `conductor/archive/` against the 215 SHA-256 entries in the
  baseline file's `=== ARCHIVE HASHES ===` section: `ARCHIVE_BASELINE_ENTRIES=215
  CHECKED=215 MISMATCH=0 MISSING=0`, exit 0. All archived files are byte-identical.
- **P2.T4.2 — COMPLETE.** This file and `verification/phase-2.md` were written with real
  subagent results, then finalized with the primary-run results above.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
|----|-----------|----------|--------|
| AC-3 | No `.conductor/runs` file remains for an archived `[x]` track; active run file still exists. | §1 maps all 12 stale JSON files to `[x]` tracks and the retained file to `[~]`; §2 records deletion and the after inventory (1 JSON file, active only), plus the empty `git diff --diff-filter=D --name-only`. | verified |
| AC-4 | Dated clarification present in `tech-stack.md`; every file under `conductor/archive/` byte-identical. | §3 records the single dated note at line 127 (commit `0e1b847`); §4 records 215/215 hashes matched, 0 mismatches, 0 missing. | verified |
| FR-2 | Remove stale run-state files; retain current track's file and all non-run evidence. | §1 classification and §2 deletion list (12 targets, active file excluded; brief dirs and checklist retained). | done |
| FR-3 | One dated live clarification in `tech-stack.md`. | §3, note at line 127, commit `0e1b847`. | done |
| FR-4 | Product behavior and frozen evidence unchanged. | `pnpm verify` exit 0; `test/art/scores.json` hash unchanged; no `test/art/**`, archived or score file changed. | done |
| NFR-3 | Changes limited to NFR-3 paths. | Changed paths: the two evidence files and `conductor/tech-stack.md` only; no `conductor/archive/**` change; primary check of `d322a44` confirmed scope. | done |
| NFR-4 | Archived artifacts frozen; verify by hash. | §4: 215 checked, 0 mismatches, 0 missing. | done |
| NFR-5 | Run cleanup never removes active run file or any file under `conductor/`. | §2 assertion: active file retained; `git diff --diff-filter=D --name-only` empty. | done |

## Evidence paths

- `conductor/tracks/20261119-engineering-debt-sweep/verification/state-hygiene.md` (this file)
- `conductor/tracks/20261119-engineering-debt-sweep/verification/phase-2.md`
- Primary-supplied baseline: `C:\Users\Ansyar\AppData\Local\Temp\opencode\debtsweep-baseline.txt`
- Archive comparison script: `C:\Users\Ansyar\AppData\Local\Temp\opencode\debtsweep-archive-compare.ps1`
- Live dated note: `conductor/tech-stack.md:127` (commit `0e1b847`)

## Deviations

- None. All work stayed within `Touches`; primary-owned deletions, doc edit and archive
  comparison were recorded with the primary's real results exactly as the brief requires.

## Notes

- The single `pnpm verify` warning is pre-existing and out of scope (same warning recorded
  in Phase 1 evidence); it is not introduced or suppressed by this phase.
- No credentialed scoring and no `pnpm rubric:calibrate` was run.
- `test/art/scores.json` is byte-identical to the frozen baseline hash.
- Primary-owned `plan.md` state updates remain the primary's responsibility; this
  finalization changed only the two evidence files.
