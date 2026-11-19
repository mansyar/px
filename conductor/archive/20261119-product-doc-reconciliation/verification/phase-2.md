# Phase 2 Verification — Runtime closeout and protected-scope evidence

- **Track:** 20261119-product-doc-reconciliation — Product Documentation Reconciliation
- **Phase:** 2 — Runtime closeout and protected-scope evidence
- **Date:** 2026-11-20
- **Branch:** chore/20261119-product-doc-reconciliation
- **Phase base commit:** b9cdaa0e9f9390cc246765fc7a968795eccbdd59
- **Head commit:** 3d2b250 (task/evidence commits before the phase squash)
- **Result:** verified

## Summary

P2.T1 is complete: the stale gitignored playback run record was set to
`status: "complete"` and its `updated_at` advanced, with every other field
(phase, phase_base, checkpoint/session id, attempts, started_at, brief,
last_report) left unchanged. The file is covered by `.gitignore:4` (`.conductor/`)
and was never staged; `git status --porcelain` is clean. The archived playback
metadata still reads `status: complete`, `review_verdict: PASS` and
`pr_url: https://github.com/mansyar/px/pull/21`.

P2.T2 is complete. All four named verification commands were eventually run:
the scores digest and the gitignore check were denied to the phase executor and
were run by the primary; the literal `b3f984f4…HEAD` diff in the brief used the
*archived playback track's* base by mistake — the primary corrected the base to
this track's `71e65a37…` for the protected-scope check. The first primary
`pnpm verify` hit a 5-second smoke-test spawn timeout; the immediate rerun
passed with no code change (configured retry budget is 2). Both attempts are
recorded below without hiding the flake.

No protected file was changed by this documentation-only track. Relative to
this track's own base (`71e65a37…`) the diff contains only `conductor/`
documentation and track state; relative to the phase base (`b9cdaa0e…`) the
tracked diff is only this evidence file.

## Commands table

