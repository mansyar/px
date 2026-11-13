# Phase 3 — Gate Arithmetic and Docs: verification

**Date:** 2026-11-13
**Covers:** FR-7, FR-8, AC-5, AC-6

## Result: verified, with one superseded sub-task (P3.T2.2)

`test/unit/calibration/gate.test.ts` parses the `## Target vector` section of
`docs/rubric.md`: the mean gate, the per-criterion floor, the gate status and the
evidence reference, plus one target row per criterion.

## The guard fails on the legacy vector

The legacy targets (silhouette 4.7, value 3.7, lighting 3.5, edge 3.5, cluster
4.5, palette 3.6) were added to the document first, and the test was run:

```
× states targets that can reach the mean gate
AssertionError: expected 23.5 to be greater than or equal to 23.999999999
```

That is the defect this track exists to catch, reproduced by the check rather than
described in prose.

## The targets cannot be rewritten to reach the gate

The calibration measured a ceiling of 3 for lighting, edge language and palette
craft. A target vector built from measured ceilings sums to 22.0 — a mean of 3.67
— so P3.T2.2 ("rewrite the target vector to sum to at least 24.0") cannot be done
honestly. It is marked superseded in the plan.

Instead the document declares `gate status: unreachable` with dated evidence, and
the test accepts that declaration only when:

- the arithmetic is genuinely short of the gate, and
- the evidence cell cites a dated artifact.

So the check has two failure modes — a silent unreachable vector with no
declaration, and a false `unreachable` label over targets that do add up.

```
✓ documents a target for every criterion
✓ states whether the gate is reachable, and proves it
Tests  2 passed (2)
```

## Document changes

- `## Target vector` — the legacy arithmetic error, the calibrated targets, the
  unreachable declaration and the pointer to the report.
- `## Calibration` — the method, the model, both rounds, the result table, the
  anchor findings and the forward-only note.
- `## Acceptance` — AC-20 rewritten to reference the documented gate and floor,
  and its status recorded as unmet and unmeetable as written.

## Checks

`pnpm verify` exit 0 — 95 test files, 860 tests, typecheck, lint and build.
The new test file needed a Biome format pass; it was reformatted rather than
excluded.
