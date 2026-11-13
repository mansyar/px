# humanoid — 32×32 knight

**Profile** small (32 px). **Parts** 11. **Materials** 7 (brass, chain, crest, ink,
leather, skin, steel, tunic). **Light** top-left, `bevel` form, AO on, no rim.
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
the blade spine. `bevel` form since the re-authoring below: the hand-painted masses kept
their own tones, and the pass now stamps a one-pixel lit/shadowed band on each part's
silhouette so the direction is the engine's rather than the author's, part by part. AO darkens the belt under the torso and each
boot under the greave. No rim: a rim would redraw the boundary the outline owns.

## Anchors

- `foot_origin` (13, 30) — the left boot's sole; the ground point for placement.
- `hand_weapon` (25, 18) — the right glove, a weapon socket beside the painted sword.

## Cleanup

`deband` stepped **15 px** of one-tone-wide runs in the mail, so the torso's flat columns
do not read as a stripe. It is the only cleanup pass; `strays` had nothing to remove
after the redraw.

## Re-authoring (2026-11-13)

Two changes on the new surface, both aimed at the recorded `lighting` 2 and the
"camo speckle approaches noise" note:

- **Camo is 2×2 blocks on the shadow side only.** The old leg camo was an alternating
  1×2/3×3 `tunic.shadow` checker across both legs: confetti at the small profile's
  two-pixel floor, and symmetric, so it fought the light. It is now a 2×2 lattice on the
  right leg alone, which keeps the camouflage read, clears the floor by construction and
  makes the legs darker on the shadow side — the same direction the sleeves and helm use.
- **`form: flat` → `bevel`.** The torso and helm read as bands because every lit edge
  was hand-placed; `bevel` bands each part's own silhouette along the light axis, so the
  chest, sleeves, legs and boots now agree on one direction by construction.

`texture` was tried first for the camo and removed: on a 9×8 part at the small profile
its smallest mark is 2×2 and the full-fit rule lands no whole mark, so the op reported
`W_CLEANUP_NOOP` (0 marks) and the render was unchanged. The pass is the right tool at
`medium`/`large`; at 32 px camouflage has to be hand-placed at the cluster floor.

### Judgement, by the author not the rubric

The legs no longer sparkle and the torso now has a lit top edge and a dark bottom, so the
figure reads lit from one direction at 8× rather than banded. Against that: the chest is
still a slab — the lit top row is one pixel, and `bevel` cannot invent a chest volume the
silhouette does not have; the helmet's grey band across the visor still reads as a stripe
before it reads as a brow. I would score this a step up on `lighting` and
`cluster_discipline` and unchanged on the rest — which is an author's self-review, not
the rubric, and is recorded as such.

## Findings

`--strict` clean. Info only: 23 `BANDING`, 9 `CLUSTER_THIN` (was 24 / 10 before the
re-authoring). The banding is the mail's
column edges and the leg highlights; at 32 px an upright figure is mostly vertical runs.

## Known weaknesses

The torso is still a dark mass at 1× — the mail highlight is one column wide, so the chest
reads as a slab with a seam rather than as a chest over an abdomen. The sleeves are flat
two-pixel strips with no shoulder cap, and the sword is thin enough that its guard is the
only part that reads at true size. The face is a tan rectangle plus a visor slit; the
helmet's brow is a single row and could carry a nose guard.

## Form bands (2026-11-13)

Re-lit with `light form: "round"`: bands come from thickness along the light
axis, replacing the hand-placed shadow bands that a one-pixel rim could not move.
