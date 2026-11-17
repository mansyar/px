# sword — re-authored design note (v2)

**Subject:** a sabre at 32×32: bright curved blade, brass guard, leather grip and a ruby at
the guard.

**Light:** one direction, `top-left`, in `design.light`. The steel ramp runs light-to-dark
from `t0` to `t4`, which is what puts the specular band along the upper-left of the blade.

**Hero part:** `blade`. It is the longest and brightest cluster and the only part whose
sweep defines the silhouette; it gets 4 distinct tones while the fittings stay at 2–3 so
they do not compete.

**Value plan (part → distinct tones):** `blade` 4, `guard` 2, `grip` 3, `pommel` 3, `gem` 2.
All five parts are painted and appear in visual dominance order, hero first, in the hierarchy.

**Edge treatment:** silhouette `highlight`, material `none`, detail `none`. A highlight rim
on the outer silhouette keeps the blade separated from a dark background at 1x; material and
detail edges are left unpainted because a 32px sabre has too few interior pixels to spend on
extra borders.

**Facing:** `blade` is turned to `left` (its plane catches the top-left light along the spine)
and `guard` faces `front`. The gem was left un-faced: giving the ruby its own plane put it in
a value collision with the adjacent leather grip.

**Self-assessment:** the weakest visible aspect is the gem — two tones on a two-pixel cluster
cannot hold a facet, so it reads as a red dot. The harmonize pass was included because it
kept the strict render clean here, tightening the declared value plan across the parts.
