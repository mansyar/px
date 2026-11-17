# Craft Application — Implementation Plan

> **Branch:** `feat/20261117-craft-application`
> **Base:** `main` @ `b0ea365ba1862fe387e172e420b2672400e65d0b`
>
> Phase states are `pending`, `in_progress`, `verified`, `failed`, or `blocked`.
> Only the primary agent writes this file. Phase subagents report results and the
> primary records them.

## Phase 1: Frozen-instrument craft diagnostic (chest)

- **Goal:** Establish on the frozen instrument which of hue-ramp palette, warm-cool directional light, and deliberate edge hierarchy clear the ≥3 floor on chest's lighting / palette_craft / edge_language, with faithful A/B evidence.
- **Depends on:** none
- **Covers:** FR-1, FR-2, FR-3, NFR-1, NFR-5, NFR-6, AC-1
- **Touches:** `test/art/diagnostic/**`, `conductor/tracks/20261117-craft-application/verification/diagnostic.md`
- **Verification:** `node scripts/rubric-report.mjs --asset chest --below 3` plus inspection of `conductor/tracks/20261117-craft-application/verification/diagnostic.md` for A/B artifact paths and the score table
- **Status:** verified

- [x] **P1.T1: Capture chest baseline evidence** — covers: FR-2, FR-3
  - [x] **P1.T1.1:** Render pass A (8× nearest-neighbour on `#808080`) and pass B (engine debug sheet) for baseline chest into `test/art/diagnostic/chest/baseline/`
  - [x] **P1.T1.2:** Record baseline digests and the 12 frozen criterion scores in `verification/diagnostic.md`
- [x] **P1.T2: Build 2–3 chest diagnostic candidates** — covers: FR-1
  - [x] **P1.T2.1:** Candidate H — hue-ramp palette (`derive-ramps` / `harmonize`)
  - [x] **P1.T2.2:** Candidate L — warm-cool directional light (`light` + `ramp_fill` / `auto_shade`)
  - [x] **P1.T2.3:** Candidate E — deliberate edge hierarchy (`intent-edges`)
  - [x] **P1.T2.4:** Candidate C — combination of the promising treatments
- [x] **P1.T3: Render and score all candidates on the frozen instrument** — covers: FR-2, FR-3
  - [x] **P1.T3.1:** Render faithful A/B artifacts for each candidate and verify digests
  - [x] **P1.T3.2:** Human-run `PX_RUBRIC_CREDENTIALS=~/.config/opencode/opencode.json node scripts/rubric.mjs --asset chest --pass <A|B> --artifact <path> --model gemini-4-hydrogen --replace --note "diagnostic <candidate>"` (retry 503/429; never switch instrument or print the key)
  - [x] **P1.T3.3:** Tabulate per-criterion deltas against the baseline; flag levers reaching ≥3 on both passes and any regressions
- [x] **P1.T4: Record diagnostic conclusion** — covers: FR-3, AC-1
  - [x] **P1.T4.1:** Write `verification/diagnostic.md` with candidates, A/B artifact paths, score table, and lever verdict

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261117-craft-application/verification/phase-1.md
-->

**Result:** verified
**Checkpoint:** fa0e530
**Evidence:** conductor/tracks/20261117-craft-application/verification/phase-1.md

## Phase 2: Apply validated levers and re-score the gate

- **Depends on:** Phase 1
- **Covers:** FR-4, FR-5, FR-7, NFR-2, NFR-3, NFR-4, AC-2, AC-3, AC-5, AC-6
- **Touches:** `test/art/v2/**/*.px.json`, `test/art/scores.json`, `conductor/tracks/20261117-craft-application/verification/asset-digests.md`
- **Verification:** `pnpm verify` && `pnpm exec vitest run --coverage --project unit --project integration --project smoke --project goldens` && `node scripts/rubric-report.mjs`
- **Status:** verified

