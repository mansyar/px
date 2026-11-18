# Integrated Verification

- **Track:** `20261118-gate-publishable-pass` — Gate Publishable Pass
- **Date:** 2026-11-18
- **Branch:** `feat/20261118-gate-publishable-pass`
- **Base commit:** `4377f3468bf840a7057e6ebc8bb02183ed076d1a`
- **Final commit under verification:** `20ad94dc72389e58932f0a14774df6c127930744`
- **Result:** `pass`

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static + unit + integration + smoke (verify) | `pnpm verify` | 0 | typecheck clean; Biome clean with one pre-existing non-failing `noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50`; 119 test files / 1028 tests pass; build clean |
| coverage | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | 0 | 116 files / 996 tests; All files 95.02% statements, 85.72% branches, 98.33% functions, 94.82% lines — all above the 80% gate; benchmarks excluded (v8 instrumentation would inflate NFR-7 wall-clock) |
| gate evidence | `node scripts/rubric-report.mjs` | 0 | 7 assets / 14 passes, `mean 3.82 · pass · gemini-3.5-flash-lite`; zero below-floor criterion scores |
| unaffected diff | `node C:/Users/Ansyar/AppData/Local/Temp/opencode/gatepublish-diff.js` | 0 | `unaffected_checked=12 diffs=0`; only humanoid A/B changed, both with model `gemini-3.5-flash-lite` and the track note |

## Requirements coverage

| ID | Requirement | Evidence | Status |
| --- | --- | --- | --- |
| FR-1 | humanoid pass A `edge_language >= 3` on `gemini-3.5-flash-lite` | humanoid A/B `edge_language=3`, `palette_craft=3/4`, no criterion <3; `scores.json` | pass |
| FR-2 | humanoid pass A `palette_craft >= 3` on `gemini-3.5-flash-lite` | humanoid A `palette_craft=4` (2->4); `scores.json`; `verification/rescore.md` | pass |
| FR-3 | humanoid recipe re-authored with coherent warm/cool hue-stepped ramps, strict-clean new digest, faithful A/B regenerated | recipe digest `76c4ba9b…`, A `FAFF12D1…54D1`, B `D6738882…E42`, `generation-summary.json` blocking_findings 0; `verification/phase-1.md` | pass |
| FR-4 | humanoid passes A/B machine re-scored with flash-lite model and track note; no other pass re-scored | 2 scorer runs, `OK[try 1]` each, `--model gemini-3.5-flash-lite --replace`; `verification/rescore.md` | pass |
| FR-5 | verdict recomputed by scorer and recorded honestly; no forced pass | `result=pass`, mean 3.82, `failures=[]`, scorer-written verdict; `verification/gate-decision.md` §1–§3 | pass |
| FR-6 | exactly one authored candidate scored; no second iteration | one candidate / one scoring round / `OK[try 1]` both calls / no re-roll; `verification/gate-decision.md` §3-§4 | pass |
| NFR-1 | flash-lite only, no cross-instrument comparison | all 14 passes `gemini-3.5-flash-lite`; no cross-instrument comparison or score transfer | pass |
| NFR-2 | no hand-edited scores/rationales/verdict fields; metadata-only reconciliation documented | only metadata free text (`scored_by`, `instrument.note`, `verdict.note`) reconciled by primary; all criterion scores/rationales machine-written | pass |
| NFR-3 | no new dependencies, <~2000 ops, existing registered ops only | no manifest change; existing registered ops only, one `light` retained | pass |
| NFR-4 | `pnpm verify` exit 0 and scoped coverage >= 80% on four metrics | commands above, all exit 0 | pass |
| NFR-5 | credentialed scoring primary-only, credential never printed, retry 503/429/non-JSON with backoff | primary executed `scripts/rubric.mjs` via env credential path; no credential printed or exposed to subagents | pass |
| NFR-6 | evidence records exact commands, artifact/recipe/digest values, paths; binaries gitignored | phase evidence files, artifact digests, exact commands, gitignored `.conductor/evidence/` binaries | pass |
| NFR-7 | primary visual self-review of A/B before scoring, at most one bounded visual revision | primary read baseline and candidate A/B PNGs, judged SATISFIED, requested no bounded revision; recorded in `verification/phase-1.md` | pass |
| AC-1 | humanoid A edge >= 3 with design invariants preserved | humanoid A 4.00, B 3.67; `rubric-report.mjs` | pass |
| AC-2 | humanoid A palette >= 3 | humanoid A `palette_craft=4` (2->4); `scores.json`; `verification/rescore.md` | pass |
| AC-3 | new .sha256 matches two strict-clean renders; A/B regenerated with zero blocking findings | phase-1 evidence, `generation-summary.json` | pass |
| AC-4 | exactly two machine-re-scored passes with model/note; no hand edits | two passes machine-written with track note, twelve unaffected unchanged | pass |
| AC-5 | honest `pass`/`fail` verdict with failures or bounded ACCEPT | mean 3.82 ≥3.5, `failures=[]`; bounded-stop decision in `verification/gate-decision.md` §3 | pass |
| AC-6 | one candidate, no re-roll, no second authored candidate | single bounded round, both calls try 1; `verification/rescore.md` | pass |
| AC-7 | five v2 and seven v1 originals byte-identical; twelve unaffected passes JSON-identical | `unaffected_checked=12 diffs=0`; digest table in phase-1 evidence | pass |
| AC-8 | verify exit 0 and coverage >= 80% | commands above, all exit 0 | pass |
| AC-9 | primary visual self-review of A/B before scoring, at most one bounded visual revision | `verification/phase-1.md` primary visual verdict | pass |

