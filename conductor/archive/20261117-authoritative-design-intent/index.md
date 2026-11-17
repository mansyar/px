# Authoritative Design Intent

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)

**Type:** `feature`
**Priority:** `high`
**Branch:** `feat/20261117-authoritative-design-intent`
**Depends on:** `none`

An intent layer above geometry: a versioned `design` block and project style file
become authoritative defaults for the shading passes, so an agent plans a picture
before it places pixels. `px brief` scaffolds the plan, `blockout` and `--values`
let it judge masses first, and `px critique`/`px fix` turn whole-image feedback
into applyable calls. Re-authored assets are scored with the unchanged rubric.

## Artifacts

- `verification/` — phase evidence, created during implementation
- `review.md` — created by `conductor-review`
- `pr.md` — created by `conductor-implement` before opening a PR