- [x] **P2.T1: Select levers with evidence** — covers: FR-4, AC-2
  - [x] **P2.T1.1:** Map each below-floor asset/pass to the validated lever addressing its failing criteria; record in `verification/lever-selection.md`
  - [x] **P2.T1.2:** Confirm no selected lever regressed another criterion below the floor in the diagnostic
- [x] **P2.T2: Re-author below-floor recipes** — covers: FR-4
  - [x] **P2.T2.1:** Apply validated levers to chest, character, potion, and scene; sword only where below floor
  - [x] **P2.T2.2:** Keep recipes under ~2,000 ops using existing ops only
- [x] **P2.T3: Re-render and re-score all 14 passes** — covers: FR-5, NFR-1, NFR-2, AC-3
  - [x] **P2.T3.1:** Re-render faithful A/B artifacts for all 7 assets; register paths and digests
  - [x] **P2.T3.2:** Score all 14 passes on `gemini-4-hydrogen` with `--replace`, human-run, retry/backoff; never hand-edit `scores.json`
  - [x] **P2.T3.3:** Confirm schema 3, 14 passes, unchanged instrument, and a verdict recomputed by the scorer
- [x] **P2.T4: Integrity and regression checks** — covers: FR-7, NFR-3, NFR-4, AC-5, AC-6
  - [x] **P2.T4.1:** Compare digests of assets not intentionally re-authored — must be byte-identical
  - [x] **P2.T4.2:** Run `pnpm verify` and scoped coverage; confirm the 80% gate and no new dependencies

<!--
The primary appends after acceptance:
**Result:** verified
**Checkpoint:** <short-sha>
**Evidence:** conductor/tracks/20261117-craft-application/verification/phase-2.md
-->

**Result:** verified
**Checkpoint:** 2b6a7d8
**Evidence:** conductor/tracks/20261117-craft-application/verification/phase-2.md
**Squash:** skipped — range 0a861690..HEAD contains primary-authored commit aba05a8 not reported by the phase subagent; task commits retained per skill 4.8.

## Phase 3: Gate decision and record

- **Depends on:** Phase 2
- **Covers:** FR-6, AC-4
- **Touches:** `conductor/tracks/20261117-craft-application/verification/gate-decision.md`
- **Verification:** `node scripts/rubric-report.mjs` plus inspection of `conductor/tracks/20261117-craft-application/verification/gate-decision.md`
- **Status:** verified

- [x] **P3.T1: Read recomputed verdict** — covers: FR-6
  - [x] **P3.T1.1:** Record mean, threshold, and floor failures from the `scores.json` verdict
- [x] **P3.T2: Decide and document** — covers: FR-6, AC-4
  - [x] **P3.T2.1:** If `pass`, record the quality win and close
  - [x] **P3.T2.2:** If `fail`, present the invest-vs-accept choice to the user and record the explicit decision with evidence — never force a pass

**Result:** verified
**Checkpoint:** d5b2da7
**Evidence:** conductor/tracks/20261117-craft-application/verification/gate-decision.md

## Phase R1: Review Fixes

- **Goal:** Resolve review findings F1 (stale test title) and F2 (stale generator header comment) from round 1; both are objective, local documentation-staleness nits.
- **Depends on:** Phase 3
- **Covers:** F1, F2
- **Touches:** `test/art/rubric.test.ts`, `test/art/diagnostic/chest/make-candidates.mjs`, `conductor/tracks/20261117-craft-application/verification/phase-R1.md`
- **Verification:** `pnpm verify` (1028 tests, build green); inspect both changed lines; no assertion or logic change.
- **Status:** pending

- [ ] **R1.T1: Rename the stale rubric.test.ts instrument test title (F1)** — covers: F1
  - [ ] **R1.T1.1:** Rename `records the frozen instrument and every required field` → `records the instrument of record and every required field`; change no assertion.
- [ ] **R1.T2: Correct the make-candidates.mjs header comment (F2)** — covers: F2
  - [ ] **R1.T2.1:** State the script reads hue-ramp candidate `chest-H` and derives L/E/C; remove the false "baseline" claim.

