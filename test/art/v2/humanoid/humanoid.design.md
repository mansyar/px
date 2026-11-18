# humanoid — re-authored design note (v2)

**Subject:** an armoured knight at 32×32; the silhouette reads as helm, pauldrons and a
torso plate before any single accessory does.

**Light:** one direction only, `top-left`, declared in `design.light`. The explicit five-stop
ramps put their lightest tone at `t0` and their darkest at `t4`, and a single `light` pass
(top-left, bevel, AO, rim) shapes every mass from that one corner before `auto_outline`.
There is no `harmonize` pass and no second light.

**Palette coherence:** every ramp is a warm-to-cool hue-stepped five-stop family. Highlights
step toward warm cream/silver, mid tones settle into a single steel-blue family, and shadows
step toward deeper cool blue. All seven armour parts (`torso`, `helm`, `pauldron`, `blade`,
`arm`, `leg`, `gorget`) share that one steel hue spine and differ mainly in value, so the
figure reads as one metal rather than unrelated per-part hues. Two small warm accents carry
the contrast: the gold/brass `hilt` and the crimson `plume`. This replaces the earlier
arbitrary mix of purple torso, teal arms, emerald legs and mustard hilt whose harsh jumps
read as disconnected colours rather than one lit material. Base-tone (`t2`) luminances were
kept apart by at least the strict lint threshold and above the silhouette contrast floor.

**Hero part:** `torso`. It occupies the largest painted cluster and sits between the helm,
pauldrons, arms and legs, so it is the part the eye resolves first. It therefore carries the
deepest value plan (4 distinct painterly tones) while the surrounding fittings use 2–3.

**Value plan (part → distinct tones):**
`torso` 4, `helm` 2, `pauldron` 3, `blade` 3, `leg` 2, `arm` 3, `gorget` 2, `hilt` 3,
`plume` 2. These are target tone counts over the parts actually painted; the `hierarchy`
array lists those same nine parts in visual dominance order, hero first.

**Edge treatment:** silhouette `outline`, material `none`, detail `none`. The five derived
families were written out as explicit five-tone ramps with a shared dark `outline` role so a
readable silhouette survives design-driven edges. No extra edge op was added: at 32×32 the
plate boundaries would turn into noise, so the visible edge language is carried by the
coherent ramp values plus the single top-left bevel/AO/rim pass.

**Facing:** no part declares a plane facing. The light pass skips plane shading for unfaced
parts, so the authored tone slots survive and the bevel/AO/rim stages shape the helm, torso
and sword from the same top-left direction instead of flattening each mass to one role.

**Self-assessment:** the weakest visible aspect remains the plume — at 32×32 it is only a few
pixels and its two-tone plan makes it read as a crest-shaped smudge rather than a feather.
I did not add a harmonize pass here: it shifted the plate values enough to break strict lint,
so the declared coherence is carried by the hand-authored warm/cool ramps instead.
