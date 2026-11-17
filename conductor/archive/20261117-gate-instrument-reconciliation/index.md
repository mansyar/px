# Gate and Instrument Reconciliation

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)

**Type:** chore
**Priority:** high
**Branch:** chore/20261117-gate-instrument-reconciliation
**Depends on:** none

This track settles the quality contract rather than adding drawing capability. It binds the already-documented publishable tier as the shipping gate, freezes one Gemini scoring instrument, re-scores the seven current v2 assets with both faithful views, preserves prior records as provenance, and publishes an honest baseline.

## Artifacts

- `verification/` — created during implementation with `baseline.md` and `integrated.md`.
- `review.md` — created by conductor-review.
- `pr.md` — created by conductor-implement before the PR.
