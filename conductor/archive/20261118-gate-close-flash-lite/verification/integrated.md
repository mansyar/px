# Integrated verification — 20261118-gate-close-flash-lite

- **Track:** `20261118-gate-close-flash-lite` (Publishable Gate Close)
- **Branch:** `feat/20261118-gate-close-flash-lite`
- **Date:** 2026-11-18
- **Base:** `8de763543d60fa2b92e5799dd5cbd6f288932342` (`main`)
- **Final head at verification:** `7053d14`
- **Phases:** 3 of 3 verified (checkpoints `051ada7`, `c78f022`, `9a8635c`)

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| typecheck + lint + test + build | `pnpm verify` | 0 | 119 files / 1028 tests passed; build clean; one pre-existing non-failing Biome `noNonNullAssertion` warning at `test/recipe/version-1-2.test.ts:50` (not introduced by this track) |
| coverage | `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` | 0 | statements 95.02%, branches 85.72%, functions 98.33%, lines 94.82% — all above the 80% gate; benchmarks excluded so v8 instrumentation does not inflate the NFR-7 wall-clock budget |
| rubric (read-only) | `node scripts/rubric-report.mjs` | 0 | 7 assets / 14 passes, mean 3.73, `fail`, instrument `gemini-3.5-flash-lite` — matches `test/art/scores.json`; no network, no writes |
| rubric (below floor) | `node scripts/rubric-report.mjs --below 3` | 0 | 2 below-floor failures: humanoid A `edge_language=2`, humanoid A `palette_craft=2` |
| score diff | `node C:/Users/Ansyar/AppData/Local/Temp/opencode/gateclose-diff.js` | 0 | `unaffected_checked=10 diffs=0` — the ten passes outside the re-score are JSON-identical to the pre-track snapshot |

## Requirements coverage

| ID | Requirement | Evidence | Status |
| --- | --- | --- | --- |
| FR-1 | humanoid lighting ≥ 3 both passes on flash-lite | `rescore.md` §4: humanoid A/B lighting 3/3 (was 2/2) | pass |
| FR-2 | scene pass A lighting ≥ 3, single top-left gable | `rescore.md` §4: scene A lighting 3; `recipe-changes.md`: opposing `roof_left`/`roof_right` facings removed | pass |
| FR-3 | faithful re-render, strict-clean, new digests | `generation-summary.json` + `phase-1.md`; humanoid `27fd32e6…`, scene `f48e72d7…`; zero blocking findings | pass |
| FR-4 | four affected passes machine-scored on flash-lite | `rescore.md` §4; all four `model=gemini-3.5-flash-lite`, primary-run, no hand edits | pass |
| FR-5 | honest verdict, no forced pass | `gate-decision.md` §1–§4: mean 3.73 ≥ 3.5 but floor clause binds; ACCEPT recorded | pass |
| FR-6 | five unchanged assets byte-identical | `recipe-changes.md` digest table; `pnpm verify` determinism assertions; humanoid waiver scoped to humanoid only | pass |
| NFR-1 | flash-lite only; no cross-instrument comparison | all 14 per-pass `model=gemini-3.5-flash-lite`; `gate-decision.md` §5 explicitly non-comparable to 3.25 baseline | pass |
| NFR-2 | no hand-edited scores/rationales | diff shows only four machine-written passes; primary edit limited to `verdict.note` / `scored_by` free text to record honest state | pass |
| NFR-3 | no new deps; existing ops; <~2000 ops | no manifest change; max op count well under budget; `pnpm verify` green | pass |
| NFR-4 | verify + 80% coverage | commands table above | pass |
| NFR-5 | credentialed scoring primary-run, retries with backoff | `rescore.md` §4; humanoid A needed 4 attempts; no instrument switch; credential from env, never printed | pass |
| NFR-6 | reproducible evidence | `rescore.md` §3 artifact SHA-256 values, §6 exact commands; gitignored binaries under `.conductor/evidence/` | pass |
| AC-1..AC-7 | all acceptance criteria | per-phase verification files `phase-1.md`, `phase-2.md`, `phase-3.md`; plan Result blocks | pass |

## Gate outcome

- **Verdict:** `fail` — mean **3.73** clears the 3.5 threshold, but the publishable
  tier also requires no criterion below 3 on any asset/pass. Two remaining scores
  are at 2 (humanoid A `edge_language`, humanoid A `palette_craft`), so the floor
  clause binds.
- **Progress:** all three original below-floor `lighting=2` failures
  (humanoid A/B, scene A) were cleared; humanoid A regressed on two criteria;
  the ten unaffected passes are byte-identical.
- **Decision:** ACCEPT the honest fail, per the user's "Close on flash-lite"
  directive. No re-roll, no forced pass, no score or rationale hand-edited.
  See `gate-decision.md` §4.

## Deviations

- **Humanoid byte-identity waiver:** released in Phase 1 for this track only; v1
  originals remain byte-identical.
- **Metadata-only `scores.json` reconciliation:** stale `verdict.note` /
  `scored_by` free text updated by primary to match scorer-recomputed fields;
  no criterion score or rationale touched. Final SHA-256
  `0D992F3A9B9112C4F7383F75784C9F6C0EA918348DFD7C6193946E9A79CED56C`.
- **Inherited flash-lite instrument of record:** from the prior, merged
  craft-application track; documented in `scores.json` `instrument.note`.
- **Strict-lint roof repairs rejected:** three `deriveRamp(base,5)` roof_right
  candidates failed strict lint; the original ramp retained, with opposing
  facings removed instead.
