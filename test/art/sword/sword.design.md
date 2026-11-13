# sword — 32×32 sabre

**Profile** small (32 px). **Parts** 5. **Materials** 5 (brass, ink, leather, ruby,
steel). **Light** top-left, `flat` form, AO on, no rim. **Cleanup** none.

## Silhouette intent

A curved one-handed sabre standing point-up, tilted so the blade leaves the frame's
vertical: the spine steps left as it rises, the tip is at (23,3). At 1× the read is
"sword": a pale blade with a dark cutting edge, a wide gold guard with a ruby, a short
dark grip, a brass pommel. The guard is the widest thing in the sprite, which is what
makes the scale legible at true size.

## Materials and gloss

| part | material | gloss | note |
| --- | --- | --- | --- |
| `blade` | `steel` | metal | lit spine, base body, shadowed cutting edge |
| `gem` | `ruby` | gem | outline, lit core, shadowed lower corner |
| `guard` | `brass` | metal | lit upper face, shadowed underside |
| `grip` | `leather` | cloth | seam under the guard, lit left, shadowed right |
| `pommel` | `brass` | metal | lit top-left, dark bottom edge |

## Light

Top-left for every material. The blade is authored as a cylinder: its left column is
`steel.highlight`, its middle `steel.base`, its right column `steel.shadow`, so the light
hits one edge and leaves one edge dark — no banding down the middle. Interior boundaries
use each material's own darkest tone (`brass.outline` under the grip seam,
`leather.shadow` against the guard) instead of the silhouette ink, so steel, gold and
leather separate without three black rings inside the sprite.

The gem sits at the **same z as the guard**. At z 2 above the guard, AO darkened the
guard's top row around the inset and `PILLOW_SHADE` fired on four sides; at equal z the
guard keeps its lit face.

## Anchors

- `grip_pivot` (17, 26) — the middle of the grip, where a hand closes.
- `blade_tip` (23, 3) — the point; trails, arcs and bullet spawns hang off it.
- `pivot` (16, 16) — canvas centre, the default rotation origin.

## Cleanup

None. `deband` found no equal-width runs three rows deep on a 16-row blade, and `strays`
had nothing below the small cluster minimum, so no cleanup pass is declared — the brief
requires a working pass or none, not a no-op.

## Findings

`--strict` clean. Info only: 8 `BANDING`, 5 `CLUSTER_THIN`. Both are on the blade's
stepped spine and the three-pixel gem, which are the shapes that make the sprite read.

## Known weaknesses

The blade is four pixels wide at its base, so the cylinder shading is three tones of one
column each — at 1× the spine is a bright line, not a lit surface. The grip is eight rows
for a one-handed weapon and would read better at five with a visible hand. The gem is a
2×3 rectangle with an outline ring; a true cushion cut needs one more row.

## Re-authoring (2026-11-13)

- **The gem's ramp is warm now.** `ruby` was `#b32338` with a pink highlight: a magenta dot
  in a gold guard, scored `palette_craft` 3 for a hue nothing else in the asset shared. The
  ramp keeps its shape and moves its hues toward the brass — `#a83a2a` base, `#ff8a6a`
  highlight — so the same three-pixel gem reads as an ember set in gold rather than as an
  imported colour.
- **`form: flat` → `bevel`**, so the guard, pommel and grip band on one light axis instead
  of only the hand-painted edges doing so.

Judgement (author's self-review): palette integration is the real gain — the gem now
belongs to the object. Lighting moves less than it did on the humanoid, because a two-pixel
gold bar has no room for a bevel to show; the blade was already the most directional thing
in the asset. The guard still reads as a bar with a dark underside rather than as a form,
which is what keeps `edge_language` and `lighting` at 3 rather than 4.
