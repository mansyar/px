# Phase 6 — Re-authoring and Independent Score

- **Track:** `20261113-surface-fidelity` — Surface Fidelity
- **Phase:** 6 — Re-authoring and Independent Score
- **Date:** 2026-11-13
- **Branch:** `feat/20261113-surface-fidelity`
- **Base:** `0f05eeb` (Phase 5 accepted)

## Result

**failed — the score bar was not met.** Mean **3.73** against a 4.0 bar, with one
below-floor score (`scene` pass A, `lighting` 2). Per P6.T4.3 the failure is
recorded and the bar is unchanged; nothing was re-scored to fit.

## Art changes (committed)

| Commit | Change |
| --- | --- |
| `ad59ffc` | Gable split into `roof_left` / `roof_right` facing planes plus a `ridge` part with its own tone, painted after `light` |
| `961da5b` | Wall masonry detail blits replaced with part-clipped `brick` / `stipple` / `hatch` courses |
| `6b4510b` | Character, humanoid and sword re-lit with `light form: "round"` |

Every changed asset renders `--strict` clean, its digest is re-baselined, and the
reason is written in that asset's design file (AC-16). `test/art/assets.test.ts`
passes 28 checks; the seven pre-track digests that did not move still match.

## Score

| | Baseline (Phase 1) | After Phase 6 |
| --- | --- | --- |
| Mean | 3.69 | **3.73** |
| Below floor | humanoid A, scene A (`lighting` 2) | scene A (`lighting` 2) |
| Passes | 14 independent | 14 independent |
| Model | `gemini-3.5-flash-lite` | `gemini-3.5-flash-lite` |

Humanoid pass A moved from `lighting` 2 to 3, which is the round-band change
working. The scene did not move: its plain 8x view still reads as flat-lit, and
the gable and wall work did not pay off on the instrument.

## Why the bar was missed

- The scene's lighting is the whole failure. Phase 3 established that `form:
  "round"` bands by thickness, but the scene's largest masses (wall drum, apron)
  are wide and shallow, so their bands are one band wide and read as a flat fill.
  Fixing it needs either more bands per part or an authored ramp the instrument
  can see — engine work this phase did not attempt.
- Wall courses improved structure and thin clusters, not light.
- The character's change was largely invisible at 8x: `bevel` and `round` agree
  on its narrow limbs.

## What is honestly not done from the phase plan

- **P6.T2.1** asked for 2×2 form shading replacing a 1 px dither. The character
  had no dither op to remove; the change was the light form switch. That is a
  scope reduction, recorded here rather than claimed as the requirement.
- **P6.T2.2** asked for one outline treatment via `corner`/`cap`. The character's
  outline is `auto_outline`, with no authored stroke to give a corner or cap, so
  the controls did not apply. The treatment was already uniform.
- **P6.T1.1** replaced the masonry *detail* with texture courses; the wall
  silhouette is still one ascii blit. The wall is not fully "rebuilt from
  geometry" as FR-17 words it.

## Commands

| Check | Exit | Result |
| --- | --- | --- |
| `render --strict` (scene, character, humanoid, sword) | 0 | clean |
| `pnpm vitest run test/art/assets.test.ts` | 0 | 28 passed |
| `pnpm vitest run test/art/rubric.test.ts` | 0 | 10 passed, verdict recomputed |
| `pnpm verify` | 0 | pass |

## Follow-up required

AC-15 is not satisfied and the track cannot be called complete. The candidates for
a follow-up track, in order of expected effect on `lighting`:

1. Band density: let `form: "round"` place more than three bands on wide parts.
2. Scene-specific light: author the drum's ramp explicitly after the pass, the way
   the gable now is.
3. Reconsider the instrument's view for wide assets, since the debug sheet scores
   the same art 1 point higher and the plain 8x view may be penalising scale.
