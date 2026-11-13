# Review: Authoring Primitives

- **Track:** `20261113-authoring-primitives`
- **Type:** `feature`
- **Branch:** `feat/20261113-authoring-primitives`
- **Range:** `f0850a2..4e1e0ab`
- **Date:** `2026-11-13`
- **Verdict:** `BLOCK`

## Summary

The engine work is in good shape: three primitives, a debug-sheet surface for them, and a
compatibility proof, with every configured check green and no unreported scope creep. The
track nonetheless blocks on its headline criterion: AC-14 measures the seven re-authored
assets at a mean of **3.90** against a 4.0 bar, so the goal this track exists for is not
met. The remaining findings are about how the track records that result — a stale provenance
field, a rubric document that describes a record shape the repository does not use, and a
spec whose scoring requirements name a vision model while the track scored eight of its
fourteen passes by agent self-review. None of those are cosmetic: they decide whether the
next reader trusts the 3.90.

Per the owner's instruction the findings are recorded here for a follow-up track rather than
fixed inside this one; no `Phase R1` was appended, because the blocking finding is art work
that cannot be done in a track already failed on it.

**Method note:** no read-only reviewer subagent is available on this host, so the primary
performed the review. That weakens the independence this step is meant to provide, and it is
recorded rather than glossed.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| test | `pnpm test` | pass — 88 files / 830 tests | `.conductor/evidence/rv-test.log` |
| coverage | `pnpm vitest run --coverage` | pass — 95.79 / 87.21 / 98.33 / 95.60, gate 80 | `.conductor/evidence/rv-cov.log` |
| lint | `pnpm biome check .` | pass — 172 files, no fixes applied | `.conductor/evidence/rv-lint.log` |
| typecheck | `pnpm exec tsc --noEmit` | pass | `.conductor/evidence/rv-tsc.log` |
| build | `pnpm exec tsc -p tsconfig.build.json` | pass | `.conductor/evidence/rv-build.log` |

Volume: **48 files, 4338 insertions, 311 deletions** outside `conductor/` — large, so each
phase checkpoint was read against its phase contract and then checked as a whole.

## Requirements

| ID | Implemented by | Verified by | Status |
| --- | --- | --- | --- |
| FR-1–FR-4 | P1 (facing) | `test/facing/plane.test.ts`, `schema.test.ts`; `verification/phase-1.md` | covered |
| FR-5–FR-8 | P2 (stroke) | `test/stroke/{path,cleanup,options}.test.ts` | covered |
| FR-9–FR-13 | P3 (texture) | `test/texture/{patterns,floor,surface}.test.ts` | covered |
| FR-14 | P4 | `test/feedback/sheet.test.ts` — plane dashes, facing pairs, texture gauge | covered |
| FR-15 | P2–P4 | `test/feedback/compat.test.ts` — potion + three benchmark digests, all-primitives round trip | covered |
| FR-16 | P5 | `verification/phase-5.md`, four design notes, four re-baselined digests, `px diff` table | covered |
| FR-17 | P6 | `test/art/scores.json` 14 passes — **mean 3.90** | **partial** |
| NFR-1 | throughout | hero golden and potion/sword/humanoid/chest benchmark digests unchanged; determinism suite | covered |
| NFR-2 | throughout | `package.json` has one runtime dependency (`@modelcontextprotocol/sdk` 1.32.2) | covered |
| NFR-3 | throughout | coverage gate unchanged at 80, new modules in the numerator | covered |
| NFR-4 | P3, P4 | texture report is counts + lattice, empty `coords`; sheet notes bounded | covered |
| NFR-5 | throughout | `grep -rn rubric src/` is empty; no network import | covered |
| NFR-6 | throughout | Node `>=24 <25`, ESM, strict TS, no new build step | covered |
| NFR-7 | P6.T2 | `test/benchmarks/performance.test.ts` | covered |
| AC-1–AC-4 | P1 | `test/facing/*` | covered |
| AC-5–AC-8 | P2 | `test/stroke/*` | covered |
| AC-9–AC-11 | P3 | `test/texture/*` | covered |
| AC-12 | P4.T2 | `compat.test.ts` — committed digest re-rendered twice, round trip byte-identical | covered |
| AC-13 | P5 | `px diff` vs `6b36e86`: humanoid 112 px/19×29, sword 25 px/12×12, character 176 px/27×90, scene 4868 px/161×82 — bounded, not whole-canvas | covered |
| AC-14 | P6 | `scores.json` — mean **3.90**, no criterion below 3, verdict recomputed by `test/art/rubric.test.ts` | **missing** |
| AC-15 | P6.T2 | performance test | covered |
| AC-16 | throughout | coverage gate | covered |

