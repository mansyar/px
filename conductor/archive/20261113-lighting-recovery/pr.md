# Lighting Recovery

Track: `20261113-lighting-recovery` · type `feature` · priority `high`

## Summary

Re-authors the six redrawn pixel-art recipes around three things the independent
rubric kept asking for, using only capabilities that already shipped:

- **Derived ramps.** Every material family is one `derive` base colour expanded to
  five tones that rotate warm at the highlight and cool at the shadow, replacing
  three hand-picked hexes.
- **One light direction.** The scene roof is one hue falling ridge-to-eave with the
  right plane one rung behind; the chest front and both torsos carry directional
  gradients; the potion liquid steps down from a lit surface line.
- **One interior edge convention.** Each part takes the lightest tone on its top
  and left boundary and the darkest on its bottom and right, so brick, plank and
  trim detail share a treatment.

Geometry is unchanged; the prop is byte-identical as a control.

## Result: the gate is missed

| Criterion | Target | Result |
| --- | --- | --- |
| mean | ≥ 4.0 | **3.69** |
| lighting | ≥ 3.5 | **3.07** |
| palette_craft | ≥ 3.6 | **3.36** |
| edge_language | ≥ 3.5 | **3.07** |
| value_separation | ≥ 3.7 | **3.79** |

Per-asset means: potion 4.08, prop 4.00 (control), chest 3.75, sword 3.67, scene
3.67, character 3.42, humanoid 3.25.

The untouched control moved 3.92 → 4.00 while the criteria moved +0.15 (palette),
+0.28 (lighting), +0.22 (value) and −0.07 (edge). Those are inside the 0.33
single-asset noise floor, so the honest conclusion is that this track changed how
the pixels are built, not how they are judged. Art iteration stops here per the
track's stop rule.

## Open acceptance criteria

Overridden by the owner on 2026-11-13 so the work can land with them recorded
rather than re-scored to fit:

- **AC-1** lighting mean ≥ 3.5 — actual 3.07
- **AC-2** palette_craft mean ≥ 3.6 — actual 3.36
- **AC-3** edge_language mean ≥ 3.5 — actual 3.07
- **AC-5** mean ≥ 4.0 — actual 3.69
- **AC-7** at most two assets' palette reasons mention flat ramps — 12 of 14 passes

## Verification

| Layer | Command | Result |
| --- | --- | --- |
| aggregate | `pnpm verify` | exit 0 (typecheck, lint, 858 tests, build) |
| assets | `pnpm vitest run test/art/assets.test.ts` | 28 passed |
| record | `pnpm vitest run test/art/rubric.test.ts` | 10 passed |
| renders | `render --strict` on all six edited assets | clean |
| score | 14 passes on `gemini-3.5-flash-lite` (A on 8x, B on debug) | recorded |

Every phase has its own evidence file under
`conductor/archive/20261113-lighting-recovery/verification/`, and the review is in
`review.md`.

## What this tells us

Two findings are worth carrying forward rather than repainting around:

1. **The scene's cast shadow contradicts its roof light**, and the critic calls the
   result contradictory. Fixing it means re-deriving the shadow, not re-tinting the
   roof.
2. **The rubric's lighting anchor scores the untouched control at 3.00** — the same
   as five of the six edited assets. That is evidence the flat-shading complaint is
   partly about the instrument's anchors, not only these drawings.

## Follow-ups

- Re-derive the scene's ground shadow so it agrees with the roof light.
- Audit the rubric's lighting and edge anchors against the control asset.
- Move the palette solver out of `.conductor/` if the derived-ramp approach is kept.
