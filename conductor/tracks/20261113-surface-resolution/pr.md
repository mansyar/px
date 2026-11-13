## Summary

Closes the three engine gaps that `20261113-surface-fidelity` identified as the
ceiling on `lighting`, `edge_language` and `palette_craft`:

- **`light` bands**: `bands: 2|3|4` with `band_scale: "thickness" | "uniform"`, so a
  wide shallow mass can carry more than one interior band. Absent keeps the
  historical three, byte for byte.
- **`light` part selection**: `parts` / `skip`, mutually exclusive, so an authored
  tone survives the pass without reordering ops. The scene's gable now states its
  exemption instead of relying on op order (identical digest).
- **`auto_outline` seam**: an interior edge tone written once per boundary, on the
  later part, never over a one-pixel part, with ownership untouched.
- **Tone-valued ramp roles**: `base: "t3"` on a 2–8 tone ramp, resolved at
  normalize time.
- **Schema 1.3**: every new option is refused below 1.3 with a message naming the
  version. The gate is ordered, so 1.2 features keep working in 1.3 documents.

## Score — the bar is not met

Fourteen independent `gemini-3.5-flash-lite` passes: **3.71** against 4.0, with
`scene` pass A `cluster_discipline` 2. This is inside noise of the previous track's
3.73, and `lighting` did not move on any asset.

The honest reading, recorded in `verification/phase-5.md`: the engine gaps were
real and are now closed, but closing them did not raise the score. A follow-up
experiment (hand-banding the scene wall with `ao: false`) rendered clean and still
scored `lighting` 3, so the remaining shortfall is not simply "the art hasn't used
the engine yet".

## Verification

- `pnpm verify` exit 0 (typecheck, biome, tests, build)
- `pnpm vitest run test/art/assets.test.ts` — 28 passed, all seven digests rebaselined with reasons
- `pnpm vitest run test/art/rubric.test.ts` — 10 passed, verdict recomputed
- 22 new tests: bands 6, part selection 4, seam 4, 1.3 gate 8

## Review

`review.md` — **changes requested**: H1 (AC-8 unmet), H2 (AC-9 unmet), M1 (scene
lighting not addressed), M2 (dead 1.2 validation loop), L1/L2 documented
deviations. Merge decision is explicitly left to the owner.

## Stacking

Base is `feat/20261113-surface-fidelity` (unmerged, also reviewed with a failed
score). This PR cannot land before that one, or must be retargeted to `main` after
it merges.

🤖 Generated with [Codebuff](https://codebuff.com)
