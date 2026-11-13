# scene — 256×256 wishing well

**Profile** large (256 px). **Parts** 6. **Materials** 5 (dirt, water, stone, wood,
rope). **Light** top-left, `bevel` form, AO on, edge rim. **Cleanup** `deband` (1299 px).

## Silhouette intent

One environment element filling the frame: a stone wishing well under a shingled gable.
Three stacked masses — the gable, the well cylinder with its oval mouth, and the dirt
apron — so the silhouette is a triangle over a drum over an ellipse. At 1× the two shapes
that identify it are the gable's apex and the well's curved mouth; the rope and bucket are
the one-pixel vertical that stops the middle of the frame from being empty.

## Materials and gloss

| part | material | hex base | gloss |
| --- | --- | --- | --- |
| `ground` | `dirt` | `#2a1e14` | matte |
| `water` | `water` | `#16283a` | matte |
| `wall` | `stone` | `#a8aeb6` | matte |
| `roof` | `wood` | `#6a4a2a` | matte |
| `rope` | `rope` | `#d8c49a` | cloth |
| `bucket` | `wood` | `#6a4a2a` | matte |

Value ladder: stone is the only light mass, rope lighter still so it reads against the
wall, wood and the bucket dark, water and dirt darkest except for the apron's lit crown.

## Light

Top-left, one direction for the whole scene. Two things were rebuilt against it:

- **The roof** is no longer a left/right split. Both planes darken from the ridge down —
  `wood.highlight` at the ridge, `wood.base` through the middle, `wood.shadow` at the
  eaves — with the right plane taking the darker step half a band earlier. The skyline
  line is a highlight and the eave is `wood.outline`, so the gable reads as one form lit
  from above rather than as two materials meeting at the apex.
- **The wall** is masonry. Mortar is a 2 px `stone.outline` course every 22 rows with
  staggered 2 px `stone.shadow` joints, so the joints survive the 1× view that a 1 px
  line did not; each column's top two pixels are `stone.highlight` for the rim, and the
  cylinder's left edge is a lit column with a shadowed right edge.

The apron is lifted: `dirt.highlight` in the crown near the mouth, `dirt.base` through the
middle, `dirt.shadow` at the outer rim, plus scattered 3 px pebbles — it reads as ground
under a light rather than a hole in the frame. The bucket is re-shaded as dark staves with
two shadowed hoops so the brightest small object in the bottom third is no longer a bright
grid.

## Anchors

- `well_center` (128, 150) — centre of the well mouth; spawn point for a wishing effect.
- `roof_apex` (128, 46) — the ridge; chimney or flag attachment.
- `rope_hook` (128, 100) — where the rope meets the cross brace; parent a pulley.
- `bucket_hook` (128, 178) — the bucket's rim; animate the bucket from here.

## Cleanup

`deband` stepped **1299 px** of one-tone-wide runs — the long courses of the wall and the
shingle rows — which is what keeps the masonry from reading as stacked stripes. `strays`
was removed: nothing on the apron is smaller than the large profile's three-pixel floor,
so it had become a no-op.

## Findings

`--strict` clean. Info only: 51 `BANDING`, 6 `CLUSTER_THIN`, 2 `JAGGY_LINE`. The banding
cap is the wall's courses and the roof's rows; the jaggy runs are the well's curved mouth.

## Known weaknesses

The wall's courses are even — every stone is the same height, and the joints line up
vertically often enough that the masonry reads as brickwork rather than rubble. The gable
posts are still plain rectangles with no bracket or chamfer. The rope is a 1 px vertical
that disappears at true size, and the bucket, now dark, is nearly lost against the water.
The apron's lit crown is a smooth ellipse with no path or grass breaking it up.

## Re-authoring (2026-11-13): the roof on clean diagonals

The recorded 2s were `lighting`, `edge_language` and `cluster_discipline`, and the first
two were the gable: 62 rows of hand-placed ASCII whose diagonal edges stepped 1–3 px per
row, with 1 px shingle jitter and a roof whose two planes were painted rather than
derived. Three changes:

- **The triangle is geometry now.** Two `polygon` ops replace the two ascii blocks that
  drew it: `roof_l` (apex to the left eave) and `roof_r` (apex to the right eave). Their
  edges are exact lines, so nothing can stair-step.
- **The ridge is a `stroke`.** One 1 px `wood.outline` line from apex to eave, drawn down
  the seam the two polygons leave for it. It replaces the row-by-row edge the ASCII
  implied.
- **Shingles are a `texture`.** `hatch` at density 2 on the lit plane and 1 on the far
  plane produces 3 px courses at the large profile's floor — legal marks, no confetti, and
  the courses darken away from the ridge.

The ASCII fascia, posts, well, water, bucket and apron are unchanged: only the triangle
was redrawn.

Judgement (author's self-review): the gable's staircase is gone and the roof now agrees
with the rest of the scene on one light direction, which is what raises `edge_language`
and `cluster_discipline` off 2. What remains, and what keeps both at 3, is the masonry —
its joints still mix 1 px notches with 2 px courses, and the apron keeps sub-3 px specks
that the lint reports as thin clusters. `palette_craft` stays 3 for the same reason as
before: the ramps do not step evenly.

## Second pass (2026-11-13): specks and joints

Two mechanical cleanups on the non-base ascii layers: 31 pixels with no same-role 4-neighbour
were cleared, then 45 pixels belonging to same-role components smaller than the large
profile's three-pixel floor. Clearing a highlight or shadow cell reveals the base tone
painted underneath it, so this removes specks without punching holes.

Judgement (author's self-review): this is a marginal change, not the 4 the criterion needs.
The apron is a little quieter and a handful of masonry notches are gone, but the joints
still read as 1 px lines against 2 px courses, and the lint's thin-cluster count does not
move at all (222 coords before and after), which says the remaining thinness is structural
to hand-drawn masonry rather than to stray pixels. Raising `cluster_discipline` and
`edge_language` to 4 needs the wall rebuilt the way the roof was — geometry for the
courses, not a speck sweep — and that is the honest next step, not a score adjustment.
