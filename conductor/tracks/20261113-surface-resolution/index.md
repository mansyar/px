# Surface Resolution

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)

**Type:** `feature`
**Priority:** `high`
**Branch:** `feat/20261113-surface-resolution`
**Depends on:** `20261113-surface-fidelity` (not merged — branched from its head
`316568a`; its engine work is a prerequisite)

## Why this track exists

`20261113-surface-fidelity` missed its bar: **3.73** against 4.0, with `lighting`
3.14 and `edge_language` 3.36. `silhouette` at 4.64 showed the drawing is sound,
so the shortfall is concentrated in three surfaces the engine cannot express:

1. `light` places one band per occupied rank, so a wide shallow mass is flat.
2. `auto_outline` has no interior edge role, so detail edges blur inside the
   silhouette.
3. A four-tone ramp has no tone between `base` and `highlight`, so palette craft
   is capped by resolution.

This track adds those three capabilities, gates them at schema `"1.3"`, re-authors
the six assets below 4.0, and re-scores on the same independent instrument.

## Artifacts

- `verification/` — phase evidence, created during implementation
- `review.md` — created by `conductor-review`
- `pr.md` — created by `conductor-implement` before opening a PR
