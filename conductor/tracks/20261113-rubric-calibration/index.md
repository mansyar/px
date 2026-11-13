# Rubric Calibration

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)

**Type:** `feature`
**Priority:** `high`
**Branch:** `feat/20261113-rubric-calibration`
**Depends on:** none outstanding

## Why this track exists

The definition of done has two defects that four art tracks have run into without
naming.

The arithmetic cannot close: the documented per-criterion targets (lighting 3.5,
edge 3.5, palette 3.6, value 3.7) with the measured silhouette 4.79 and cluster
discipline 4.07 average **3.875**, so an asset can hit every target and still fail
the 4.0 mean.

The top of the scale is unevidenced: a three-variant calibration on the chest
scored lighting **1 (flat), 3 (hand-painted), 3 (engine `light`)**. The instrument
separates unshaded from shaded, then both real methods stop at "shaded but not
convincing" — and no recorded artifact shows what a 4 or 5 looks like to it.

This track builds a reproducible calibration harness, records what each criterion
can actually separate, fixes the target arithmetic with a test that enforces it,
and rewrites the acceptance definition — forward only, without re-scoring the past
and without lowering the bar.

## Artifacts

- `verification/` — phase evidence, created during implementation
- `review.md` — created by `conductor-review`
- `pr.md` — created by `conductor-implement` before opening a PR
