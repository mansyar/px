# humanoid — 32×32 knight

**Profile** small (32 px). **Parts** 11. **Materials** 7 (brass, chain, crest, ink,
leather, skin, steel, tunic). **Light** top-left, `flat` form, AO on, no rim.
**Cleanup** `deband` (15 px).

## Silhouette intent

A single standing figure, one head wide at the helm, shoulders two pixels wider than the
hips, feet apart. At 1× the read is "armoured figure": a red plume over a grey helm, a
tan face slit, a dark mail torso, green sleeves and legs, brown boots, a sword held
point-up on the right. The plume is the only colour above the shoulders, so the head
still separates from the background when the sprite is downscaled.

## Materials and gloss

| part | material | gloss | note |
| --- | --- | --- | --- |
| `helm` | `steel` | metal | lit dome, dark right cheek, dark chin line |
| `plume` | `crest` | cloth | the only saturated colour in the upper third |
| `face` | `skin` | matte | 4 px opening, one dark visor slit |
| `torso` | `chain` | metal | mail, lit left column, shadow seam at the waist |
| `arm_l` / `arm_r` | `tunic` | cloth | lit arm and far arm, gloves in `leather` |
| `belt` | `brass` | metal | breaks the torso from the legs |
| `legs` | `tunic` | cloth | left column lit, knee band, dark right column |
| `boots` | `leather` | matte | darkest mass at the feet |
| `blade` | `steel` | metal | one lit edge, one shadowed edge |
| `hilt` | `brass` | metal | guard, leather grip, pommel |

`torso` uses `chain` rather than `steel` so it cannot collide with the helm or the blade
(`VALUE_COLLISION` compares part base tones, not adjacency). `arm_l`/`arm_r` share
`tunic` with the legs; they never touch, and the pair is one value on purpose.

## Light

Top-left, one direction for the whole figure: every part highlights on its top and left
and shadows on its bottom and right — helm dome, torso column, both sleeves, both legs,
the blade spine. `flat` form because the light was hand-painted during authoring; the
`light` op contributes gloss and AO only. AO darkens the belt under the torso and each
boot under the greave. No rim: a rim would redraw the boundary the outline owns.

## Anchors

- `foot_origin` (13, 30) — the left boot's sole; the ground point for placement.
- `hand_weapon` (25, 18) — the right glove, a weapon socket beside the painted sword.

## Cleanup

`deband` stepped **15 px** of one-tone-wide runs in the mail, so the torso's flat columns
do not read as a stripe. It is the only cleanup pass; `strays` had nothing to remove
after the redraw.

## Findings

`--strict` clean. Info only: 24 `BANDING`, 10 `CLUSTER_THIN`. The banding is the mail's
column edges and the leg highlights; at 32 px an upright figure is mostly vertical runs.

## Known weaknesses

The torso is still a dark mass at 1× — the mail highlight is one column wide, so the chest
reads as a slab with a seam rather than as a chest over an abdomen. The sleeves are flat
two-pixel strips with no shoulder cap, and the sword is thin enough that its guard is the
only part that reads at true size. The face is a tan rectangle plus a visor slit; the
helmet's brow is a single row and could carry a nose guard.
