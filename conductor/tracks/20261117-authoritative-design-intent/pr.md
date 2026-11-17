## Summary

This track adds an authoritative **design intent** layer above the raster primitives. A 1.2 recipe can now declare what a picture is meant to be — subject, light, hierarchy, per-part values, edge treatment and materials — and the passes, brief, critique and fix verbs all read from it. The agent can plan a subject locally, judge masses and values before detail, ask for a ranked whole-image gap report, and apply a concrete fix without counting pixels.

The quality gate is **not met** and this PR says so plainly. The seven re-authored assets have not been scored above the previous bar: measured mean **3.39** against 4.0 with eight scores below the floor. The instrument, anchors, views and bar are unchanged, the prior record is preserved byte-for-byte, and the result is recorded in `test/art/scores.json` and `verification/phase-6-scoring.md`. No score was revised or rerolled.

## Track

- **ID:** `20261117-authoritative-design-intent`
- **Type:** `feature`
- **Spec:** [`conductor/archive/20261117-authoritative-design-intent/spec.md`](conductor/archive/20261117-authoritative-design-intent/spec.md)
- **Plan:** [`conductor/archive/20261117-authoritative-design-intent/plan.md`](conductor/archive/20261117-authoritative-design-intent/plan.md)
- **Review:** [`conductor/archive/20261117-authoritative-design-intent/review.md`](conductor/archive/20261117-authoritative-design-intent/review.md)

## What happened

| Phase | Goal | Result | Checkpoint | Notes |
| --- | --- | --- | --- | --- |
| 1: Intent Schema and Compatibility | 1.2 recipe declares `design`, inherits a style, round-trips, is authorable, and leaves legacy bytes untouched | verified | `27d7a2a` | Design rejected with `E_BAD_VERSION` below 1.2; no silent promotion |
| 2: Intent-Driven Passes | Declared design drives light, edges, values and harmonize, with overrides reported | verified | `57a246f` | Deviations are emitted only when declared ≠ actual; harmonize writes tones only |
| 3: Brief and Blockout | Plan a subject locally and judge masses and values without writing | verified | `758fa53` | `px brief` and the render views write nothing; ninth MCP tool |
| 4: Critique and Fix | Whole-image gaps become ranked, applyable fixes | verified | `b90cd20` | Fixes are complete ops; `E_FIX_STALE`/`W_FIX_NOOP`; eleventh MCP tool |
| 5: Re-authoring the Seven Assets | Seven fresh v2 assets carry design blocks and project style | verified | `bc25828` | Originals and their digests untouched; hero-first hierarchies pinned |
| 6: Re-scoring, Budget and Evidence | Same-rubric re-score and budgets | delivered; AC-14 failed | `c888977` | 121.4 ms median; honest mean 3.39 recorded |
| R1: Review Fixes | Close the coverage-scope High and rationale Low | verified | `7bc868d` | New modules measured by an unlowered gate |

## Requirements

- [x] `FR-1` — design block with subject, light, hierarchy, values, edges, materials and style (`test/design/schema.test.ts`)
- [x] `FR-3` — `px.style.json` inheritance with `@project` (`test/design/style.test.ts`)
- [x] `FR-5`/`FR-6`/`FR-7` — design drives light angle, edge classes and value targets (`test/intent-passes/`)
- [x] `FR-8` — `harmonize` rewrites tones only (`test/intent-passes/harmonize.test.ts`)
- [x] `FR-9`/`FR-10` — local `px brief` and no-write views (`test/brief/`)
- [x] `FR-11`/`FR-12` — ranked gap report and stale-checked `px fix` (`test/critique/`)
- [x] `FR-14` — same-commit MCP parity with bidirectional reachability (`test/mcp/reachability.test.ts`)
- [x] `FR-18` — seven v2 assets as new files (`test/art/assets-v2.test.ts`)
- [x] `FR-19`/`FR-20` — unchanged rubric and an honest verdict record (`test/art/rubric.test.ts`)
- [ ] `AC-14` — measured mean ≥ 4.0 with no criterion below 3. **Failed:** 3.39, eight sub-floor scores.

## Verification

| Layer | Command | Result | Evidence |
| --- | --- | --- | --- |
| unit + integration + smoke | `pnpm verify` | pass — 119 files / 1024 tests, typecheck, Biome, build | `verification/integrated.md` |
| coverage | `pnpm vitest run --coverage` | pass — 95.09% statements, 85.89% branches on the enlarged include list | `verification/phase-R1.md` |
| determinism | `pnpm vitest run --project goldens --project smoke` | pass — 11 tests, hero and all digests unchanged | `verification/integrated.md` |
| score record | `pnpm vitest run test/art/rubric.test.ts` | pass — 10/10; verdict recomputed from the scores | `verification/phase-6-scoring.md` |
| performance | `pnpm vitest run --project benchmarks` | pass — 121.4 ms median at 256×256 with 2,000 ops plus light and harmonize | `verification/phase-6.md` |

## Media

Captured at `48bd269`, the final branch head before the PR. These are the engine's own debug sheets for the v2 assets: panel A at profile zoom, panel B at game size, panel C silhouette, with part crops below.

![v2 prop debug sheet](https://github.com/user-attachments/assets/d318ff40-8814-4003-8a7d-03b79e105e04)

![v2 character debug sheet](https://github.com/user-attachments/assets/cc86c372-074e-42d2-83f4-2c014ce4f14c)

## Review

- **Verdict:** `PASS`
- **Rounds:** 2
- **Fixed:** 2 findings (one High coverage-scope, one Low rationale mismatch)
- **Accepted/deferred:** 1 product criterion — AC-14 failed by directive, recorded honestly; a follow-on track owns it.

## Deviations and risks

- The executor cannot call `node` directly and generated equivalent scoring artifacts through the real `runCli` renderer in a Vitest harness; byte identity with `scripts/upscale.mjs` was asserted for all seven 8× views. Disclosed in `verification/scoring-inputs.md`.
- `test/art/v2-generate.probe.test.ts` was renamed to `test/art/style-contract.test.ts` by the primary because the executor's shell denies `git mv`; content is a legitimate read-only style-contract test.
- `docs/rubric.md` already calibrates 4.0 as an exceptional tier above the publishable target. AC-14 uses it anyway as a deliberately hard criterion; the miss is a product result, not a paperwork failure.
- Another vision instrument produced this record than the pre-track record. The 3.69 → 3.39 movement is not evidence of regression; it is evidence that the gate cannot adjudicate a 0.21 margin.

## Follow-ups

- A follow-on track should address the measured capability gaps: one consistent light direction at 1×, interior value separation, and palette craft. The intent layer now supplies the data and feedback needed to do that.

## Rollback

```bash
# Merge commit (filled after merge)
git revert --no-edit -m 1 <merge-commit>
```

No data migration, feature flag or external state. Legacy 1.0 and 1.1 recipes render byte-identically; 1.2 design blocks are additive and rejected by older recipe versions.
