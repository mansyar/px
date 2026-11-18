# humanoid — re-authored design note (v2)

**Subject:** an armoured knight at 32×32; the silhouette reads as helm, pauldrons and a
torso plate before any single accessory does.

**Light:** one direction only, `top-left`, declared in `design.light`. The explicit five-stop
ramps put their lightest tone at `t0` and their darkest at `t4`, and a single `light` pass
(top-left, bevel, AO, rim) shapes every mass from that one corner before `auto_outline`.
There is no `harmonize` pass and no second light.

**Hero part:** `torso`. It occupies the largest painted cluster and sits between the helm,
pauldrons, arms and legs, so it is the part the eye resolves first. It therefore carries the
deepest value plan (4 distinct painterly tones) while the surrounding fittings use 2–3.

**Value plan (part → distinct tones):**
`torso` 4, `helm` 2, `pauldron` 3, `blade` 3, `leg` 2, `arm` 3, `gorget` 2, `hilt` 3,
`plume` 2. These are target tone counts over the parts actually painted; the `hierarchy`
array lists those same nine parts in visual dominance order, hero first.

**Edge treatment:** silhouette `outline`, material `none`, detail `none`. The derived ramps
have no explicit outline role, so the five derived families were written out as explicit
five-tone ramps with a shared dark `outline` role. That restores a readable silhouette under
design-driven edges; internal material/detail edges are deliberately left alone so the
small plate boundaries do not turn into noise at 1x.

**Facing:** no part declares a plane facing. The light pass skips plane shading for unfaced
parts, so the authored tone slots survive and the bevel/AO/rim stages shape the helm, torso
and sword from the same top-left direction instead of flattening each mass to one role.

**Self-assessment:** the weakest visible aspect is the plume — at 32×32 it is only a few
pixels and its two-tone plan makes it read as a crest-shaped smudge rather than a feather.
I did not add a harmonize pass here: it shifted the plate values enough to break strict
lint, so the declared value plan is carried by the hand-authored tone slots instead.
