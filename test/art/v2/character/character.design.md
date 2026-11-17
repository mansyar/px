# character — re-authored design note (v2)

**Subject:** a plumed paladin at 48×128, tabard and shield over plate armour.

**Light:** one direction, `top-left`, in `design.light`. Every derived ramp shares the same
light-to-dark tone order, so the whole figure is lit from the same corner; there is no second
fill light on the shield side.

**Hero part:** `torso`. At 48×128 the torso/tabard block is the widest and most centrally
weighted cluster, and it overlaps the belt, gorget and greaves; 4 distinct tones there carry
the figure's form while the smaller plates use 2–3.

**Value plan (part → distinct tones):** `torso` 4, `shield` 2, `leg` 3, `helm` 3,
`pauldron` 2, `boot` 2, `arm` 3, `blade` 2, `plume` 3, `gorget` 3, `boss` 3, `grip` 2,
`hilt` 2. Thirteen painted parts, listed in visual dominance order with the hero first in
the hierarchy.

**Edge treatment:** silhouette `highlight`, material `none`, detail `none`. A lit outer rim
keeps the tall silhouette legible at 1x; the plate joins are left to their authored tones
because outlining every seam at 48px would read as striping.

**Facing:** `blade` is turned to `right` and `helm` faces `front`, so the weapon plane differs
from the head. The shield was left un-faced: giving it a front plane put it into a value
collision with the adjacent torso ramp.

**Self-assessment:** the weakest visible aspect is the tabard hem — its two-tone plan and the
low cell count at the bottom of the 128px frame make the fold read as a straight band.
No harmonize pass was added because it introduced a strict finding on the plate stack; the
declared value plan is realised by the hand-authored tone ramps.
