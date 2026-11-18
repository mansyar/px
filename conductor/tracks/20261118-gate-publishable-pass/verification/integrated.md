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
| FR-1 | Both humanoid passes clear floor | humanoid A/B `edge_language=3`, `palette_craft=3/4`, no criterion <3; `scores.json` | pass |
| FR-2 | Publishable gate recomputed honestly | `result=pass`, mean 3.82, `failures=[]`, scorer-written verdict; `verification/gate-decision.md` §1–§3 | pass |
| FR-3 | Strict-clean re-render with new digest | recipe digest `76c4ba9b…`, A `FAFF12D1…54D1`, B `D6738882…E42`, `generation-summary.json` blocking_findings 0; `verification/phase-1.md` | pass |
| FR-4 | Two affected passes machine re-scored | 2 scorer runs, `OK[try 1]` each, `--model gemini-3.5-flash-lite --replace`; `verification/rescore.md` | pass |
| FR-5 | Bounded decision, no forced pass | quality win recorded with one candidate / one scoring round / no re-roll; `verification/gate-decision.md` §3 | pass |
| FR-6 | Unchanged-asset integrity | `unaffected_checked=12 diffs=0`; five other v2 recipes and seven v1 originals byte-identical; `verification/phase-1.md`, `recipe-changes.md` | pass |
| NFR-1 | Instrument of record only | all 14 passes `gemini-3.5-flash-lite`; no cross-instrument comparison or score transfer | pass |
| NFR-2 | No hand-edited scores or rationales | only metadata free text (`scored_by`, `instrument.note`, `verdict.note`) reconciled by primary; all criterion scores/rationales machine-written | pass |
| NFR-3 | No new deps / ops / >2000 ops | no manifest change; existing registered ops only, one `light` retained | pass |
| NFR-4 | Verify + 80% coverage | commands above, all exit 0 | pass |
| NFR-5 | Credentialed scoring primary-run only | primary executed `scripts/rubric.mjs` via env credential path; no credential printed or exposed to subagents | pass |
| NFR-6 | Reproducible evidence | phase evidence files, artifact digests, exact commands, gitignored `.conductor/evidence/` binaries | pass |
| NFR-7 | Primary visual self-review before scoring | primary read baseline and candidate A/B PNGs, judged SATISFIED, requested no bounded revision; recorded in `verification/phase-1.md` | pass |
| AC-1 | Humanoid A/B floors ≥3 | humanoid A 4.00, B 3.67; `rubric-report.mjs` | pass |
| AC-2 | Publishable gate pass | mean 3.82 ≥3.5, `failures=[]` | pass |
| AC-3 | Strict-clean digests + A/B artifacts | phase-1 evidence, `generation-summary.json` | pass |
| AC-4 | Two machine-scored passes | two passes machine-written with track note, twelve unaffected unchanged | pass |
| AC-5 | Honest verdict and bounded stop | `verification/gate-decision.md` | pass |
| AC-6 | Unchanged assets byte-identical | `unaffected_checked=12 diffs=0`; digest table in phase-1 evidence | pass |
| AC-7 | Verify + coverage gates | commands above | pass |
| AC-8 | No re-rolls or instrument switch | single bounded round, both calls try 1; `verification/rescore.md` | pass |
| AC-9 | Visual review recorded | `verification/phase-1.md` primary visual verdict | pass |

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
