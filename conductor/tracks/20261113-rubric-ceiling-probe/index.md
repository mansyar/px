# Rubric Ceiling Probe

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)

**Type:** `feature`
**Priority:** `high`
**Branch:** `feat/20261113-rubric-ceiling-probe`
**Depends on:** none outstanding

## Why this track exists

The calibration in PR #8 measured what *removing* a property costs, and found that
lighting, edge language and palette craft never exceed 3. It never asked what a 4
or 5 would look like to the judge — so the exceptional tier rests on an assertion.

This track fixes nine deliberate attempts at the top of the scale, three per
criterion, hashes them before spending a call, and reports what happened. If one
reaches 4, the route is known. If none does, the ceiling belongs to the instrument
rather than the art — a stronger claim than "we could not do it", and only credible
because the candidates were registered in advance.

## Artifacts

- `verification/ceiling/` — candidate registry with hashes, and the committed report
- `verification/` — phase evidence, created during implementation
- `review.md` — created by the review
- `pr.md` — created before opening a PR
