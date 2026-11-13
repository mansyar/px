# Rubric View Comparison

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)

**Type:** `feature`
**Priority:** `high`
**Branch:** `feat/20261113-rubric-view-comparison`
**Depends on:** none outstanding

## Why this track exists

The rubric's anchors are written "at 1×", but the judge never scores a 1×
artifact: pass A is the 8× upscale and pass B the debug sheet, because one 16 px
potion scored 2.67 at 1× in the first round.

Two dry runs at 48 px showed no such penalty. This track tests whether the blanket
refusal should become a size threshold, using a decision rule fixed before the
first call: two assets (chest 48 px, humanoid 32 px), three views, two repeats, and
a verdict the harness computes rather than a human.

If 1× is accepted for assets ≥ 32 px, pass A starts scoring the artifact at the
size the sprite is played at; if not, the existing rule is retained with the
measurement behind it.

## Artifacts

- `verification/views/` — artifact registry with hashes, and the committed report
- `verification/` — phase evidence, created during implementation
- `review.md` — created by the review
