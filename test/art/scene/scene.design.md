# scene — 256×256 wishing well

**Profile** large (256 px). **Parts** 6. **Materials** 6. **Light** top-left, `bevel`
form, AO on, no cast, edge rim. **Cleanup** `strays` (3 px).

## Silhouette intent

One environment element filling the frame: a stone wishing well under a shingled gable.
The sprite is built as three stacked masses — the gable (rows 46–100), the well cylinder
(rows 108–214) and the dirt apron (rows 196–248) — so the silhouette is a triangle, a
drum and an ellipse, and each mass has a different edge language. The gable's apex and
the well's curved mouth are the two shapes that identify it at 1×; the rope and bucket
are a 1 px vertical that stops the middle of the frame from being empty.

## Materials and gloss

| part | material | hex base | gloss |
| --- | --- | --- | --- |
| `ground` | `dirt` | `#2a1e14` | matte |
| `water` | `water` | `#16283a` | matte |
| `wall` | `stone` | `#a8aeb6` | matte |
| `roof` | `wood` | `#6a4a2a` | matte |
| `rope` | `rope` | `#d8c49a` | cloth |
| `bucket` | `wood` | `#6a4a2a` | matte |

Six families with a deliberate value ladder: the stone wall is the only *light* mass
(0.417), the rope is lighter still (0.563) so it reads against the wall, the wood roof
and bucket sit at 0.081, and the water and dirt are near-black. `rope` is the one
non-matte gloss (`cloth`, dithered falloff) because a 1 px rope with a hard specular
band looked like a wire.

## Light

Top-left, `bevel` form. The gable is painted as two planes by hand — the left slope in
`wood.base`, the right in `wood.shadow` — and the bevel only shades the silhouette, so
the roof reads as a lit and a shadowed slope rather than one flat triangle with a light
rim. AO darkens the wall where the roof sits on it, and the bucket where the rope meets
it.

## Anchors

- `well_center` (128, 150) — centre of the well mouth; spawn point for a wishing effect.
- `roof_apex` (128, 46) — the ridge; chimney or flag attachment.
- `rope_hook` (128, 100) — where the rope meets the cross brace; parent a pulley.
- `bucket_hook` (128, 178) — the bucket's rim; animate the bucket from here.

## Cleanup

`strays` (large profile minimum 3) removed **4 px** of pebbles from the apron and left
the 3 px ones in place — the pass is the difference between a gravel apron and noise.

## Findings

`--strict` clean. Info only: 51 `BANDING`, 4 `CLUSTER_THIN`, 2 `JAGGY_LINE`. At this
size the banding report caps at the 50-per-code limit; the counts are the long straight
courses of the wall and the roof rows.

## Known weaknesses

The stone wall is a flat pale mass at 1×: the joints are 1 px `stone.shadow` lines that
disappear when the sprite is scaled down, so the well reads as concrete rather than
masonry. The dirt apron is nearly black and reads as a hole in the frame instead of
ground. The gable posts are plain brown rectangles with no bracket or chamfer. The
bucket's light hoops against the dark water make it the brightest small object in the
bottom third, which pulls the eye away from the well mouth. If this were re-authored I
would widen the joints to 2 px and lighten the apron one ramp step so the ellipse reads
as ground.