| Layer | Command / tool | Exit | Summary |
| --- | --- | --- | --- |
| inspect | `git status --porcelain` | 0 | Clean at entry and at final HEAD; run file not staged |
| inspect | `git log --oneline --max-count=6` | 0 | Task commits `b3c10cb`, `3d2b250` on top of phase base `b9cdaa0` |
| verification (static/unit/integration/smoke/determinism) | `pnpm verify` (phase executor) | 0 | `typecheck → lint → test → build`; 1 pre-existing non-fatal Biome warning at `test/recipe/version-1-2.test.ts:50`; 120 files / 1057 tests; build succeeded |
| verification (retry attempt 1, primary) | `pnpm verify` | 1 | `test/smoke/binaries.test.ts` `--help` spawn timed out at 5000 ms (1 failed / 1056 passed). No assertion failure; no code change |
| verification (retry attempt 2, primary) | `pnpm verify` | 0 | 120 files / 1057 tests passed; typecheck, lint (same pre-existing warning) and build passed, exit 0 |
| verification (scores digest, primary) | `Get-FileHash -Algorithm SHA256 test/art/scores.json` | 0 | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` — matches baseline |
| verification (protected scope, correct base, primary) | `git diff --name-only 71e65a37b7587146c711a64b8664fe5c2697fcc3..HEAD` | 0 | Only `conductor/product.md`, `conductor/product-guidelines.md`, `conductor/tracks.md` and this track's Conductor state/evidence — **no protected path** |
| verification (literal brief command, primary) | `git diff --name-only b3f984f49374b8ba394afa4d3a708f4a93af67ca..HEAD` | 0 | Lists shipped changes from the merged animation tracks (wrong base for this track); see Deviations |
| verification (ignore rule, primary) | `git check-ignore -v .conductor/runs/20261119-animation-playback.json` | 0 | `.gitignore:4:.conductor/` — run file is ignored |
| verification (phase range) | `git diff --name-only b9cdaa0e9f9390cc246765fc7a968795eccbdd59..HEAD` | 0 | Only this evidence file before the primary state commit |
| verify (golden sidecars, primary) | native `read` of the five `test/goldens/fixtures/*.sha256` files | 0 | All five contents match the recorded baselines |
| timestamp (primary) | `Get-Date -AsUTC -Format 'yyyy-MM-ddTHH:mm:ssZ'` | 0 | Current UTC confirmed; run-file `updated_at` `2026-11-19T13:49:27Z` is truthful |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-3 | Playback run record reports `status: "complete"`; other records untouched | Run file reads `"status": "complete"` with all other fields unchanged (phase `R1`, phase_base `b69ea4a9…`, session id `ses_e0cbae8fbffeFA9dNqj5ssxP9L`, attempts `0`, brief, `last_report: null`, `started_at`); only `updated_at` advanced. File is gitignored and unstaged. Archived playback metadata unchanged: complete / PASS / pr_url set. | verified |
| AC-4 | Protected-scope diff versus this track's base empty; scores digest matches baseline | `git diff --name-only 71e65a37b7587146c711a64b8664fe5c2697fcc3..HEAD` contains no `src/`, `test/`, `scripts/`, `docs/animation.md`, `package.json`, `pnpm-lock.yaml`, `.github/` or `.aws/` path. Scores digest `E5CCE080…C828D` read directly by the primary. All five golden sidecars match baseline. | verified |
| AC-5 | `pnpm verify` exits 0 at final HEAD | Executor run exit 0; primary run 1 failed on a 5 s smoke spawn timeout, rerun exit 0 with 120 files / 1057 tests and no code change (within `verification.retry: 2`). Evidence-only commits do not affect verification. | verified |
| AC-6 | Committed evidence records commands, exits, digests and limitations | This file records every command and exit (including the first failed attempt), the scores and golden digests, the wrong-base limitation, and the permission denials with their resolution. | verified |

**Decision:** AC-3, AC-4, AC-5 and AC-6 **PASS**. Overall phase result is
**verified**. No protected artifact was changed and no rebaseline was performed.

## Protected-baseline table

| Path | Expected (SHA-256) | Observed | Unchanged |
| --- | --- | --- | --- |
| `test/art/scores.json` | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` | yes |
| `hero` golden | `8d9074157a61e030355daa15489ed85fd37a73074087ee77cc45aeef28f027cb` | Sidecar content matches; goldens suite passes | yes |
| `anim-duo` golden | `7c0c9b385e9ee8fdf45b5dd31d15bfba5df51db4a51ccfbe5aa78c18e591b559` | Sidecar content matches; goldens suite passes | yes |
| `anim-duo sheet` golden | `6189229cd0b26e818484f8704f5936723e3393e28c3257b7d8dab3ae63f1b045` | Sidecar content matches; goldens suite passes | yes |
| `anim-duo onion0` / `onion1` goldens | `6b3d53a6450b2cfe2690082668839267ae092e03ef711fc197eb828729e92c42` / `34eb79b8961af1c7d2bf4acbb4ae867b083a5f6e19759c0f3f70697f21e0c379` | Sidecar contents match | yes |
| Goldens / scores / CI / dependencies / archives (diff scope) | no change | No protected path in `71e65a37…HEAD` diff | yes |

## Evidence paths

- This file: `conductor/tracks/20261119-product-doc-reconciliation/verification/phase-2.md`
- Phase 1 precedent: `conductor/tracks/20261119-product-doc-reconciliation/verification/phase-1.md`
- Archived playback metadata (read-only confirmation): `conductor/archive/20261119-animation-playback/metadata.json`
- Runtime record edited: `.conductor/runs/20261119-animation-playback.json` (gitignored, not staged)

## Deviations

- The phase brief written by the primary named `b3f984f49374b8ba394afa4d3a708f4a93af67ca` as the protected-diff base. That is the base of the archived animation-playback track, not of this track (`71e65a37b7587146c711a64b8664fe5c2697fcc3`). The executor reported the mismatch instead of silently rewriting it; the primary ran the correct diff and recorded both. No command output was altered.
- No file outside the two phase Touches was modified.

## Blockers resolved by the primary

| Command | Original executor result | Primary resolution |
| --- | --- | --- |
| `Get-FileHash -Algorithm SHA256 test/art/scores.json` | `permission.rejected` | Primary ran it: exit 0, digest matches baseline |
| `git check-ignore -v .conductor/runs/20261119-animation-playback.json` | `permission.rejected` | Primary ran it: exit 0, `.gitignore:4:.conductor/` |
| `Get-Date -AsUTC -Format "yyyy-MM-ddTHH:mm:ssZ"` | `permission.rejected` | Primary ran it; recorded run-file timestamp is truthful |

None of these was retried or worked around by the executor. The primary holds
the project's permissions and ran the exact commands.

## Notes

- The run-state edit is local runtime state only; it was never staged and
  `.conductor/` is never included in a commit.
- The single Biome warning is pre-existing at `test/recipe/version-1-2.test.ts:50`
  and outside this phase's Touches; no fix was attempted.
- The first primary `pnpm verify` failure is a known smoke-test spawn timeout
  under load (`--help` process exceeded 5000 ms), not an assertion or a
  protected-scope regression. The rerun passed unchanged; both are recorded.

## Primary verification

| Check | Result |
| --- | --- |
| `git status --porcelain` at final HEAD | clean; only the two phase Touches (one gitignored) were used |
| `git diff --name-only b9cdaa0..HEAD` | only `conductor/tracks/20261119-product-doc-reconciliation/verification/phase-2.md` |
| Protected diff against this track's base `71e65a37…` | no protected path |
| `Get-FileHash` scores digest | `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D` |
| `git check-ignore -v` playback run file | ignored by `.gitignore:4` |
| `pnpm verify` primary rerun | exit 0, 120 files / 1057 tests (first attempt timed out, recorded above) |
| AC-3 / AC-4 / AC-5 / AC-6 | all pass |

The phase is accepted. No golden, score, archive, CI, dependency or source file
was rebaselined.
