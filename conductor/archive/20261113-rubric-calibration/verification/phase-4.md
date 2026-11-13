# Phase 4 — Run and Record: verification

**Date:** 2026-11-13
**Covers:** FR-6, FR-9, AC-3, AC-5, AC-8, AC-9, AC-10
**Result:** verified, with **AC-4 missed** (3 of 6 criteria separate, not 4)

## Calibrated result

Model `gemini-3.5-flash-lite`, base asset `test/art/chest/chest.px.json`, two
passes per variant, 52 calls across two rounds plus one re-score.

| criterion | low A/B | high A/B | Δ | verdict | 4-anchor |
| --- | --- | --- | --- | --- | --- |
| `silhouette` | 1/1 | 5/5 | 4.00 | separates | yes |
| `value_separation` | 3/3 | 4/4 | 1.00 | ambiguous | yes |
| `lighting` | 1/1 | 3/3 | 2.00 | separates | no |
| `edge_language` | 3/3 | 3/3 | 0.00 | ambiguous | no |
| `cluster_discipline` | 1/1 | 4/4 | 3.00 | separates | yes |
| `palette_craft` | 2/1 | 3/3 | 1.50 | ambiguous | no |

- AC-3 — a verdict for all six criteria: met.
- AC-4 — ≥ 4 of 6 separate, lighting among them: **missed**, 3 of 6.
- AC-5 — a 4-anchor finding per criterion, repeated in the document: met, and the
  answer is `no` for lighting, edge language and palette craft.
- AC-8, AC-9, AC-10: met (`pnpm verify` exit 0; no `test/art` change; no
  `conductor/archive` change).

## What the numbers mean

The judge separates the bottom of the scale and not the top. Gross destruction —
an unidentifiable blob, an unlit surface, single-pixel confetti — each drop to 1.
Subtler property removal does not move it: a chest with values collapsed but hues
intact, one with reasonless outline switching, and one with warring hues all still
scored 3, and the rationales for the outline-free chest described outlines that
were not there.

Three criteria never exceeded 3 on any variant, so the 3.5 floor is out of reach
for them, and a target vector built from demonstrated ceilings sums to 22.0 — a
mean of 3.67 against a 4.0 gate.

## Stimulus history

- **v1** (mild): desaturated chest for palette, outline-stripped chest for edge,
  light confetti for cluster. Scored 3–4 and produced no separation beyond
  silhouette and lighting. Kept at `.conductor/evidence/calibration/v1/` and
  reported as a stimulus defect, not as a verdict on the criteria.
- **v2** (current): reasonless edge switching, 1 px checkerboard confetti, hue
  warping drawn from the wrong families. Cluster discipline then separated 1
  against 4; palette and edge still did not.

## Decision rule

Spec A2 and the acceptance decision rule say a criterion without a 4-anchor is
reported and the gate is not adjusted. Three criteria are in that state, so:

- the documented gate stays at 4.0 and is labelled `unreachable`;
- AC-20's status is recorded as unmet and unmeetable as written;
- changing the gate is an owner decision, and this section plus the report is the
  evidence for it.

No threshold, target or score was changed to make a criterion pass.

## Owner decision (after Phase 4)

The gate was split into two tiers on this evidence, recorded as spec amendment A3:

| tier | mean | per-criterion floor | status |
| --- | --- | --- | --- |
| publishable | 3.5 | 3.0 | reachable (targets sum to 22.0) |
| exceptional | 4.0 | 3.5 | unreachable (ceiling 3.67) |

`test/unit/calibration/gate.test.ts` was extended to both tiers: the publishable
tier must be arithmetically reachable with every target clearing its floor, and
the exceptional tier must either be reachable or declared unreachable with dated
evidence. Three tests pass; `pnpm verify` exits 0 with 861 tests.

The current record meets neither tier: its mean is 3.69, but humanoid pass B
scores cluster discipline 1, below the publishable floor of 3.
