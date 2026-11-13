# Lighting Recovery

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)

**Type:** `feature`
**Priority:** `high`
**Branch:** `feat/20261113-lighting-recovery`
**Depends on:** none outstanding — `derive`, `light` and the rubric tooling are
merged on `main`

## Why this track exists

The 2026-11-13 redraw made the assets structurally cleaner and scored **3.69**
against 4.0: `cluster_discipline` 4.57 and `silhouette` 4.86 are already strong,
while `lighting` 2.79, `edge_language` 3.14, `palette_craft` 3.21 and
`value_separation` 3.57 carry 40 of 84 judgements at or below 3.

The scorer's own reasoning names the causes: flat shading (12 mentions),
indistinguishable interior detail edges (12), ramps without hue shift (10),
adjacent values merging (10), and the scene's roof "split arbitrarily down the
middle" (3). All of them are authoring problems against capabilities that already
exist, so this track adds no engine feature and changes no threshold.

## Artifacts

- `verification/` — phase evidence, created during implementation
- `review.md` — created by `conductor-review`
- `pr.md` — created by `conductor-implement` before opening a PR
