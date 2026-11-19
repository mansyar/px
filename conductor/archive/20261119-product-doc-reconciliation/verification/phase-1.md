# Phase 1 Verification — Product scope and terminology correction

- **Track:** 20261119-product-doc-reconciliation — Product Documentation Reconciliation
- **Phase:** 1 — Product scope and terminology correction
- **Date:** 2026-11-20
- **Branch:** chore/20261119-product-doc-reconciliation
- **Base commit:** f9134dff3c61797bd00c93466e0abbf66f6f31e9
- **Head commit:** e498168 (P1.T1 `d7602e0`, P1.T2 `e498168`; this evidence file is committed after being written)
- **Result:** verified

## Summary

The primary applied the three edits from the brief's Edit contract after the
phase executor's `edit` permission denial. This phase verified the resulting
file contents against AC-1 and AC-2, ran the configured verification command,
and committed the two product docs as separate task-level commits. No product
or design decision was required. No files outside the phase Touches were
modified.

## Commands table

| Layer | Command / tool | Exit | Summary |
| --- | --- | --- | --- |
| inspect | `git status --short` | 0 | Two product docs modified, evidence directory untracked at entry |
| inspect | `git diff --stat` | 0 | `product.md` 3 ++-, `product-guidelines.md` 3 +++ — matches the three contracted edits |
| read | native `read` of `conductor/product.md` (Scope & Non-Goals, dated notes) | 0 | AC-1 verified against actual file contents |
| read | native `read` of `conductor/product-guidelines.md` (Terminology) | 0 | AC-2 verified against actual file contents |
| static/unit/integration/smoke/determinism | `pnpm verify` | 0 | `typecheck → lint → test → build`; 120 files / 1057 tests passed; build succeeded; 1 pre-existing non-fatal Biome warning in `test/recipe/version-1-2.test.ts` (`lint/style/noNonNullAssertion`, unchanged by this phase) |

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | product.md has no deferred bullet claiming animation, onion-skinning or sheet packing is unstarted; the new dated note explicitly supersedes the 2026-11-18 deferral and references PR #20/#21 | `conductor/product.md` lines 49–56: deferred list now holds only tilemaps, GUI, translucent alpha, RNG, npm publishing and engine exports. Line 99: new 2026-11-19 note explicitly supersedes the 2026-11-18 Phase 1 closeout deferral, names `20261119-animation-foundations` (PR #20) and `20261119-animation-playback` (PR #21), and states delivered frames + deterministic sheet packing, `--onion <index>` three-panel neighbor inspection and additive `timeline` metadata; it states no engine, op, linter, rubric, CI, score, golden, archive, recipe-schema or dependency change. Line 97: the 2026-11-18 note is preserved unchanged as history. | verified |
| AC-2 | All three terms appear in the product-guidelines.md terminology table with definitions matching docs/animation.md; no conflicting synonym is introduced | `conductor/product-guidelines.md` lines 61–63: `frame` (one compiled image in a framed recipe, ordered by `frames`; not "cell"/"still"), `timeline` (additive metadata block projecting frame indices, `duration_ms`, cumulative `start_ms` and `total_ms`; not a playback clock), `onion view` (three-panel previous / selected / next inspection render from `--onion <index>`; not an overlay or animation). All three match `docs/animation.md` and introduce no conflicting synonym. | verified |

## Evidence paths

- This file: `conductor/tracks/20261119-product-doc-reconciliation/verification/phase-1.md`

## Deviations

None. All changes are confined to the phase Touches. The historical Phase 2
phrasing inside the retained 2026-11-18 dated note and the Phase 1 risk row was
left untouched as required by the Edit contract; the new 2026-11-19 note
supersedes the deferral without rewriting history.

## Notes

- The executor's `edit` tool was denied at phase start; per the brief it did not
  retry or work around that denial. The primary applied the three contracted
  edits (recorded in the brief's Primary-unblock note); the executor verified and
  committed them without re-applying or reverting them.
- Task commits: `d7602e0` (P1.T1, product scope), `e498168` (P1.T2, terminology).
  This evidence file is committed separately after these two.
- `pnpm verify` exits 0 at the final task-commit HEAD. The single Biome warning is
  pre-existing in `test/recipe/version-1-2.test.ts` and outside this phase's
  Touches; no fix was attempted.
- Protected scope (engine, tests, rubric, goldens, scores, CI, dependencies) was
  not touched by this phase.

## Primary verification

| Check | Result |
| --- | --- |
| `git status --porcelain` at final HEAD `744dbf3` | clean (no uncommitted files) |
| Commits since phase base `f9134df` | `d7602e0`, `e498168`, `744dbf3` — exactly the three reported, zero merge commits |
| `git diff --name-only f9134df..HEAD` | exactly the three Touches: `conductor/product.md`, `conductor/product-guidelines.md`, this evidence file |
| `pnpm verify` (primary run) | exit 0 — typecheck, lint, 120 files / 1057 tests, build; only the pre-existing `test/recipe/version-1-2.test.ts:50` Biome warning |
| AC-1 | deferred animation bullet removed; 2026-11-19 note explicitly supersedes the 2026-11-18 deferral and names PR #20/#21; historical note preserved per spec |
| AC-2 | `frame`, `timeline`, `onion view` rows present in the terminology table with definitions consistent with `docs/animation.md`; no synonym introduced |

The phase is accepted. The executor's permission denial was resolved by the
primary applying the exact contracted edits, not by bypassing verification.
