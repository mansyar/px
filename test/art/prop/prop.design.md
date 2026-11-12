# prop — 64×64 brass lantern

**Profile** medium (64 px). **Parts** 4. **Materials** 5. **Light** top-left, `bevel`
form, AO on, no cast, 2 px cast offset unused, edge rim.

## Silhouette intent

A hanging lantern: a small iron ring, a wide stepped brass cap, a tall dark glass
chamber held between four iron posts, a teardrop flame inside, and a flared brass base.
The glass chamber is deliberately *dark* — at 1× a pale pane would swallow the flame, so
the glow is carried by an amber gem-gloss mass against a near-black chamber, and the
lantern's read is "bright core inside a dark box under a wide hat".

## Materials and gloss

| part | material | hex base | gloss |
| --- | --- | --- | --- |
| `cap` | `brass` | `#e8c15c` | metal |
| `base` | `brass` | `#e8c15c` | metal |
| `body` | `iron` | `#93a3b5` | metal |
| `glass` | `glass` | `#1a3a44` | matte |
| `flame` | `flame` | `#f0a038` | gem |

`cap` and `base` are one part (`brass`) split by the chamber, so the ring, the cap, the
chamber posts and the base share three families between them rather than six. The
`metal` gloss is the point of this asset: the cap carries one hard diagonal specular
band with no diffuse gradient, which is what separates a brass lantern from a painted
wooden one at a glance. `gem` on the flame gives it a bright core and an emissive rim
instead of banding.

## Light

Top-left for the whole object; the cap's crown and the ring's upper-left are the
highlight, and the base's underside is the darkest note. AO darkens the cap where it
meets the glass (higher z) and the base where it meets the chamber posts — that contact
shading is what makes the parts read as assembled rather than drawn on top of one
another.

## Anchors

- `handle_top` (32, 6) — the top of the hanging ring; parent the ceiling hook here.
- `flame_core` (32, 40) — the flame's hot centre; put the point light / glow sprite here.
- `base_pivot` (32, 60) — the foot; use it when the lantern is set down.

## Cleanup

None. `strays` at this profile has a 2 px floor and the only 2 px clusters are the
ring's side links, which are wanted; the pass would either do nothing or eat the ring.

## Findings

`--strict` clean. Info only: 25 `BANDING`, 4 `CLUSTER_THIN`. The banding is the
chamber's straight vertical post edges and the cap's stepped rows.

## Known weaknesses

The ring is thin enough that at 1× it merges with the cap's top step — the lantern looks
like it is sitting on its hat rather than hanging. The cap and the base are the same
brass family, so the object reads as one gold silhouette with a dark window, and the
iron posts are only visible at 8×. The glass panes are flat: there are no reflection
glints, so the chamber is a dark rectangle rather than glass. A second pass would add
two `glass.highlight` glints on the upper-left pane and widen the ring's outer links by
one pixel.