## Gate outcome

The publishable gate is **PASSED** on the instrument of record `gemini-3.5-flash-lite`: mean **3.82** (threshold 3.5) with zero below-floor criterion scores across all 14 passes. Both prior humanoid A floor failures cleared (`edge_language` 2→3, `palette_craft` 2→4). Final `test/art/scores.json` SHA-256 `E5CCE08003A5F35EE8782225275E491D8EDAA2729C871A1BCD685C73166C828D`. This result is not comparable to the old `gemini-4-hydrogen` 3.25 baseline; the instrument-of-record history is documented in `scores.json` and `conductor/tech-stack.md`.

## Deviations

- Humanoid byte-identity protection was released by the prior user decision "Close on flash-lite" and this track's bounded quality pass; v1 originals and the other five v2 assets remain byte-identical.
- Inherited `gemini-3.5-flash-lite` instrument of record from the prior track (frozen instrument's free-tier quota exhausted); no switch in this track.
- Primary metadata-only reconciliation of `scores.json` free text (`scored_by`, `instrument.note`, `verdict.note`) to record the honest recomputed state; no criterion score or rationale touched.
- Two strict-lint palette re-materializations during authoring (`gorget.t2`, `pauldron.t2`) using existing derivation rules; no linter, threshold, or op weakened.
- Phase 2 squash skipped: the range contained a primary metadata commit unreported by the subagent, so task commits were retained.

## Evidence

- `verification/recipe-changes.md`, `verification/phase-1.md` (visual gate), `verification/rescore.md`, `verification/phase-2.md`, `verification/gate-decision.md`
- Faithful A/B binaries and `generation-summary.json` under gitignored `.conductor/evidence/art-v2/`
- Baseline images under gitignored `.conductor/evidence/gate-publishable-pass/`

## Notes

All phases verified (1: `6af20cb…`, 2: `8f3d92d…`, 3: `11cb197…`). Scoped coverage excludes benchmarks so the v8 instrumentation does not inflate the NFR-7 wall-clock budget; CI holds the scoped invocation. The one Biome warning predates the branch and is non-failing. No scores were re-rolled and no pass was forced.