## Findings

### Critical

- none

### High

- **F1 — AC-14 is not met: the re-authored assets score 3.90 against a 4.0 bar**
  - **File:** `test/art/scores.json` (`verdict.mean`), `verification/phase-6.md`
  - **What:** fourteen passes are recorded and no criterion sits below the floor, but the mean misses the bar by 0.10. Twenty-one of the eighty-four scores are 3s, spread across eleven of the fourteen passes: scene `cluster_discipline` 3 on both passes (plus `value_separation`/`palette_craft` 3 on the plain view); character five 3s on the plain view (`silhouette`, `value_separation`, `lighting`, `edge_language`, `palette_craft`); humanoid `lighting` and `edge_language` 3 on both passes; sword `lighting` 3 on both; and pre-existing 3s on potion (`edge_language`, plain view) and chest (`lighting`, sheet view).
  - **Why:** AC-14 is the track's headline criterion and the spec says explicitly that it can fail the track. Nothing else in this review matters as much as this number.
  - **Fix:** authoring, not bookkeeping — rebuild the scene's wall on geometry the way its roof was (`7af131a`: polygon courses, stroke joint grid, derived bevel), replace the character's dither with 2×2 shading, and even the ramp steps where `palette_craft` is 3. Re-score afterwards with the same instrument.
  - **Requirement:** AC-14, FR-17
  - **Test gap:** none; the record and its integrity test exist. The gap is the artifact.

### Medium

- **F2 — `scores.json.scored_by` still claims the whole record is vision-model scoring**
  - **File:** `test/art/scores.json:4`
  - **What:** the field reads "vision model via the agent-vision tool, two passes per asset on faithful nearest-neighbour views", while eight of the fourteen passes are `scorer: "agent"` self-reviews. The per-pass labels and `verdict.basis`/`caveat` are correct; the top-level string contradicts them.
  - **Why:** provenance is the first thing a reader checks on a borderline result, and a stale summary is exactly how a self-assessed 3.90 gets mistaken for an independent one.
  - **Fix:** rewrite the field to describe the mixed basis and point at `verdict.basis` and `verdict.caveat` instead of asserting a single instrument.
  - **Requirement:** FR-17, AC-14
  - **Test gap:** the integrity test checks per-pass `scorer` but not that the summary agrees with them; add that assertion.

- **F3 — `docs/rubric.md` documents a record shape the repository does not use**
  - **File:** `docs/rubric.md:133`
  - **What:** the "Record shape" example is `{"v": 1, "assets": {"potion": {"passes": [{"pass": 1, "model": …, "criteria": {"silhouette": {"score", "rationale"}}}}]}}`; the committed record is `{"schema": 3, "assets": [{"asset", "passes": [{"pass", "scorer", "self_review", "scores": {… "why"}}]}]}` with a top-level verdict.
  - **Why:** the document now has two paths and a shape that matches neither; the next agent writing a pass from it produces a record the integrity test rejects.
  - **Fix:** replace the example with the schema-3 array form, including `scorer`, `self_review`, `basis` and `caveat`.
  - **Requirement:** FR-17
  - **Test gap:** none — docs, not code.

