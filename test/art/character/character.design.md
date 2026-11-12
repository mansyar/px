# character — 48×128 plumed paladin

**Profile** medium (128 px on the long side, 48 on the short). **Parts** 12.
**Materials** 8. **Light** top-left, `round` form, AO on, no cast, edge rim.
**Cleanup** `strays` (2 px).

## Silhouette intent

A full-body character sheet sprite, not an icon: 128 px tall so the helm (top 34 rows),
the tabard torso (rows 34–62), the arms and greatsword (rows 34–62), the legs (rows
63–108) and the boots (rows 101–110) all have room. The read at 1× is "paladin": red
plume above a grey helm, a red tabard under steel pauldrons, a big heater shield on the
left, a greatsword held point-up on the right. The shield's outline is asymmetric on
purpose so the left third is never a mirror of the right.

## Materials and gloss

| part | material | gloss | note |
| --- | --- | --- | --- |
| `helm` | `plate` | metal | crown specular, closed face plate |
| `plume` | `crest` | cloth | dithered falloff, no hard specular |
| `face` | `skin` | matte | 3 px face opening under the brow |
| `torso` | `tabard` | cloth | red over a plate breastplate |
| `belt` | `trim` | metal | gold, breaks the tabard run |
| `arm_l` / `arm_r` | `greave` | metal | separate family from `plate` |
| `shield` | `plate` | metal | gold rim + gold boss cross |
| `blade` | `edge` | metal | own family, colder than `plate` |
| `hilt` | `trim` | metal | gold crossguard |
| `legs` | `greave` | metal | knee cops in `plate.base` |
| `boots` | `leather` | matte | darkest mass at the feet |

`arm_l`/`arm_r` use `greave` (`#9fb2c8`) rather than `plate` (`#bccbdb`) because
`VALUE_COLLISION` compares part *base* tones: four parts sharing `plate` collided even
where they never touch.

## Light

Top-left, one direction for the whole 128-row sprite. `round` form gives the helm and
the shield a curved highlight; AO darkens the shield where it overlaps the torso and
each boot where it meets the greave. No cast — the sprite has no ground.

## Anchors

- `hand` (36, 56) — the right glove's centre; a weapon socket. The sprite's own sword is
  painted, so this anchor is for swapping in other weapons.
- `foot_origin` (19, 109) — the left boot's sole; the ground point for placement.

## Cleanup

`strays` (profile minimum 2) removed **2 px** of blade dust and reported
`W_PART_OVERWRITE` on the blade.

## Findings

`--strict` clean. Info only: 51 `BANDING`, 11 `CLUSTER_THIN`, 1 `JAGGY_LINE`. The jaggy
count is one run on the shield's lower curve, which steps 2 px per row by design; the
banding is the long vertical outline runs of a 128-row sprite.

## Known weaknesses

The legs are long: 46 rows of greave against a 34-row helm makes the figure read as
one-and-a-half heads tall in the legs. The shield at 1× is a plain grey oval with a gold
cross — its rim is 1 px so the bevel cannot give it a second value. The sword's grip is
completely hidden behind the crossguard, so the hand does not visibly hold it. Torso
detail (the breastplate line) disappears at 1× and the red tabard reads as one flat
mass. The honest summary: it reads as a paladin at 1×, but a paladin with stiff,
too-long legs.
