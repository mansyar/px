# character — 48×128 plumed paladin

**Profile** medium (128 px on the long side, 48 on the short). **Parts** 12.
**Materials** 8. **Light** top-left, `flat` form, AO off, edge rim. **Cleanup** `deband`
(56 px).

## Silhouette intent

A full-body character sheet sprite, not an icon: the helm (rows 8–34), the tabard torso
and arms (rows 34–67), the tabard skirt over the hips (rows 67–75), the legs (rows 76–100)
and the boots (rows 100–111). At 1× the read is "paladin": red plume, grey helm, red
tabard, a gold cross on a steel heater shield at the left, a greatsword on the right. The
shield's outline is asymmetric so its left third is never a mirror of the right.

## Materials and gloss

| part | material | gloss | note |
| --- | --- | --- | --- |
| `helm` | `plate` | metal | lit dome, shadowed right cheek, face opening |
| `plume` | `crest` | cloth | cloth falloff, dims toward the helm |
| `face` | `skin` | matte | 8 px opening, browhighlight, shadowed jaw |
| `torso` | `tabard` | cloth | lit left column, waist seam, skirt over the hips |
| `belt` | `trim` | metal | gold, separates tabard from skirt |
| `arm_l` / `arm_r` | `greave` | metal | own family so they cannot collide with `plate` |
| `shield` | `plate` | metal | bevel rim + gold cross + gold boss |
| `blade` | `edge` | metal | one lit spine, one shadowed cutting edge |
| `hilt` | `trim` | metal | gold guard, leather grip, gold pommel |
| `legs` | `greave` | metal | thigh lit, knee band, shin a value darker |
| `boots` | `leather` | matte | darkest mass at the feet |

`arm_l`/`arm_r` use `greave` (`#9fb2c8`) rather than `plate` (`#bccbdb`) because
`VALUE_COLLISION` compares part *base* tones: four parts sharing `plate` collided even
where they never met.

## Light

Top-left, one direction for all 128 rows. Each part lights on its top row and its left
column and darkens toward the bottom-right — the helm dome, the tabard, both sleeves, both
legs, the shield field, the blade. Interior material boundaries use each material's own
darkest tone, never the silhouette outline, so the sword reads as steel against brass
against leather rather than as three outlined boxes. AO is **off**: on a sprite this tall
it only darkened the boundary pixels the light direction needed to keep.

The shield is a bevel: its silhouette rim is `plate.highlight` on the top and left and
`plate.shadow` on the bottom and right, which gives it a rim at 1× that the earlier
one-pixel rim could not. A 2 px gold cross and a 3×3 boss sit on the field.

## Anchors

- `hand` (36, 56) — the right glove, a weapon socket. The sprite's own sword is painted;
  this anchor is for swapping in other weapons.
- `foot_origin` (19, 109) — the left boot's sole; the ground point for placement.

## Cleanup

`deband` stepped **56 px** of one-tone runs, and the band edges wander a few tenths of the
part width from row to row so cloth reads as folds rather than as striped columns. The
`cloth` gloss dithers its shadow band, so the shadow claim is kept to the part's last two
columns: a dithered rim reads as a soft edge, a dithered field reads as noise. `strays` was
removed: after the redraw nothing on this sprite is below the medium cluster minimum.

## Findings

`--strict` clean. Info only: 45 `BANDING`, 12 `CLUSTER_THIN`, 1 `JAGGY_LINE`. The jaggy
count is the shield's lower curve, which steps two pixels per row by design; the banding
caps at the 50-per-code limit and is the long vertical runs of a 128-row sprite.

## Known weaknesses

The legs are still long — 35 rows of greave against 34 rows of helm-and-plume — even
after the tabard skirt took eight rows off the hips; the figure reads as one-and-a-half
heads tall in the legs rather than three. The shield's cross is legible but plain: no
charge, no border, and the boss is a 3×3 square rather than a roundel. The sword's grip
is short enough that the hand does not visibly hold it, and the blade's lit spine is a
single column, so at true size the weapon is a bright line with a gold guard.

## Re-authoring (2026-11-13)

- **`form: flat` → `bevel`**, so the plate, helm and greaves band on one axis instead of
  relying on the hand-painted dither to imply one. AO and the edge rim are unchanged.

Judgement (author's self-review): the plate and greaves pick up a lit band that agrees with
the helm and blade, which is a small but real `lighting` gain; the dithered shading on the
greaves still leaves single-pixel steps that blur the form planes, and that is what holds
`edge_language` and `cluster_discipline` where they were. This asset needed the larger
change — replacing its dither with 2×2 shading — and did not get it in this pass.

## Form bands (2026-11-13)

`light` uses `form: "round"` instead of `bevel`: the pass bands each mass by its
thickness along the light axis, so the body reads as a lit form rather than a
one-pixel rim. The outline stays a single `auto_outline` pass — the character has
no authored stroke to give a corner or cap to, so Phase 5's controls do not apply
here and the treatment was already uniform.

## Redraw

Redrawn 2026-11-13: separated legs, a red shield with a gold cross and boss, a vertical sword with a level guard, and a dark tunic under bright plate.

## Derived ramps

The palette is derived rather than hand-listed: each material family is one
`{"derive": {"base": ..., "stops": 5}}` base colour, expanded to five tones whose
hue rotates warm at the highlight end and cool at the shadow end. The middle tone
(`t2`) is the family's base role; the darkest tone (`t4`) carries the detail-edge
and shadow rims that the old explicit `outline` role supplied, and the painted
shadow sits one step above it (`t3`) so the rims stay separable.

Bases were fitted so adjacent parts stay at least 0.06 apart in WCAG luminance and
each base clears the backdrop floor (minimum adjacent gap after fitting: 0.065).
Geometry is unchanged; only the palette blocks and the legend's tone names moved,
which is why the digest was re-baselined.

## Lighting

The torso is shaded from the upper-left: the ramp runs from the lit shoulder tone across the chest to the shadowed flank, so the mass reads as a form rather than a flat field.

## Interior edges

Torso, arms, legs, boots, blade, helm, pauldron, shield and boss take a light tone on their top and left boundary and the darkest tone on their bottom and right.
