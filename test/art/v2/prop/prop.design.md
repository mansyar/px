# prop — re-authored design note (v2)

**Subject:** a hanging brass lantern at 64×64 with a glass chamber and a lit flame.

**Light:** one direction, `top-left`, in `design.light`. This asset already carried a `light`
op; its angle was checked against the design declaration and left as the single source of
form shading. The flame is an emissive accent, not a second light.

**Hero part:** `flame`. It is the brightest and most saturated cluster in the 64px frame and
sits at the visual centre of the glass chamber; 4 distinct tones make it the focal point
while the brass body, cap and glass use 3, 2 and 2.

**Value plan (part → distinct tones):** `flame` 4, `body` 3, `glass` 2, `cap` 2. All four
painted parts appear in the hierarchy in visual dominance order, hero first.

**Edge treatment:** silhouette `outline`, material `none`, detail `none`. Each family here
already declares an explicit `outline` role, so the design-driven edge pass writes a family-
appropriate dark border on the silhouette without changing the metal or glass interiors.

**Facing:** `cap` faces `top`, while `glass` and `flame` face `front`. The cap's plane differs
from the chamber's, which is the plane change the lantern's form calls for; all three were
verified strict-clean.

**Self-assessment:** the weakest visible aspect is the glass — two tones on the dark chamber
make it read as a hollow frame rather than a transparent pane. No harmonize pass was added:
the authored ramps already declare explicit four-role values and harmonize did not improve
the strict result.
