# humanoid — re-authored design note (v2)

**Subject:** an armoured knight at 32×32; the silhouette reads as helm, pauldrons and a
torso plate before any single accessory does.

**Light:** one direction only, `top-left`, declared in `design.light`. The derived ramps put
their lightest tone at `t0` and their darkest at `t4`, so every part is lit from the same
corner. The `curl` pass adds no second light.

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

**Facing:** `helm` and `torso` front-on; the held `blade` is turned to `right` so its plane
differs from the plate it crosses.

**Self-assessment:** the weakest visible aspect is the plume — at 32×32 it is only a few
pixels and its two-tone plan makes it read as a crest-shaped smudge rather than a feather.
I did not add a harmonize pass here: it shifted the plate values enough to break strict
lint, so the declared value plan is carried by the hand-authored tone slots instead.