- **F4 — the spec's scoring requirement names a vision model; the track scored itself**
  - **File:** `conductor/tracks/20261113-authoring-primitives/spec.md` (FR-17, AC-14, Open Questions)
  - **What:** FR-17 and AC-14 ask for "two passes each" from the rubric instrument, and the open questions price instrument noise for a model. Eight passes were produced by the implementing agent under `docs/rubric.md`'s agent path, which the owner approved, but the spec carries no amendment recording the substitution or its limits.
  - **Why:** a criterion measured by the author is weaker evidence than one measured independently, and the spec is the document a later reader trusts. Right now the spec and the record disagree about what was measured.
  - **Fix:** add a dated amendment to the spec (do not renumber) stating the agent path, the number of self-scored passes, and that a fully independent record still needs `PX_RUBRIC_API_KEY`.
  - **Requirement:** FR-17, AC-14
  - **Test gap:** none.

### Low

- **F5 — the tracker reads greener than the track is.** `metadata.progress` is `phases_verified: 5, tasks_done: 52 / 52` while Phase 6 is `failed`; every Phase 6 task is ticked because it was executed, but a reader skimming progress sees no failure. Fix: keep the failed phase's tasks out of `tasks_done`, or record a separate `tasks_failed` count.
- **F6 — probe artifacts left behind.** `.conductor/evidence/` holds `texture-probe.ts`, `texture-probe2.ts`, `mask-probe.ts`, `scene-geom.ts`, `normalize.ts`, `stroke-probe.ts`, `stroke-cadence.ts`, and `.conductor/evidence/art/` holds `probe*.png`, `probe*.8x.png` and four `*-base.png` renders. All gitignored, none committed, but the next run has to tell them apart from real evidence. Fix: delete them.
- **F7 — Phase 4's diff leaves its `Touches`.** `src/core/parts.ts`, `src/core/ops/{texture,index,cleanup}.ts` and `vitest.config.ts` are outside Phase 4's declared set. The deviation is recorded in `verification/phase-4.md` with a reason and every change is additive, so this is accepted; noted so the next reader knows it was deliberate. Fix: none.

## Overrides

- none. F1 is unresolved and is not overridden; the track stays blocked.

## Plan compliance

- Phases 1–5 carry `Result`, `Checkpoint` and `Evidence`; Phase 6 carries `Result: failed` and its evidence.
- Every ticked task has an implementation: the primitives in `src/core/ops/`, the sheet in `src/render/debug/`, the compat suite in `test/feedback/`, the four asset redraws and digests in `test/art/`.
- No task was silently dropped. The one deviation from a phase's `Touches` is F7, recorded.
- Phase 6's tasks are ticked although the phase failed — see F5.
- The review-fix phase does not exist, deliberately: see Summary.

## Out of scope

- Making `VALUE_COLLISION` tolerate two adjacent parts of one material on different planes. The scene needed that to split its gable into `roof_l`/`roof_r` by `facing`, could not have it, and collapsed ownership to one part with a hand-set tone split instead. That is an engine-design change, not a fix for this track.
- Derived-ramp hue crossing between materials (already a known Low from the archived track); authors work around it with explicit ramps.

## Debt

Left to a follow-up track at the owner's instruction. Proposed issues, none filed:

| # | Severity | Title |
| --- | --- | --- |
| F1 | High | `[conductor] high: raise the seven-asset mean to 4.0` — wall geometry, character dither, even ramps |
| F2 | Medium | `[conductor] medium: scores.json scored_by contradicts the per-pass scorers` |
| F3 | Medium | `[conductor] medium: rubric record-shape example matches no committed record` |
| F4 | Medium | `[conductor] medium: spec must record the agent-path substitution for FR-17` |
| F5–F7 | Low | grouped: tracker counts, leftover probe artifacts, Phase 4 Touches note |

`review.issues.auto_create` is false and the owner asked for recording rather than filing, so
no GitHub issue was created.

## Doc sync

`pending` — no post-review sync was run because the review blocks and the track is not
proceeding to completion.

## History

| Round | Verdict | Critical | High | Medium | Low | Fixed |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | BLOCK | 0 | 1 | 3 | 3 | 0 |
