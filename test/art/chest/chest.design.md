# chest — 48×48 treasure chest

**Profile** small (48 px). **Parts** 4. **Materials** 4. **Light** top-left, `bevel`
form, AO on, no cast, edge rim.

## Silhouette intent

A barrel-vaulted chest, not a toolbox: the lid is 12 rows of curved dome over a 20-row
body, with a 2 px plinth under both. The identifying read at 1× is the dome — a shallow
lid turns the same sprite into a crate — so the crown rows step in by 2 px on each side
for the top three rows and the body is narrower than the lid's widest point.

## Materials and gloss

| part | material | hex base | gloss |
| --- | --- | --- | --- |
| `lid` | `lidwood` | `#7d5230` | matte |
| `body` | `wood` | `#3d2616` | matte |
| `bands` | `iron` | `#a8b2c0` | metal |
| `lock` | `brass` | `#d9a93c` | metal |

Two wood families instead of one: the lid's `#7d5230` and the body's `#3d2616` are 0.082
apart in luminance, which clears the 0.06 floor *and* makes the lid read as a separate
plane rather than the same box with a line across it. `bands` (straps, bottom rail,
hinges) is the only `metal` gloss and the only cool colour in the palette — it is the
part that makes the chest look like a container instead of furniture.

## Light

Top-left, `bevel` rather than `round`: on a 36 px wide dome, `round` painted a shadow
band on the lid's bottom, left and right and tripped `PILLOW_SHADE`. With `bevel` the
dome keeps its hand-painted crown/side shading (`L` highlight rows, `m` shadow rows) and
the pass only shades the silhouette edge.

## Anchors

- `lid_pivot` (24, 20) — the lid's front lip at the seam; rotate the lid around this
  point for an open animation.

## Cleanup

None. A `seal` pass was in the recipe and removed: it reported `changed 0`
(`W_CLEANUP_NOOP`) because the chest has no enclosed 1 px hole.

## Findings

`--strict` clean. Info only: 35 `BANDING`, 4 `CLUSTER_THIN`. The banding lives in the
long horizontal strap and rail runs, which are the shape's straight lines.

## Known weaknesses

The bright iron straps are too prominent at 1×: they form a bright "U" that out-shouts
the wood and makes the object read as a metal crate with wooden panels. The straps run
straight down a dome that curves, so their top ends float off the lid's surface. The
body's grain is three 1 px spans and is invisible at 1×. The lock is 5×7 and reads as a
mail slot rather than a keyhole plate. If this were re-authored I would narrow the
straps to 2 px and let them follow the dome's curve two pixels at a time.

## Redraw

Redrawn 2026-11-13: domed lid with a lit top, rim highlight, iron bands with rivets and a keyhole plate. The lid lip is painted inside the body part.

## Derived ramps

The palette is derived rather than hand-listed: each material family is one
`{"derive": {"base": ..., "stops": 5}}` base colour, expanded to five tones whose
hue rotates warm at the highlight end and cool at the shadow end. The middle tone
(`t2`) is the family's base role; the darkest tone (`t4`) carries the detail-edge
and shadow rims that the old explicit `outline` role supplied, and the painted
shadow sits one step above it (`t3`) so the rims stay separable.

Bases were fitted so adjacent parts stay at least 0.06 apart in WCAG luminance and
each base clears the backdrop floor (minimum adjacent gap after fitting: 0.072).
Geometry is unchanged; only the palette blocks and the legend's tone names moved,
which is why the digest was re-baselined.

## Lighting

The body front face is shaded on a diagonal: the upper-left corner is the brightest tone and the ramp steps down toward the lower-right, so the face is a lit surface rather than a flat fill with two horizontal lines. The lid follows the same direction with a shallower range.
