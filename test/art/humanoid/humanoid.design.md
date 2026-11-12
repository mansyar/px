# humanoid — 32×32 knight

**Profile** small (32 px). **Parts** 11. **Materials** 8. **Light** top-left, `round`
form, AO on, no cast, edge rim. **Cleanup** `strays` (2 px).

## Silhouette intent

A standing knight: a big plumed helmet over a narrow chain torso, arms hanging clear of
the body with a gap at each armpit, a sword held point-up beside the right hand, and two
separated boots. The silhouette depends on the plume rising above the helm and on the
negative space between the legs — at 1× those are the two features that survive
thinning, and both are kept at least 2 px wide.

## Materials and gloss

| part | material | gloss | note |
| --- | --- | --- | --- |
| `helm` | `steel` | metal | hard specular band across the crown |
| `plume` | `crest` | matte | red, value-separated from the helm's highlight |
| `face` | `skin` | matte | two `skin.shadow` eye pixels |
| `torso` | `chain` | matte | dark mail so the tabard and belt read on top |
| `arm_l` / `arm_r` | `chain` | matte | sleeves, same family as the torso but not adjacent |
| `belt` | `brass` | metal | breaks the torso's value run |
| `legs` | `cloth` | matte | green, the only mid-light cloth in the set |
| `boots` | `leather` | matte | darkest mass at the feet |
| `blade` | `edge` | metal | its own family so it clears the pauldron value test |
| `hilt` | `brass` | metal | |

Every part owns a distinct material: `VALUE_COLLISION` compares part base tones, so
`helm`/`torso` sharing `steel` reported a 0.000 collision even though the pixels never
touch.

## Light

Top-left, `round` form so the helm and torso get a curved highlight band instead of a
single bevel edge. AO darkens where the helm meets the torso and where the boots meet
the greaves. No cast: the sprite has no ground plane.

## Anchors

- `foot_origin` (11, 30) — the left boot's sole centre; the sprite's ground point.
- `hand_weapon` (24, 18) — the right glove, where a held item parents.

## Cleanup

`strays` (profile minimum 2) removed **2 px** of dust glints that had been scattered on
the blade. Reported here rather than silently dropped: the cleanup is the reason the
blade is a clean 2 px column.

## Findings

`--strict` clean. Info only: 28 `BANDING`, 9 `CLUSTER_THIN`, plus one
`W_PART_OVERWRITE` for the `strays` pass repainting blade pixels.

## Known weaknesses

The limbs read as attached blocks rather than as anatomy: the arms are straight 3 px
columns with a 1 px gap at the shoulder, and the legs are two rectangles with a straight
inner edge. The torso is a dark mass at 1× — the mail reads as one tone and the belt is
the only thing dividing it. The sword floats beside the hand rather than being gripped:
the glove wraps the hilt on one diagonal only. A further pass would taper the arm
columns toward the wrists and cut a 1 px notch where the fingers close on the grip.
