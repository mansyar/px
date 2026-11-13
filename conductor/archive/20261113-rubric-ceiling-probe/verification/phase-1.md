# Phase 1 — Candidates and Pre-registration: verification

**Date:** 2026-11-13
**Covers:** FR-1, FR-2, AC-1
**Command:** `node scripts/calibrate/ceiling.mjs`

## Result: verified

Nine candidates, three per criterion, registered with a sha256 per recipe in
`verification/ceiling/candidates.json` **before any scoring call**. Each is
rendered to a 1× PNG, an 8× nearest-neighbour upscale and a debug sheet.
`git diff --stat test/art` is empty.

| criterion | candidate | sha256 (first 12) | treatment |
| --- | --- | --- | --- |
| lighting | `warm-cool` | `f7b7a4843a4d` | directional ramp + warm highlights, cool shadows |
| lighting | `dither-band` | `b3635f740369` | directional ramp + checkerboard across band edges |
| lighting | `engine-deband` | `0b7158c9599f` | `ramp_fill` three bands + engine `deband` |
| edge language | `selective` | `d70a50d731c9` | rim tone chosen by which neighbour is empty |
| edge language | `hue-shift` | `88a0c263a9e0` | outline colour is navy, not ink |
| edge language | `hierarchy` | `0e92a92e684c` | interior outline tones lifted to mid |
| palette craft | `hue-ramp` | `d35fbbf460fe` | ramps move toward yellow up and blue down |
| palette craft | `accent` | `9462bf923c2b` | desaturated materials, saturated lock |
| palette craft | `nonlinear` | `632364b08f6c` | ramp steps weighted to the darks |

## Defects found before any call was spent

1. `form-ao` originally replaced the derived ramps with explicit ones. The `light`
   op resolves ramp *roles*, which a `t0..t4`-only family does not carry, so it
   rendered black chunks and a checkerboard artefact instead of AO. Replaced with
   `engine-deband`, which keeps the derived roles.
2. `ramp_fill` rejected four bands (`E_BANDS_RANGE`): a family supplies three
   shading roles, so 3 is the maximum. The candidate now uses three bands plus
   `deband`.
3. The first hue math rotated hue by a fixed amount, which turned a cyan band
   green. It now moves *toward* a target hue along the shorter arc, which is what
   "cool shadows, warm highlights" means for a material that is already blue.

## Judgement checks (visual, at 8×)

- `warm-cool` reads as one light with warm top faces and cool shadow faces.
- `dither-band` shows a mixed checker at each band edge rather than a hard step.
- `engine-deband` shows the engine's own dithered transition.
- `selective` has light top rims and dark lower rims.
- `hue-shift` keeps black out of the outline; `hierarchy` lifts interior lines.
- `hue-ramp`, `accent` and `nonlinear` are visibly different palettes of the same
  drawing, so a palette judgement has something to distinguish.
