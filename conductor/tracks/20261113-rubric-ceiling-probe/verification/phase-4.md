# Phase 4 — Docs and Checks: verification

**Date:** 2026-11-13
**Covers:** FR-7, FR-8, AC-5, AC-7, AC-8
**Result:** verified

## Document changes

`docs/rubric.md` gained a **Ceiling probes** section before Acceptance:

- the nine-candidate table with treatment and target scores per pass;
- the three verdicts;
- the three conclusions — palette craft has a demonstrated 4-anchor, lighting is
  one point away, edge language is capped at 3 for this drawing;
- the path to the committed report.

One target changed on the strength of the probe: `palette_craft` moved from 3.0 to
4.0, because `hue-ramp` reached 4 on both passes. The target vector still sums to
23.0, so the publishable tier remains reachable (21.0 required) and the exceptional
tier remains documented as unreachable (24.0 required).

## Acceptance

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC-1 | nine candidates hashed before the first call; hash verified at scoring time | `candidates.json`; tampered-recipe abort | covered |
| AC-2 | eighteen scores, two passes per candidate | 18 calls + 2-call re-score | covered |
| AC-3 | all nine reported with both passes and rationales | `probe.md` | covered |
| AC-4 | a verdict per criterion | `probe.md`, three verdicts | covered |
| AC-5 | docs repeat the verdicts and quote the judge | `docs/rubric.md`, Ceiling probes | covered |
| AC-6 | `test/art/scores.json` byte-identical | `git diff` 0 lines | covered |
| AC-7 | no `test/art`, archive or gate-tier change | diffs empty; tiers unchanged in intent | covered |
| AC-8 | `pnpm verify` exit 0 | 861 tests, typecheck, lint, build | covered |

## Checks

`pnpm verify` exit 0 — 95 test files, 861 tests. The gate arithmetic test passes
with the updated palette target (sum 23.0, publishable 21.0, exceptional 24.0).
