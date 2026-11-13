# Phase 3 — Run and Record: verification

**Date:** 2026-11-13
**Covers:** FR-4, FR-5, AC-2, AC-3, AC-4
**Result:** verified — one criterion reached the ceiling

## Result

Model `gemini-3.5-flash-lite`, base asset `test/art/chest/chest.px.json`, nine
pre-registered candidates, two passes each.

| criterion | candidate | target A/B | reached |
| --- | --- | --- | --- |
| `lighting` | `warm-cool` | 4/3 | no |
| `lighting` | `dither-band` | 3/3 | no |
| `lighting` | `engine-deband` | 3/2 | no |
| `edge_language` | `selective` | 3/3 | no |
| `edge_language` | `hue-shift` | 3/3 | no |
| `edge_language` | `hierarchy` | 3/3 | no |
| `palette_craft` | `hue-ramp` | **4/4** | **yes** |
| `palette_craft` | `accent` | 3/4 | no |
| `palette_craft` | `nonlinear` | 3/3 | no |

Verdicts: `palette_craft` **ceiling reached** by `hue-ramp`; `lighting` and
`edge_language` not reached.

## What this establishes

- **Palette craft has a demonstrated 4-anchor.** `hue-ramp` — explicit ramps that
  move toward yellow on the light end and blue on the dark end — scored 4 on both
  passes, with rationales naming "well-chosen hues for each material". The
  calibration's "never above 3" was a property of its destructive stimuli, not a
  hard ceiling.
- **Lighting is one point away.** `warm-cool` scored 4 on the plain 8× view
  ("clearly defining the curved lid and flat front faces") and 3 on the debug
  sheet ("some shading on the metal straps… clashes slightly"). The top of the
  scale is reachable for lighting, but not stably under the two-pass rule.
- **Edge language appears capped at 3 for this drawing.** Three distinct
  treatments — selective rim tones, a navy outline, and a three-level hierarchy —
  all landed at 3/3, and each rationale describes the same reservation about
  interior detail edges blending into surfaces.

## Integrity notes

- One candidate pass (`edge_language/hue-shift` A) lost four replies to malformed
  output and was re-scored with `--only edge_language --candidate hue-shift
  --merge`, two calls, without changing the recipe or the threshold.
- No candidate was revised after a score was seen, and no candidate was dropped:
  the report lists all nine, including `engine-deband` at 3/2 and `accent` at 3/4.
- The decision rule did not need to be invoked for a criterion-wide null: palette
  reached the ceiling with a pre-registered candidate.

## Checks

`git diff test/art/scores.json` empty. 20 scoring calls total (18 plus 2 re-score).
