# Authoring Primitives

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)

**Type:** feature
**Priority:** high
**Branch:** feat/20261113-authoring-primitives
**Depends on:** 20261113-static-art-quality (merged)

Closes the three authoring gaps that left the previous track's AC-20 at 3.79 against a 4.0 bar: per-part `facing` for plane shading, a `stroke` op that cleans its own steps, and a cluster-aware `texture` pass — then re-authors and re-scores the same seven assets on the same rubric.

## Artifacts

- `verification/` — created when the first phase produces evidence
- `review.md` — created by `conductor-review`
- `pr.md` — created by `conductor-implement` before the PR
