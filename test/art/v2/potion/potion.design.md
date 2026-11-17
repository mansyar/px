# potion — re-authored design note (v2)

**Subject:** a healing flask at 16×16: cork above a pale glass body holding red brew.

**Light:** one direction, `top-left`, in `design.light`. The glass ramp carries the bright
`highlight` at `t0` and the dark `shadow` at `t4`, placing the glint on the upper-left of the
flask and the shade on its lower-right.

**Hero part:** `glass`. It frames the whole silhouette at 16×16 and carries the only readable
specular highlight; 4 distinct tones there do the work while the brew and cork stay at 3 and
2 so the liquid does not swallow the container.

**Value plan (part → distinct tones):** `glass` 4, `brew` 3, `cork` 2. All three painted parts
are listed in visual dominance order, hero first, in the hierarchy.

**Edge treatment:** silhouette `outline`, material `none`, detail `none`. The derived ramps on
this small sprite were written out as explicit five-tone ramps with a shared dark `outline`
role; that is what restores a readable outer border under design-driven edges. Interior
boundaries are left alone because a 16px flask has no room for a second edge language.

**Facing:** `glass` faces `front`, giving the vessel its own plane against the brew behind it.

**Self-assessment:** the weakest visible aspect is the cork — two tones on a four-pixel cap
read as a flat brown bar rather than a stopper. The harmonize pass was kept here: it made the
declared values explicit without introducing any strict finding, and the silhouette holds
at 1x.
